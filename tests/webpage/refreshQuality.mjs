import fs from 'node:fs/promises';
import path from 'node:path';
import {webpageLayoutService} from '../../Service/webpageLayoutService.mjs';
import {webpageThemeService} from '../../Service/webpageThemeService.mjs';
import {compileWebsiteBrief} from '../../Service/webpage/websiteBrief.mjs';
import {acquireWebsiteImages} from '../../Service/webpage/imagePipeline.mjs';
import {webpageRenderer} from '../../renderer/webpage/webpageRenderer.mjs';
import {webpageArtifactService} from '../../Service/webpageArtifactService.mjs';
import {reframeScopedHero} from '../../Service/webpage/contentSpecification.mjs';
const root=path.resolve('generated/webpage-quality-live'),manifest=[];
for(const name of ['pharmaceutical','restaurant','fashion','startup','school','portfolio']){
    const directory=path.join(root,name),file=path.join(directory,'result.json');
    const saved=JSON.parse(await fs.readFile(file,'utf8'));
    reframeScopedHero(saved.generatedContent,saved.generatedContent.contentSpecification);
    const page=webpageLayoutService(saved.generatedContent,{...saved.context,topic:saved.input});page.websiteBrief=compileWebsiteBrief(page,saved.input,saved.context);
    const resolved=await acquireWebsiteImages(webpageThemeService(page,saved.context),saved.context,{external:false});
    saved.generatedContent=resolved.page;saved.artifacts=await webpageArtifactService(webpageRenderer(resolved.page,resolved.assets));
    saved.rerenderedAt=new Date().toISOString();saved.assetRefreshWarnings=resolved.warnings;
    await fs.writeFile(file,JSON.stringify(saved,null,2));manifest.push({name,directory,artifacts:saved.artifacts});
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));console.log('Six recorded AI results re-rendered with current assets and trusted renderer; no model calls.');
