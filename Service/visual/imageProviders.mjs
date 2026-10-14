import { GoogleGenAI } from '@google/genai';
import { fetchPublicResource } from '../input/publicUrl.mjs';

export function configuredImageProviders(env = process.env) {
    return {
        ...(env.PEXELS_API_KEY ? { search: async request => {
            const url = new URL('https://api.pexels.com/v1/search');
            url.search = new URLSearchParams({ query: request.searchQuery, per_page: '4', orientation: 'landscape', size: 'large' });
            const response = await fetch(url, { headers: { Authorization: env.PEXELS_API_KEY }, signal: AbortSignal.timeout(12000) });
            if (!response.ok) throw new Error('Licensed image search unavailable');
            const body = await response.json();
            const photo = body.photos?.find(p => p.width >= 1920 && p.height >= 1080 && p.src?.original && p.photographer && p.url);
            if (!photo) return null;
            const { buffer } = await fetchPublicResource(photo.src.original, { maxBytes: 12 * 1024 * 1024, timeoutMs: 15000, contentTypes: /^image\/(png|jpeg)(?:;|$)/i, accept: 'image/jpeg,image/png' });
            return { buffer, source: 'Pexels', creator: photo.photographer, license: 'Pexels License',
                licenseUrl: 'https://www.pexels.com/license/', attributionRequired: true, attribution: `Photo by ${photo.photographer} on Pexels`,
                assetId: String(photo.id), originalUrl: photo.url, creatorUrl: photo.photographer_url, generationMethod: 'licensed-search' };
        } } : {}),
        // Paid generation requires an explicit server-side opt-in and model ID.
        ...(env.PRESENTATION_ALLOW_IMAGE_GENERATION === 'true' && env.GEMINI_API_KEY && env.PRESENTATION_IMAGE_MODEL ? { generate: async request => {
            const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
            const result = await client.models.generateContent({ model: env.PRESENTATION_IMAGE_MODEL,
                contents: `Create one decorative presentation background, 16:9, no text, logos, labels, charts or scientific evidence. Keep the left 60% calm for overlaid text. Theme: ${request.theme}. Palette: ${request.palette}. Concept: ${request.description}. This is conceptual artwork, never a claim about real events or people.`,
                config: { responseModalities: ['IMAGE'], httpOptions: { timeout: 45000, retryOptions: { attempts: 1 } } } });
            const part = result.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
            if (!part) throw new Error('Image generation returned no image');
            return { buffer: Buffer.from(part.inlineData.data, 'base64'), source: 'Google Gemini', creator: 'AI generated',
                license: 'Generated using configured Gemini account; provider terms apply', licenseUrl: 'https://ai.google.dev/gemini-api/terms',
                attributionRequired: false, attribution: 'Conceptual AI-generated artwork', assetId: '', originalUrl: '', generationMethod: 'ai-generated' };
        } } : {})
    };
}
