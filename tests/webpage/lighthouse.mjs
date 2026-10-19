import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import express from 'express';
import lighthouse from 'lighthouse';
import {chromium} from 'playwright';

// Measure the downloaded static site, not the editor/preview toolbar or sandbox.
const root=path.resolve(process.argv.includes('--live-quality')?'generated/webpage-quality-live':'generated/webpage-samples');
const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
const names=['pharmaceutical','restaurant','fashion','startup','school','portfolio'];
const runLabel=process.argv.includes('--live-quality')?'quality':process.argv.includes('--isolated')?'isolated':'initial';
const app=express();
for(const entry of manifest)app.use('/'+entry.name,express.static(entry.artifacts.files.siteDirectory));
const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
const port=await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'}:{}),args:[`--remote-debugging-port=${port}`,'--remote-debugging-address=127.0.0.1']});
const results=[];
try{
    for(const name of names){
        const url=`http://127.0.0.1:${server.address().port}/${name}/index.html`;
        const result=await lighthouse(url,{port,logLevel:'error',output:['json','html'],onlyCategories:['performance','accessibility','best-practices','seo'],formFactor:'mobile',screenEmulation:{mobile:true,width:375,height:812,deviceScaleFactor:1,disabled:false},throttlingMethod:'simulate'});
        if(!result?.lhr||result.lhr.runtimeError)throw new Error('Lighthouse failed for '+name);
        const directory=path.join(root,name,'lighthouse-'+runLabel);await fs.mkdir(directory,{recursive:true});
        await fs.writeFile(path.join(directory,'report.json'),result.report[0]);await fs.writeFile(path.join(directory,'report.html'),result.report[1]);
        const summary={name,toolVersion:result.lhr.lighthouseVersion,userAgent:result.lhr.userAgent,conditions:'Local static Express server; headless Edge/Chromium; simulated mobile throttling; 375x812; no external runtime requests',scores:Object.fromEntries(Object.entries(result.lhr.categories).map(([key,value])=>[key,Math.round(value.score*100)])),lcpMs:result.lhr.audits['largest-contentful-paint'].numericValue,cls:result.lhr.audits['cumulative-layout-shift'].numericValue,failedAudits:Object.entries(result.lhr.audits).filter(([,audit])=>audit.score!==null&&audit.score<1).map(([id,audit])=>({id,score:audit.score,title:audit.title}))};
        results.push(summary);await fs.writeFile(path.join(root,`lighthouse-results-${runLabel}.json`),JSON.stringify(results,null,2));console.log(JSON.stringify(summary));
    }
}finally{await browser.close();server.close();}
