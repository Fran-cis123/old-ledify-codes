import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import JSZip from 'jszip';
import { validateStaticWebsite } from './webpageStaticValidator.mjs';
import {generateIndependent} from './ai/concurrency.mjs';
import {storageRoot} from './storageRoot.mjs';
import {validateImageBytes,imageDiagnostic} from './visual/imageAssetService.mjs';
import {measureStage} from './performance.mjs';

export const WEBPAGE_ROOT = path.resolve(process.env.LEDIFY_WEBPAGE_ROOT || storageRoot('webpages'));
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export async function webpageArtifactService(files, options = {}) {
    const validation = validateStaticWebsite(files);
    const imageHashes=await measureStage('website-package-images',async()=>{
        const hashes={};
        for(const [name,buffer] of Object.entries(files).filter(([name])=>/\.(?:png|jpe?g|webp)$/.test(name))){await validateImageBytes(buffer);hashes[name]=createHash('sha256').update(buffer).digest('hex');}
        return hashes;
    });
    const root = path.resolve(options.root || WEBPAGE_ROOT);
    const id = randomUUID(), token = randomBytes(32).toString('hex');
    const directory = path.join(root, id), siteDirectory = path.join(directory, 'site');
    await fs.mkdir(siteDirectory, { recursive: true });
    const stages = { site: 'processing', zip: 'skipped' }, warnings = [];
    let downloadUrl = null;
    try {
        await measureStage('website-package-write',()=>generateIndependent(Object.entries(files),4,async([name,content])=>{
            const destination = path.resolve(siteDirectory, name);
            if (!destination.startsWith(siteDirectory + path.sep)) throw new Error('Unsafe output path');
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.writeFile(destination, content, { flag: 'wx' });
        },()=>{}));
        stages.site = 'completed';
        for(const [name,hash] of Object.entries(imageHashes))if(createHash('sha256').update(await fs.readFile(path.join(siteDirectory,name))).digest('hex')!==hash)throw new Error('Image storage checksum mismatch');
        try {
            const zip = new JSZip();
            const folder = zip.folder('my-website');
            // JPEG/WebP/PNG are already compressed. Deflating them again burns
            // CPU without improving image quality or meaningfully reducing ZIPs.
            for (const [name, content] of Object.entries(files)) folder.file(name, content,{compression:/\.(?:webp|png|jpe?g|woff2?)$/i.test(name)?'STORE':'DEFLATE',compressionOptions:{level:3}});
            const readme = 'Extract this ZIP, then double-click my-website/index.html. No installation or server is needed. All essential assets are bundled. External project/contact links work when a suitable application or internet connection is available. This is a static site: it has no account, payment, reservation, or submission backend.\n';
            folder.file('README.txt', readme);
            const archive = await measureStage('website-package-zip',()=>(options.buildZip || (zip => zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })))(zip));
            await measureStage('website-package-verify',async()=>{
                const verified=await JSZip.loadAsync(archive,{checkCRC32:true});
                for(const [name,hash] of Object.entries(imageHashes))if(!verified.file('my-website/'+name)||createHash('sha256').update(await verified.file('my-website/'+name).async('nodebuffer')).digest('hex')!==hash)throw new Error('ZIP image checksum mismatch');
            });
            await fs.writeFile(path.join(directory, 'website.zip'), archive, { flag: 'wx' });
            stages.zip = 'completed';
            downloadUrl = `/api/webpages/${id}/${token}/download`;
        } catch {
            stages.zip = 'failed';
            warnings.push({ code: 'WEBPAGE_ZIP_FAILED', message: 'The preview is available, but ZIP packaging failed.' });
        }
        await fs.writeFile(path.join(directory, 'metadata.json'), JSON.stringify({ id, tokenHash: tokenHash(token), allowedFiles: validation.files,imageHashes,
            downloadable: stages.zip === 'completed', createdAt: new Date().toISOString() }), { flag: 'wx' });
        imageDiagnostic({generationType:'webpage',provider:'artifact-store',status:stages.zip==='completed'?'verified':'incomplete',succeeded:Object.keys(imageHashes).length,storage:'saved',validation:stages.zip==='completed'?'passed':'export-failed'});
        return { id, status: stages.zip === 'completed' ? 'completed' : 'partial_success', stages, warnings,
            previewUrl: `/api/webpages/${id}/${token}/preview`, siteUrl: `/api/webpages/${id}/${token}/site/index.html`, downloadUrl,
            embed: { sandbox: 'allow-scripts', referrerPolicy: 'no-referrer' }, viewports: { desktop: 1280, tablet: 768, mobile: 390 },
            files: { directory, siteDirectory, zipPath: stages.zip === 'completed' ? path.join(directory, 'website.zip') : null }, validation };
    } catch (error) {
        // The directory is a freshly created, internally generated UUID under root.
        if (directory.startsWith(root + path.sep)) await fs.rm(directory, { recursive: true, force: true });
        throw Object.assign(new Error('Unable to save webpage artifacts', { cause: error }), { code: 'WEBPAGE_ARTIFACT_FAILED', stage: 'webpage-packaging' });
    }
}
