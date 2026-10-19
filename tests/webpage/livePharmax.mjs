import 'dotenv/config';
import fs from 'node:fs/promises';
import {generateService} from '../../Service/generateService.mjs';

const source='Create a professional website for a pharmaceutical manufacturing company called Pharmax. Use a premium scientific design with relevant illustrative laboratory photography. Only the company name and industry are supplied. Do not invent approved medicines, certifications, facilities, years of experience, clients, employees or contact details. Explain missing product and contact information transparently. No contact form submission service is configured.';
const result=await generateService('prompt',source,'webpage',{});
await fs.mkdir('generated/webpage-live-pharmax',{recursive:true});
await fs.writeFile('generated/webpage-live-pharmax/result.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,brief:result.generatedContent.websiteBrief.project,design:result.generatedContent.designSpec,heroImage:result.generatedContent.visualAssets?.hero?.source||null,previewUrl:result.artifacts.previewUrl,siteUrl:result.artifacts.siteUrl,downloadUrl:result.artifacts.downloadUrl,timings:result.timings}));
