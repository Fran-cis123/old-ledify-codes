import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import JSZip from 'jszip';
import { validateStaticWebsite } from './webpageStaticValidator.mjs';

export const WEBPAGE_ROOT = path.resolve('generated/webpages');
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export async function webpageArtifactService(files, options = {}) {
    const validation = validateStaticWebsite(files);
    const root = path.resolve(options.root || WEBPAGE_ROOT);
    const id = randomUUID(), token = randomBytes(32).toString('hex');
    const directory = path.join(root, id), siteDirectory = path.join(directory, 'site');
    await fs.mkdir(siteDirectory, { recursive: true });
    const stages = { site: 'processing', zip: 'skipped' }, warnings = [];
    let downloadUrl = null;
    try {
        for (const [name, content] of Object.entries(files)) {
            const destination = path.resolve(siteDirectory, name);
            if (!destination.startsWith(siteDirectory + path.sep)) throw new Error('Unsafe output path');
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.writeFile(destination, content, { flag: 'wx' });
        }
        stages.site = 'completed';
        try {
            const zip = new JSZip();
            const folder = zip.folder('my-website');
            for (const [name, content] of Object.entries(files)) folder.file(name, content);
            const readme = 'Extract this ZIP, then double-click my-website/index.html. No installation or server is needed. All essential assets are bundled. External project/contact links work when a suitable application or internet connection is available. This is a static site: it has no account, payment, reservation, or submission backend.\n';
            folder.file('README.txt', readme);
            const archive = await (options.buildZip || (zip => zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })))(zip);
            await fs.writeFile(path.join(directory, 'website.zip'), archive, { flag: 'wx' });
            stages.zip = 'completed';
            downloadUrl = `/api/webpages/${id}/${token}/download`;
        } catch {
            stages.zip = 'failed';
            warnings.push({ code: 'WEBPAGE_ZIP_FAILED', message: 'The preview is available, but ZIP packaging failed.' });
        }
        await fs.writeFile(path.join(directory, 'metadata.json'), JSON.stringify({ id, tokenHash: tokenHash(token), allowedFiles: validation.files,
            downloadable: stages.zip === 'completed', createdAt: new Date().toISOString() }), { flag: 'wx' });
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
