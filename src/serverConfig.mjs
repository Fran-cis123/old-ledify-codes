import mongoose from 'mongoose';
import dns from 'node:dns';
import {isIP} from 'node:net';

const configurationError=(code,message)=>Object.assign(new Error(message),{code});
export function configureMongoDns(env=process.env,resolver=dns) {
    const value=env.LEDIFY_DNS_SERVERS;
    if(value==null||value==='')return;
    const servers=typeof value==='string'?value.split(',').map(server=>server.trim()):[];
    if(!servers.length||servers.length>4||servers.some(server=>!isIP(server)))throw configurationError('INVALID_DNS_SERVERS','LEDIFY_DNS_SERVERS must contain one to four comma-separated DNS server IP addresses.');
    // Changes Node's resolve/SRV/TXT resolver for this process only, not Windows.
    resolver.setServers(servers);
}
export function readServerConfig(env=process.env) {
    const key=['MONGO_URL','MONGODB_URI','MONGO_URI'].find(key=>typeof env[key]==='string'&&env[key].trim());
    if(!key)throw configurationError('MISSING_MONGO_URL','Set MONGO_URL in the service environment to your full MongoDB connection URI.');
    let mongoUrl=env[key].trim();
    if(mongoUrl.length>=2&&['"',"'"].includes(mongoUrl[0])&&mongoUrl.at(-1)===mongoUrl[0])mongoUrl=mongoUrl.slice(1,-1).trim();
    if(!/^mongodb(?:\+srv)?:\/\//.test(mongoUrl))throw configurationError('INVALID_MONGO_URL',`${key} must contain only a MongoDB URI beginning mongodb:// or mongodb+srv://. Do not include the variable name, mongosh command, or a Render Postgres URL.`);
    if(/[\r\n]/.test(mongoUrl)||/<[^>]+>/.test(mongoUrl))throw configurationError('INVALID_MONGO_URL',`${key} must be a single-line MongoDB URI with Atlas username/password placeholders replaced. Encode special characters in credentials.`);
    try{new mongoose.mongo.MongoClient(mongoUrl);}catch{throw configurationError('INVALID_MONGO_URL',`${key} is not a valid MongoDB URI. Copy the Drivers connection string from MongoDB Atlas and replace its placeholders. Encode special characters in credentials.`);}
    const port=Number(env.PORT||5000);
    if(!Number.isInteger(port)||port<1||port>65535)throw configurationError('INVALID_PORT','PORT must be an integer from 1 to 65535. On Render, use its provided PORT environment variable.');
    return {mongoUrl,port,host:'0.0.0.0'};
}
export function safeStartupError(error) {
    if(error.stage==='job-recovery')return {code:'JOB_RECOVERY_FAILED',message:'Unable to recover generation jobs. Verify that LEDIFY_JOB_ROOT is writable and its persisted files are available.'};
    const failures=[],seen=new Set();
    const inspect=(value,depth=0)=>{
        if(!value||typeof value!=='object'||depth>6||seen.has(value))return;
        seen.add(value);failures.push(value);
        for(const key of ['cause','reason','error','originalError'])inspect(value[key],depth+1);
        if(value.servers instanceof Map)for(const server of value.servers.values())inspect(server.error,depth+1);
    };
    inspect(error);
    const authentication=failures.find(value=>value.code===18||value.code===8000&&/bad auth|authentication failed/i.test(value.message||''));
    if(authentication)return {code:'MONGO_AUTH_FAILED',message:'MongoDB rejected the database-user credentials. Verify the Atlas database username/password in MONGO_URL.'};
    const networkCodes=['ECONNREFUSED','ETIMEOUT','ETIMEDOUT','ENOTFOUND','ENODATA','ESERVFAIL','EAI_AGAIN','ENETUNREACH','EHOSTUNREACH','ECONNRESET','EACCES'];
    const network=failures.find(value=>networkCodes.includes(value.code));
    if(network)error=network;
    if(['MISSING_MONGO_URL','INVALID_MONGO_URL','INVALID_PORT','INVALID_DNS_SERVERS'].includes(error.code))return {code:error.code,message:error.message};
    if(error.code==='EADDRINUSE')return {code:'PORT_IN_USE',message:'Ledify cannot listen because PORT is already in use. Stop the other server or choose an unused PORT in .env.'};
    if(['querySrv','queryTxt','getaddrinfo'].includes(error.syscall)&&['ECONNREFUSED','ETIMEOUT','ETIMEDOUT','ENOTFOUND','ENODATA','ESERVFAIL','EAI_AGAIN'].includes(error.code))return {code:'MONGO_DNS_FAILED',networkCode:error.code,message:'Unable to resolve the MongoDB Atlas address through your DNS server. Check your internet connection, DNS settings, VPN/firewall and Atlas cluster hostname, then retry.'};
    if(['ECONNREFUSED','ETIMEDOUT','ENETUNREACH','EHOSTUNREACH','ECONNRESET','EACCES'].includes(error.code))return {code:'MONGO_NETWORK_FAILED',networkCode:error.code,message:'The local network could not connect to MongoDB. Check internet connectivity, firewall/VPN settings and Atlas network access, then retry.'};
    if(error.code===18||error.code===8000&&/bad auth|authentication failed/i.test(error.message||''))return {code:'MONGO_AUTH_FAILED',message:'MongoDB rejected the database-user credentials. Verify the Atlas database username/password in MONGO_URL.'};
    if(error.name==='MongoServerSelectionError')return {code:'MONGO_UNREACHABLE',message:'Unable to reach MongoDB. Verify Atlas network access for the service outbound addresses and that the cluster is available.'};
    if(failures.some(value=>value.name==='MongoNetworkError'||value.name==='MongoNetworkTimeoutError'))return {code:'MONGO_NETWORK_FAILED',message:'The MongoDB connection was interrupted. Check internet connectivity, firewall/VPN settings, TLS connectivity and Atlas network access, then retry.'};
    return {code:'STARTUP_FAILED',errorType:['MongoServerError','MongoParseError','MongoNetworkError','MongoAPIError','Error','TypeError'].includes(error.name)?error.name:undefined,driverCode:Number.isInteger(error.code)?error.code:undefined,message:'Unable to start Ledify. Verify the MongoDB URI, database-user credentials, Atlas network access, and service environment configuration.'};
}

export async function connectMongoWithRetry(mongoUrl,{
    connect=(uri,options)=>mongoose.connect(uri,options),disconnect=()=>mongoose.disconnect(),
    sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
    logger=entry=>console.error('[STARTUP]',JSON.stringify(entry)),maxAttempts=3
}={}) {
    if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)throw new RangeError('MongoDB connection attempts must be between 1 and 3');
    for(let attempt=1;attempt<=maxAttempts;attempt++){
        try{return await connect(mongoUrl,{serverSelectionTimeoutMS:15000,connectTimeoutMS:10000});}
        catch(error){
            const diagnostic=safeStartupError(error);
            const retryable=['MONGO_NETWORK_FAILED','MONGO_UNREACHABLE'].includes(diagnostic.code)||diagnostic.code==='MONGO_DNS_FAILED'&&['ECONNREFUSED','ETIMEOUT','ETIMEDOUT','ESERVFAIL','EAI_AGAIN'].includes(diagnostic.networkCode);
            if(!retryable||attempt===maxAttempts)throw error;
            await disconnect();
            const retryAfterMs=attempt*1500;
            logger({...diagnostic,status:'retrying',attempt,maxAttempts,retryAfterMs});
            await sleep(retryAfterMs);
        }
    }
}
