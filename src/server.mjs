import "dotenv/config";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import router from "../route/generateRoute.mjs";

// dotenv.config();

const app = express();

const PORT = process.env.PORT;

const MONGO_URL = process.env.MONGO_URL;


app.use(express.json());
app.use(cors());
app.use("/api", router);

app.get("/", (req , res)=> {
    return res.send("Server is loading......")
});

const startServer = async () => {
    try { 
        console.log(MONGO_URL)
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
