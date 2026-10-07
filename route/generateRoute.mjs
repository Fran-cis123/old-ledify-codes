import express from "express";

import  { 
     userText,
     userUrl, 
     userFile
    } from "../controller/generateController.mjs";

import upload  from "../middleWares/uploadMiddlewares.mjs";

const router = express.Router();

router.post ("/generate/textPrompt", userText);

router.post ("/generate/urlPrompt", userUrl);

router.post(
    "/generate/file",
    upload.single("file"),
    userFile
);

//router.post ("/generate/filePrompt", userFile);

export default router;