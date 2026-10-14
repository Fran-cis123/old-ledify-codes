import fs from 'node:fs/promises';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
const execute=promisify(execFile);

// Isolate PDF.js globals from the incompatible canvas used by PDF extraction.
export async function convertPdfToImages({ pdfPath, outputDirectory, timeoutMs = 120000, engine = process.env.LEDIFY_PDF_ENGINE || 'poppler' }) {
    if (typeof pdfPath !== 'string' || !pdfPath) throw new Error('PDF file path is required');
    if (typeof outputDirectory !== 'string' || !outputDirectory) throw new Error('Preview output directory is required');
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Preview timeout must be positive');
    await fs.access(pdfPath);
    await fs.mkdir(outputDirectory, { recursive: true });
    if(engine==='poppler'){
        const prefix='render-'+randomUUID(),outputPrefix=path.join(path.resolve(outputDirectory),prefix);
        try{
            await execute(process.env.PDFTOPPM_PATH || 'pdftoppm',['-png','-r','144',path.resolve(pdfPath),outputPrefix],{timeout:timeoutMs,windowsHide:true,maxBuffer:1024*1024});
            const files=(await fs.readdir(outputDirectory)).filter(name=>name.startsWith(prefix+'-') && /-\d+\.png$/.test(name))
                .sort((a,b)=>Number(a.match(/-(\d+)\.png$/)[1])-Number(b.match(/-(\d+)\.png$/)[1]));
            if(!files.length)throw new Error('PDF contains no rendered pages');
            const images=[];
            for(const [i,name] of files.entries()){
                const fileName=`slide-${i+1}.png`,filePath=path.join(path.resolve(outputDirectory),fileName);
                await fs.rename(path.join(outputDirectory,name),filePath);
                const buffer=await fs.readFile(filePath);
                if(buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Rasterizer returned an invalid PNG');
                images.push({slideNumber:i+1,fileName,filePath});
            }
            return images;
        }catch(error){
            throw Object.assign(new Error(error.killed?'PNG preview rendering timed out':error.code==='ENOENT'?'PNG rendering requires Poppler pdftoppm on PATH or PDFTOPPM_PATH':'PNG rendering failed: the PDF could not be rasterized'),{stage:'png',pageNumber:1});
        }
    }
    if(engine!=='pdfjs')throw new Error('Unsupported PDF rasterization engine');
    return new Promise((resolve, reject) => {
        const worker = fork(fileURLToPath(new URL('./pdfToImagesWorker.mjs', import.meta.url)),
            [JSON.stringify({pdfPath:path.resolve(pdfPath),outputDirectory:path.resolve(outputDirectory)})],
            {execArgv:[],windowsHide:true,stdio:['ignore','ignore','pipe','ipc']});
        worker.stderr?.resume();
        let result;
        let failure;
        const timer = setTimeout(() => {
            failure = new Error('PNG preview rendering timed out');
            failure.stage = 'png';
            worker.kill();
        }, timeoutMs);
        worker.on('message', message => {
            if (message.error) {
                failure = new Error(message.error.message);
                failure.stage = 'png';
                failure.pageNumber = message.error.pageNumber;
            } else result = message.images;
        });
        worker.on('error', error => { failure = error; });
        worker.on('exit', code => {
            clearTimeout(timer);
            if (failure) reject(failure);
            else if (code !== 0 || !result?.length) reject(new Error(`PNG worker exited without previews (code ${code})`));
            else resolve(result);
        });
    });
}
