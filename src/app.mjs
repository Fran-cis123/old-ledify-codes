import express from 'express';

import cors from 'cors';

import { createGenerationRouter } from '../route/generateRoute.mjs';

import {fileURLToPath} from 'node:url';

const composerRoot=fileURLToPath(new URL('../frontend/',import.meta.url));

// Separate application construction from the MongoDB/listen lifecycle so the
// actual production middleware can be exercised with injected test services.

export function createApp(options={}) {
    const app=express();
    app.use(express.json({limit:'16mb'}));
    app.use(cors());
    app.use('/api',createGenerationRouter(options));
    app.use('/composer-assets',express.static(composerRoot,{index:false,dotfiles:'deny'}));
    app.get(['/', '/composer'],(req,res)=>{
        res.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
        res.sendFile('index.html',{root:composerRoot});
    });

    app.use((error,req,res,next)=>{
        if(res.headersSent)return next(error);
        if(error.type==='entity.too.large')return res.status(413).json({message:'Request is too large',error:'JSON requests must be no larger than 16 MB.',errorCode:'INVALID_REQUEST_SIZE'});
        if(error.type==='entity.parse.failed')return res.status(400).json({message:'Invalid JSON request',errorCode:'INVALID_JSON'});
        const status=Number(error.status||error.statusCode);
        if(status>=400&&status<500)return res.status(status).json({message:'Invalid request',errorCode:'INVALID_REQUEST'});
        return res.status(500).json({message:'Unable to process the request',errorCode:'REQUEST_FAILED'});
    });

    return app;
}
