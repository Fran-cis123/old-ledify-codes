import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { presentationLayoutService } from '../Service/presentationLayoutService.mjs';
import { presentationThemeService } from '../Service/presentationThemeService.mjs';
import { presentationRendererService } from '../Service/presentationRendererService.mjs';
import { resolvePresentationVisuals } from '../Service/visual/presentationVisuals.mjs';
const root=path.resolve('generated/presentation-corrections');
for(const name of process.argv.slice(2)){
    const saved=JSON.parse(await fs.readFile(path.join(root,name,'result.json'),'utf8'));
    const content=JSON.parse(await fs.readFile(path.join(root,name,'ai-content.json'),'utf8'));
    for(const s of content.slides)s.visualPlan=saved.generatedContent.slides.find(v=>v.slideNumber===s.slideNumber)?.visualPlan;
    const diagnostics=[];
    const ready=presentationRendererService(presentationThemeService(presentationLayoutService(content,saved.context),saved.context));
    const result=await resolvePresentationVisuals(ready,saved.context,{external:false,onDiagnostic:d=>diagnostics.push(d)});
    console.log(JSON.stringify({name,diagnostics,warnings:result.warnings}));
}
