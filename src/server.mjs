import "dotenv/config";

import { createApp } from './app.mjs';
import { createHttpServer } from './httpServer.mjs';
import { readServerConfig, safeStartupError, configureMongoDns, connectMongoWithRetry } from './serverConfig.mjs';


const startServer = async () => {
    try { 
        const {mongoUrl,port,host}=readServerConfig();
        configureMongoDns();
        const app=createApp();
        await connectMongoWithRetry(mongoUrl);

        console.log("MongoDB is successfully connected");

        const server=createHttpServer(app).listen(port,host, () => {

        console.log(`Ledify is running on port ${port}`)
})
        server.on('error',error=>{console.error('[STARTUP]',JSON.stringify(safeStartupError(error)));process.exit(1);});


    } catch(error) {
        console.error('[STARTUP]',JSON.stringify(safeStartupError(error)));
        process.exit(1);
    };
}



startServer();
