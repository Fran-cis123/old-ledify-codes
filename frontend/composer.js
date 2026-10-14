const form=document.querySelector('#composer'),status=document.querySelector('#status'),submit=document.querySelector('#generate'),file=document.querySelector('#file'),remove=document.querySelector('#remove-file');
file.addEventListener('change',()=>{remove.hidden=!file.files.length;});
remove.addEventListener('click',()=>{file.value='';remove.hidden=true;});
function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function artifactUrl(value){if(typeof value!=='string'||!value.startsWith('/api/'))return null;const url=new URL(value,location.origin);return url.origin===location.origin?url.href:null;}
function link(label,value){const url=artifactUrl(value);if(!url)return;const anchor=document.createElement('a');anchor.textContent=label;anchor.href=url;anchor.target='_blank';anchor.rel='noopener noreferrer';document.querySelector('#result-links').append(anchor);}
form.addEventListener('submit',async event=>{
    event.preventDefault();const prompt=form.elements.textPrompt.value.trim(),url=form.elements.urlPrompt.value.trim(),attachment=file.files[0];
    if(!prompt&&!url&&!attachment){message('Type a prompt, add a URL, or attach a PDF or DOCX file.',true);return;}
    if(attachment&&(!/\.(pdf|docx)$/i.test(attachment.name)||attachment.size>50*1024*1024)){message('Attach one PDF or DOCX file no larger than 50 MB.',true);return;}
    const body=new FormData();body.set('outputType',form.elements.outputType.value);if(prompt)body.set('textPrompt',prompt);if(url)body.set('urlPrompt',url);if(attachment)body.set('file',attachment);
    submit.disabled=true;document.querySelector('#result').hidden=true;
    message('Generating from your sources. You can keep this page open while Ledify prepares the output.');
    const started=Date.now(),timer=setInterval(()=>message(`Generating… ${Math.floor((Date.now()-started)/1000)} seconds elapsed. Large outputs can take longer.`),1000);
    try {
        const response=await fetch('/api/generate',{method:'POST',body});
        const payload=await response.json();if(!response.ok)throw new Error(payload.error||payload.message||'Generation failed. Please try again.');
        const result=payload.data.result;
        document.querySelector('#result-title').textContent=result.generatedContent?.title||'Your output is ready';
        document.querySelector('#result-links').replaceChildren();document.querySelector('#warnings').replaceChildren();document.querySelector('#slides').replaceChildren();
        link('Open preview',result.previewUrl||result.artifacts?.previewUrl);
        link(result.outputType==='webpage'?'Download website':'Download Word',result.downloadUrl||result.artifacts?.downloadUrl);
        link('Download PowerPoint',result.preview?.downloads?.pptx);link('Download PDF',result.preview?.downloads?.pdf);
        for(const warning of result.warnings||[]){const item=document.createElement('li');item.textContent=warning.message||warning.code;document.querySelector('#warnings').append(item);}
        for(const slide of result.preview?.slides||[]){const src=artifactUrl(slide.url);if(!src)continue;const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=src;img.alt=slide.title||`Slide ${slide.slideNumber}`;img.loading='lazy';caption.textContent=`${slide.slideNumber}. ${slide.title||''}`;figure.append(img,caption);document.querySelector('#slides').append(figure);}
        document.querySelector('#result').hidden=false;
        message(`${payload.message} · ${Math.round((Date.now()-started)/1000)} seconds`);
    }catch(error){message(error.message,true);}finally{clearInterval(timer);submit.disabled=false;}
});
