import "dotenv/config";

import mongoose from "mongoose";
import { createApp } from './app.mjs';

// dotenv.config();

const app = createApp();

const PORT = process.env.PORT;

const MONGO_URL = process.env.MONGO_URL;


const startServer = async () => {
    try { 
        await mongoose.connect(MONGO_URL);

        console.log("MongoDB is successfully connected");

        app.listen(PORT, () => {

        console.log(`Ledify is running on port ${PORT}`)
})


    } catch(error) {
        console.error("Connection failed", error.message);
        process.exit(1);
    };
}



startServer();
