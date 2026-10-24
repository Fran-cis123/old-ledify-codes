import fs from 'node:fs/promises';
import path from 'node:path';
import { timingSafeEqual,createHash } from 'node:crypto';
import {imageDiagnostic} from '../Service/visual/imageAssetService.mjs';
import { WEBPAGE_ROOT, tokenHash } from '../Service/webpageArtifactService.mjs';
import { previewViewer, viewerCss, viewerJs } from '../renderer/webpage/previewViewer.mjs';
const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export function webpageAssetHandlers(root = WEBPAGE_ROOT) {
    const read = async (req, res) => {
        const { id, token } = req.params;
        if (!uuid.test(id || '') || !/^[\da-f]{64}$/i.test(token || '')) { res.status(404).json({ message: 'Website not found' }); return null; }
        try {
            const directory = path.join(root, id);
            const metadata = JSON.parse(await fs.readFile(path.join(directory, 'metadata.json'), 'utf8'));
            if (!/^[\da-f]{64}$/.test(metadata.tokenHash) || !timingSafeEqual(Buffer.from(metadata.tokenHash, 'hex'), Buffer.from(tokenHash(token), 'hex'))) throw new Error('Invalid capability');
            res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
                'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()' });
            return { directory, metadata, base: `/api/webpages/${id}/${token}` };
        } catch { res.status(404).json({ message: 'Website not found' }); return null; }
    };
    function frameAncestors() {
        const configured = process.env.WEBPAGE_APP_ORIGIN;
        if (!configured) return "'self'";
        const url = new URL(configured);
        if (!['http:', 'https:'].includes(url.protocol) || url.origin !== configured) throw new Error('WEBPAGE_APP_ORIGIN must be an exact HTTP(S) origin');
        return `'self' ${url.origin}`;
    }
    return {
        preview: async (req, res) => {
            const found = await read(req, res); if (!found) return;
            res.set('Content-Security-Policy', `default-src 'none'; style-src 'self'; script-src 'self'; frame-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors ${frameAncestors()}`);
            res.type('html').send(previewViewer(`${found.base}/site/index.html`, found.metadata.downloadable ? `${found.base}/download` : null));
        },
        viewerAsset: async (req, res) => {
            if (!await read(req, res)) return;
            if (req.params.asset === 'viewer.css') return res.type('css').send(viewerCss);
            if (req.params.asset === 'viewer.js') return res.type('js').send(viewerJs);
            res.sendStatus(404);
        },
        site: async (req, res) => {
            const found = await read(req, res); if (!found) return;
            const filename = Array.isArray(req.params.file) ? req.params.file.join('/') : req.params.file;
            if (!found.metadata.allowedFiles.includes(filename)) return res.sendStatus(404);
            if(found.metadata.imageHashes?.[filename]){
                try{const buffer=await fs.readFile(path.join(found.directory,'site',filename));if(createHash('sha256').update(buffer).digest('hex')!==found.metadata.imageHashes[filename])throw new Error('Checksum mismatch');return res.type(path.extname(filename)).send(buffer);}
                catch{imageDiagnostic({generationType:'webpage',provider:'artifact-store',status:'failed',reasonCode:'IMAGE_DELIVERY_FAILED',storage:'unavailable',validation:'failed'});return res.status(404).json({message:'Image asset is missing or invalid',errorCode:'IMAGE_DELIVERY_FAILED'});}
            }
            // Applied to direct HTML visits as well as iframe loads. No same-origin,
            // forms, popups, top navigation, storage or network APIs are granted.
            res.set('Content-Security-Policy', `sandbox allow-scripts; default-src 'none'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${frameAncestors()}`);
            res.sendFile(path.join(found.directory, 'site', filename));
        },
        download: async (req, res) => {
            const found = await read(req, res); if (!found) return;
            if (!found.metadata.downloadable) return res.status(404).json({ message: 'ZIP is not available' });
            res.download(path.join(found.directory, 'website.zip'), 'generated-website.zip');
        }
    };
}
