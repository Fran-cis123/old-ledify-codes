import test from 'node:test';
import assert from 'node:assert/strict';
import {readServerConfig,safeStartupError,configureMongoDns} from '../../src/serverConfig.mjs';
test('MongoDB configuration accepts driver URIs and normalizes dashboard whitespace and quotes',()=>{
    const standard='mongodb://localhost:27017/ledify',srv='mongodb+srv://user:password@cluster.example.net/ledify';
    assert.equal(readServerConfig({MONGO_URL:standard}).mongoUrl,standard);
    assert.equal(readServerConfig({MONGO_URL:`  "${srv}"  `}).mongoUrl,srv);
    assert.equal(readServerConfig({MONGO_URL:`'${srv}'`}).mongoUrl,srv);
    assert.equal(readServerConfig({MONGODB_URI:srv}).mongoUrl,srv);
    assert.equal(readServerConfig({MONGO_URI:srv}).mongoUrl,srv);
    assert.equal(readServerConfig({MONGO_URL:standard,MONGODB_URI:srv}).mongoUrl,standard);
});
test('invalid MongoDB values fail before connection without exposing credentials',()=>{
    assert.throws(()=>readServerConfig({}),{code:'MISSING_MONGO_URL'});
    for(const value of ['postgresql://user:private-password@host/db','MONGO_URL=mongodb://localhost/db','mongosh "mongodb://localhost/db"','https://cloud.mongodb.com','mongodb://','mongodb+srv://user:<db_password>@cluster.example.net/db','mongodb://user:private-password@host/db\nother'])assert.throws(()=>readServerConfig({MONGO_URL:value}),error=>error.code==='INVALID_MONGO_URL'&&!error.message.includes('private-password'));
    assert.throws(()=>readServerConfig({MONGO_URL:'invalid',MONGODB_URI:'mongodb://localhost/db'}),{code:'INVALID_MONGO_URL'});
    assert.ok(!JSON.stringify(safeStartupError(new Error('secret database credentials'))).includes('secret database credentials'));
    assert.equal(safeStartupError({code:18}).code,'MONGO_AUTH_FAILED');
    assert.equal(safeStartupError({code:8000,message:'bad auth : authentication failed'}).code,'MONGO_AUTH_FAILED');
    assert.equal(safeStartupError({name:'MongoServerSelectionError'}).code,'MONGO_UNREACHABLE');
});
test('Render port is honored and public-interface binding is explicit',()=>{
    assert.deepEqual(readServerConfig({MONGO_URL:'mongodb://localhost/db',PORT:'10000'}),{mongoUrl:'mongodb://localhost/db',port:10000,host:'0.0.0.0'});
    assert.equal(readServerConfig({MONGO_URL:'mongodb://localhost/db'}).port,5000);
    for(const port of ['bad','0','65536','1.5'])assert.throws(()=>readServerConfig({MONGO_URL:'mongodb://localhost/db',PORT:port}),{code:'INVALID_PORT'});
});
test('startup diagnostics distinguish DNS, network and port failures without exposing secrets',()=>{
    for(const code of ['ECONNREFUSED','ETIMEOUT','ETIMEDOUT','ENOTFOUND','ENODATA','ESERVFAIL','EAI_AGAIN']) {
        const result=safeStartupError({name:'Error',code,syscall:'querySrv',message:'secret connection string'});
        assert.equal(result.code,'MONGO_DNS_FAILED');
        assert.equal(result.networkCode,code);
        assert.ok(!JSON.stringify(result).includes('secret connection string'));
    }
    assert.equal(safeStartupError({code:'ECONNREFUSED',syscall:'connect'}).code,'MONGO_NETWORK_FAILED');
    assert.equal(safeStartupError({code:'EADDRINUSE'}).code,'PORT_IN_USE');
});
test('DNS overrides are opt-in, process scoped and validated before changing the resolver',()=>{
    const calls=[],resolver={setServers:servers=>calls.push(servers)};
    configureMongoDns({},resolver);
    configureMongoDns({LEDIFY_DNS_SERVERS:''},resolver);
    assert.equal(calls.length,0);
    configureMongoDns({LEDIFY_DNS_SERVERS:'1.1.1.1, 8.8.8.8'},resolver);
    assert.deepEqual(calls,[['1.1.1.1','8.8.8.8']]);
    configureMongoDns({LEDIFY_DNS_SERVERS:'2606:4700:4700::1111'},resolver);
    for(const value of ['bad','1.1.1.1,','https://resolver.example',123,'1.1.1.1,8.8.8.8,9.9.9.9,1.0.0.1,8.8.4.4'])assert.throws(()=>configureMongoDns({LEDIFY_DNS_SERVERS:value},resolver),{code:'INVALID_DNS_SERVERS'});
    assert.equal(calls.length,2);
    assert.equal(safeStartupError({code:'INVALID_DNS_SERVERS',message:'Invalid DNS configuration'}).code,'INVALID_DNS_SERVERS');
});
