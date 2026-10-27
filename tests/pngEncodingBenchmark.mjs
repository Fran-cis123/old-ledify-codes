import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {ppmToPng} from '../renderer/converters/ppmPng.mjs';
const execute=promisify(execFile),root=path.resolve('generated/png-encoding-benchmark');await fs.mkdir(root,{recursive:true});
const sourceRoot=path.resolve('generated/presentation-speed/baseline-single/presentations'),ids=await fs.readdir(sourceRoot),pdf=path.join(sourceRoot,ids[0],'presentation.pdf'),results=[];
for(const mode of ['png','ppm','png','ppm']){
 const run=results.length,prefix=path.join(root,'run-'+run),started=performance.now(),cpu=process.cpuUsage();
 await execute(process.env.PDFTOPPM_PATH||'pdftoppm',[...(mode==='png'?['-png']:[]),'-r','144',pdf,prefix],{windowsHide:true,timeout:120000,maxBuffer:1024*1024});
 const files=(await fs.readdir(root)).filter(name=>name.startsWith('run-'+run+'-')&&name.endsWith('.'+mode)).sort((a,b)=>Number(a.match(/-(\d+)\./)[1])-Number(b.match(/-(\d+)\./)[1]));
 if(mode==='ppm')for(const name of files){await fs.writeFile(path.join(root,name.replace(/\.ppm$/,'.png')),await ppmToPng(await fs.readFile(path.join(root,name))));await fs.unlink(path.join(root,name));}
 const duration=performance.now()-started,used=process.cpuUsage(cpu);let bytes=0;const hashes=[];
 for(const name of files){const file=path.join(root,name.replace(/\.ppm$/,'.png')),buffer=await fs.readFile(file);bytes+=buffer.length;hashes.push(createHash('sha256').update(await sharp(buffer).removeAlpha().raw().toBuffer()).digest('hex'));}
 if(results.length)assert.deepEqual(hashes,results[0].pixelHashes);
 results.push({mode,durationMs:Math.round(duration),pngBytes:bytes,nodeCpuMs:(used.user+used.system)/1000,pixelHashes:hashes});
}
await fs.writeFile(path.join(root,'report.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({pixelHashes,...metrics})=>({...metrics,pages:pixelHashes.length,pixelParity:true}))));
