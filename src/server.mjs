import "dotenv/config";

import mongoose from "mongoose";
import { createApp } from './app.mjs';
import { readServerConfig, safeStartupError } from './serverConfig.mjs';

// dotenv.config();


const startServer = async () => {
    try { 
        const {mongoUrl,port,host}=readServerConfig();
        const app=createApp();
        await mongoose.connect(mongoUrl,{serverSelectionTimeoutMS:15000});

        console.log("MongoDB is successfully connected");

        const server=app.listen(port,host, () => {

        console.log(`Ledify is running on port ${port}`)
})
        server.on('error',error=>{console.error('[STARTUP]',JSON.stringify(safeStartupError(error)));process.exit(1);});


    } catch(error) {
        console.error('[STARTUP]',JSON.stringify(safeStartupError(error)));
        process.exit(1);
    };
}



startServer();
