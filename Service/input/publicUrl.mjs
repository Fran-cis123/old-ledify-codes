import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

export function isPublicAddress(value) {
    try {
        const address = ipaddr.parse(value);
        if (address.range() !== 'unicast') return false;
        if (address.kind() === 'ipv4' && address.match(ipaddr.parse('198.18.0.0'), 15)) return false;
        // IPv6 global unicast only, excluding transition/local/reserved ranges.
        if (address.kind() === 'ipv6' && !address.match(ipaddr.parse('2000::'), 3)) return false;
        if (address.kind() === 'ipv6' && address.match(ipaddr.parse('2001::'), 23)) return false;
        return true;
    } catch { return false; }
}
export async function resolvePublicUrl(value, lookup = dns.lookup) {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Object.assign(new Error('Use a public HTTP(S) URL without credentials'), { code: 'INVALID_SOURCE_URL' });
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw Object.assign(new Error('Source URLs must resolve exclusively to public internet addresses'), { code: 'INVALID_SOURCE_URL' });
    url.hash = '';
    return { url, address: addresses[0] };
}

// Resolve and pin the validated IP for each hop. Native fetch's separate DNS
// lookup would leave a rebinding window between validation and connection.
export async function fetchPublicResource(value, { lookup = dns.lookup, request: requestOverride, timeoutMs = 20000, maxBytes = 2 * 1024 * 1024,
    contentTypes = /^(text\/(html|plain)|application\/xhtml\+xml)(?:;|$)/i, accept = 'text/html,application/xhtml+xml,text/plain' } = {}) {
    const deadline = Date.now() + timeoutMs;
    if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw new Error('Source byte limit must be a positive integer');
    const tooLarge=()=>Object.assign(new Error(`Source resource exceeds its ${maxBytes}-byte download limit`),{code:'SOURCE_URL_TOO_LARGE',maxBytes});
    for (let redirects = 0; redirects <= 3; redirects++) {
        let timer;
        const target = await Promise.race([resolvePublicUrl(value, lookup), new Promise((_, reject) => {
            timer = setTimeout(() => reject(Object.assign(new Error('Source DNS lookup timed out'), { code: 'SOURCE_URL_TIMEOUT' })), Math.max(1, deadline - Date.now()));
        })]).finally(() => clearTimeout(timer));
        const { url, address } = target;
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw Object.assign(new Error('Source URL timed out'), { code: 'SOURCE_URL_TIMEOUT' });
        const response = await new Promise((resolve, reject) => {
            const request = requestOverride || (url.protocol === 'https:' ? https.request : http.request);
            const req = request(url, { method: 'GET', autoSelectFamily: false,
                headers: { 'User-Agent': 'Ledify-SourceReader/1.0', Accept: accept, 'Accept-Encoding': 'identity' },
                lookup: (hostname, options, callback) => callback(null, address.address, address.family)
            }, res => {
                res.on('error', reject);
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) { res.resume(); resolve({ redirect: res.headers.location }); return; }
                if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); reject(new Error(`Source URL returned HTTP ${res.statusCode}`)); return; }
                if (!contentTypes.test(res.headers['content-type'] || '')) { res.resume(); reject(new Error('Source URL returned an unsupported content type')); return; }
                if (res.headers['content-encoding'] && res.headers['content-encoding'] !== 'identity') { res.resume(); reject(new Error('Unsupported source compression')); return; }
                if(Number(res.headers['content-length'])>maxBytes) {reject(tooLarge());req.destroy();return;}
                let size = 0; const chunks = [];
                res.on('data', chunk => {
                    size += chunk.length;
                    if (size > maxBytes) { const error=tooLarge();reject(error);req.destroy();return; }
                    chunks.push(chunk);
                });
                res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] }));
            });
            const timer = setTimeout(() => req.destroy(Object.assign(new Error('Source URL timed out'), { code: 'SOURCE_URL_TIMEOUT' })), remaining);
            req.once('close', () => clearTimeout(timer)); req.on('error', reject); req.end();
        });
        if (!Object.hasOwn(response, 'redirect')) return response;
        if (!response.redirect || redirects === 3) throw new Error('Source URL has too many or invalid redirects');
        value = new URL(response.redirect, url).href;
    }
}
export async function fetchPublicText(value, options) {
    const { buffer, contentType } = await fetchPublicResource(value, options);
    return { text: buffer.toString('utf8'), contentType };
}
