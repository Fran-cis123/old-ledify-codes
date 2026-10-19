import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {generateInBatches,generateIndependent} from '../Service/ai/concurrency.mjs';
const root='generated/performance',report={note:'Controlled component measurements; scheduler delays simulate identical provider latency, not live API completion.'};
for(const [name,delays,limit] of [['ten-slide-scheduler',[100,20,30,40,80,20,20,100,20,20],4],['six-section-scheduler',[120,20,20,100,20,20],3]]){
    const times={};
    for(const [version,run] of [['batch',generateInBatches],['rolling',generateIndependent]]){
        const ordered=[],started=performance.now();
        await run(delays,limit,(delay,index)=>new Promise(resolve=>setTimeout(()=>resolve(index),delay)),value=>ordered.push(value));
        assert.deepEqual(ordered,delays.map((_,index)=>index));times[version+'Ms']=Math.round(performance.now()-started);
    }
    report[name]=times;
}
const result=JSON.parse(await fs.readFile(`${root}/after/webpage-result.json`,'utf8'));
const input=await JSZip.loadAsync(await fs.readFile(result.artifacts.files.zipPath)),files=[];
for(const [name,file] of Object.entries(input.files))if(!file.dir)files.push([name,await file.async('nodebuffer')]);
for(const optimized of [false,true]){
    const start=performance.now(),cpu=process.cpuUsage();let buffer;
    for(let i=0;i<10;i++){
        const zip=new JSZip();
        for(const [name,bytes] of files)zip.file(name,bytes,optimized?{compression:/\.(?:webp|png|jpe?g|woff2?)$/i.test(name)?'STORE':'DEFLATE',compressionOptions:{level:3}}:{});
        buffer=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
    }
    const used=process.cpuUsage(cpu),archive=await JSZip.loadAsync(buffer);
    for(const [name,bytes] of files)assert.deepEqual(await archive.file(name).async('nodebuffer'),bytes);
    report[optimized?'optimizedZip':'originalZip']={iterations:10,totalMs:Math.round(performance.now()-start),cpuMs:Math.round((used.user+used.system)/1000),zipBytes:buffer.length,allExtractedBytesIdentical:true};
}
await fs.writeFile(`${root}/controlled-components.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
