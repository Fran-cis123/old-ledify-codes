import * as cheerio from 'cheerio';
import {parse} from 'parse5';
import {safeLink,webpageError} from './webpageContentValidator.mjs';
import {script,bootstrap} from '../renderer/webpage/styles.mjs';
import {rasterDimensions} from './webpageAssetService.mjs';
import {internalCopy} from './webpage/contentSpecification.mjs';

export const SITE_FILES=Object.freeze(['index.html','style.css','script.js','bootstrap.js','assets/icons/favicon.svg']);
const pagePattern=/^(?:index|about|services|products|portfolio|contact)\.html$/;
const imagePattern=/^assets\/images\/(?:catalog-[1-4]\.(?:png|jpg)|image-[a-f\d]{24}-\d{2,4}\.webp)$/;

export function validateStaticWebsite(files){
    const fail=message=>{throw webpageError(message,'files','WEBPAGE_STATIC_INVALID');};
    const names=Object.keys(files);
    if(names.length>40)fail('Too many website assets');
    if(Object.values(files).some(value=>typeof value!=='string'&&!Buffer.isBuffer(value)))fail('Website files must be text or raster buffers');
    if(Object.values(files).reduce((sum,value)=>sum+Buffer.byteLength(value),0)>12*1024*1024)fail('Website exceeds its byte budget');
    for(const name of names)if(!SITE_FILES.includes(name)&&!pagePattern.test(name)&&name!=='assets/images/hero.svg'&&!imagePattern.test(name))fail('Unexpected or unsafe output path: '+name);
    for(const name of SITE_FILES)if(typeof files[name]!=='string'||!files[name].trim())fail('Missing output file: '+name);
    if(!/:root\s*\{/.test(files['style.css'])||!/@media\s*\(/.test(files['style.css'])||!/prefers-reduced-motion/.test(files['style.css'])||!/\.container\s*\{/.test(files['style.css']))fail('Missing design tokens, responsive layout or reduced-motion stylesheet rules');
    if(files['script.js']!==script)fail('Unexpected JavaScript implementation');
    if(files['bootstrap.js']!==bootstrap)fail('Unexpected progressive enhancement bootstrap');
    for(const name of names.filter(name=>/\.(?:png|jpg|webp)$/.test(name))){
        const buffer=files[name],dimensions=Buffer.isBuffer(buffer)&&rasterDimensions(buffer);
        if(!dimensions||buffer.length>2*1024*1024||dimensions.width<100||dimensions.height<100||dimensions.width>2400||dimensions.height>2400||!name.endsWith('.'+dimensions.extension))fail('Invalid raster image: '+name);
    }
    const documents=new Map();
    for(const filename of names.filter(name=>pagePattern.test(name))){
        if(typeof files[filename]!=='string')fail('HTML pages must be text');
        const errors=[];parse(files[filename],{onParseError:error=>errors.push(error.code)});if(errors.length)fail('Invalid HTML structure: '+errors.join(', '));
        const $=cheerio.load(files[filename]),ids=new Set();
        if(internalCopy.test($('main h1,main h2,main h3,main p,main li,main article').map((_,node)=>$(node).text()).get().join(' ')))fail('Internal editor instructions cannot be published as website copy');
        $('[id]').each((_,node)=>{const id=$(node).attr('id');if(ids.has(id))fail('Duplicate ID: '+id);ids.add(id);});
        documents.set(filename,{$,ids});
    }
    const compositions=new Set(),warnings=[];let sections=0,images=0;
    for(const [filename,{$,ids}] of documents){
        if($('html').attr('lang')!=='en'||!$('meta[charset]').length||!$('meta[name=viewport]').length||!$('meta[name=description]').attr('content'))fail('Missing required document metadata');
        if($('h1').length!==1||!$('title').text().trim()||$('main').length!==1)fail('Expected one main heading, title and main landmark');
        $('*').each((_,node)=>{for(const name of Object.keys(node.attribs||{}))if(/^on/i.test(name)||['srcdoc','style'].includes(name))fail('Unsafe HTML attribute: '+name);});
        if($('iframe,object,embed,base,form').length)fail('Generated static sites cannot contain embedded code or submission forms');
        const executable=$('script').filter((_,node)=>$(node).attr('type')!=='application/ld+json');
        if(executable.length!==2||executable.filter('[src="./script.js"]').length!==1||executable.filter('[src="./bootstrap.js"]').length!==1||executable.text().trim())fail('Only the trusted local interaction scripts are allowed');
        $('script[type="application/ld+json"]').each((_,node)=>{
            if($(node).attr('src')||$(node).text().includes('<'))fail('Unsafe structured data');
            let data;try{data=JSON.parse($(node).text());}catch{fail('Invalid structured data JSON');}
            if(data['@context']!=='https://schema.org'||data['@type']!=='Organization'||typeof data.name!=='string'||Object.keys(data).some(key=>!['@context','@type','name','url','email','telephone'].includes(key)))fail('Unsupported organization structured data');
            for(const value of Object.values(data))if(typeof value!=='string'||value.length>500)fail('Invalid structured data field');
            if(data.url)safeLink(data.url);
        });
        function reference(value){
            if(value.startsWith('#')){if(!ids.has(value.slice(1)))fail('Broken anchor: '+value);return;}
            if(value.startsWith('./')){
                const [file,fragment]=value.slice(2).split('#');
                if(!Object.hasOwn(files,file)||fragment&&!documents.get(file)?.ids.has(fragment))fail('Missing local asset or page target: '+value);return;
            }
            if(value.startsWith('https:')){safeLink(value);return;}
            if(/^(?:mailto:|tel:)/.test(value)&&!/[\r\n<>]/.test(value))return;
            fail('Unsupported file or URL reference: '+value);
        }
        $('[href],[src]').each((_,node)=>{for(const attr of ['href','src']){const value=$(node).attr(attr);if(value!=null)reference(value);}});
        $('img').each((_,node)=>{
            images++;
            if(!$(node).attr('alt')?.trim())fail('Content image is missing descriptive alt text');
            if(!/^\d+$/.test($(node).attr('width')||'')||!/^\d+$/.test($(node).attr('height')||''))fail('Image dimensions are required');
            if(!$(node).attr('src')?.startsWith('./assets/images/'))fail('Images must be bundled local assets');
            if($(node).attr('srcset'))for(const candidate of $(node).attr('srcset').split(',')){
                const match=candidate.trim().match(/^(\.\/assets\/images\/[^\s]+) (\d+)w$/);
                if(!match)fail('Invalid responsive image reference');reference(match[1]);
                const dimensions=rasterDimensions(files[match[1].slice(2)]);if(!dimensions||dimensions.width!==Number(match[2]))fail('Responsive image width does not match its asset');
            }
        });
        $('section').each((_,node)=>{if(!$(node).find('h1,h2').length||$(node).text().trim().length<8)fail('Empty or unlabelled section');});
        let previous=0;$('h1,h2,h3,h4,h5,h6').each((_,node)=>{const level=Number(node.tagName.slice(1));if(level>previous+1)fail('Heading levels must not skip');previous=level;});
        $('main>section.content-section').each((_,node)=>{sections++;compositions.add(($(node).attr('class').match(/composition-([\w-]+)/)||[])[1]);});
        const forbidden=/\b(?:layoutId|heroComposition|visualRequirement|sectionType)\s*:/;
        if(forbidden.test($('main').text()))fail('Visible internal schema labels');
    }
    if(/@import|expression\s*\(|javascript:/i.test(files['style.css']))fail('Unsafe or network-dependent CSS');
    for(const match of files['style.css'].matchAll(/url\(\s*['"]?([^)'"\s]+)/g))if(!Object.hasOwn(files,match[1].replace(/^\.\//,'')))fail('Unbundled CSS asset');
    for(const name of names.filter(name=>name.endsWith('.svg')))if(typeof files[name]!=='string'||/<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=/i.test(files[name]))fail('Unsafe SVG content');
    if(!images)warnings.push({code:'CONTENT_LED_VISUALS',message:'No authorized imagery was acquired; photographic quality has not been achieved.'});
    if(compositions.size<2&&sections>2)warnings.push({code:'REPEATED_COMPOSITION',message:'Review repeated section compositions.'});
    return {valid:true,files:names,sections,pages:documents.size,quality:{structural:'passed',accessibility:'static-checks-passed',visual:'requires-review',images,compositions:[...compositions],warnings}};
}
