import express from 'express';

import cors from 'cors';

import { createGenerationRouter } from '../route/generateRoute.mjs';

// Separate application construction from the MongoDB/listen lifecycle so the
// actual production middleware can be exercised with injected test services.

export function createApp(options={}) {
    const app=express();
    // Run before body parsing so validation errors are readable by browsers too.
    app.use(cors({exposedHeaders:['Location','Preference-Applied','Retry-After','X-Ledify-Response-Version','Server-Timing','Warning']}));
    app.get('/healthz',(req,res)=>res.json({status:'alive'}));
    app.get('/readyz',(req,res)=>{const ready=options.isReady?.()!==false;res.set('Cache-Control','no-store');res.status(ready?200:503).json({status:ready?'ready':'starting'});});
    app.use('/api/generate',(req,res,next)=>{if(options.isReady?.()!==false)return next();res.set('Retry-After','3');return res.status(503).json({errorCode:'SERVICE_NOT_READY',stage:'admission',message:'The service is connecting to its database. Retry shortly.'});});
    app.use(express.json({limit:'16mb'}));
    app.use('/api',createGenerationRouter(options));
    app.get('/',(req,res)=>res.json({message:'Ledify backend API',generationEndpoint:'/api/generate',buildCommit:process.env.RENDER_GIT_COMMIT||null}));

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
