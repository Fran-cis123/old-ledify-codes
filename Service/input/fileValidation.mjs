import path from 'node:path';
import JSZip from 'jszip';
import { load } from 'cheerio';
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const UPLOAD_FORMAT_MESSAGE = 'Only PDF (.pdf) and Word (.docx) files are accepted.';
export const UPLOAD_FORMATS = Object.freeze({ '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
export function uploadError(message, code = 'INVALID_UPLOADED_FILE') {
    return Object.assign(new Error(message), { code, stage: 'input-extraction', status: code === 'UNSUPPORTED_FILE_FORMAT' ? 415 : 400 });
}
export function validateUploadMetadata(file) {
    const extension = path.extname(file?.originalname || '').toLowerCase();
    if (!UPLOAD_FORMATS[extension] || file.mimetype !== UPLOAD_FORMATS[extension]) throw uploadError(UPLOAD_FORMAT_MESSAGE, 'UNSUPPORTED_FILE_FORMAT');
    return extension;
}
export async function validateUploadedFile(file) {
    const extension = validateUploadMetadata(file);
    const fail = message => { throw uploadError(message); };
    if (!Buffer.isBuffer(file?.buffer) || !file.buffer.length || file.buffer.length > MAX_FILE_BYTES) fail('Upload a nonempty PDF or DOCX file no larger than 50 MB.');
    if (extension === '.pdf') {
        if (!file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-')) || !file.buffer.subarray(-2048).includes(Buffer.from('%%EOF'))) fail('Uploaded file does not have a valid PDF signature and end marker.');
    } else {
        if (!file.buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) fail('Uploaded DOCX is not a ZIP-based Word document.');
        try {
            const zip = await JSZip.loadAsync(file.buffer);
            const entries = Object.values(zip.files);
            if (entries.length > 3000 || entries.reduce((sum, entry) => sum + (entry._data?.uncompressedSize || 0), 0) > 150 * 1024 * 1024) fail('DOCX package exceeds safe extraction limits.');
            for (const entry of entries) if (/vbaProject\.bin$/i.test(entry.name) || entry.unsafeOriginalName?.split(/[\\/]/).includes('..')) fail('Unsupported or unsafe Word package.');
            const xml = async name => {
                const entry = zip.file(name);
                if (!entry || entry._data?.uncompressedSize > 5 * 1024 * 1024) fail('DOCX is missing required Word package parts or they exceed safe limits.');
                const value = await entry.async('string');
                if (/<!DOCTYPE|<!ENTITY/i.test(value)) fail('Unsupported XML declarations in Word package.');
                return load(value, { xml: true });
            };
            const types = await xml('[Content_Types].xml');
            const office = types('Override').filter((i, el) => types(el).attr('PartName') === '/word/document.xml');
            if (office.attr('ContentType') !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') fail('ZIP package is not a supported DOCX document.');
            const relationships = await xml('_rels/.rels');
            if (!relationships('Relationship').toArray().some(el => /\/officeDocument$/.test(relationships(el).attr('Type') || '') && /^\/?word\/document\.xml$/.test(relationships(el).attr('Target') || '') && relationships(el).attr('TargetMode') !== 'External')) fail('DOCX has no valid main document relationship.');
            const document = await xml('word/document.xml');
            if (!document('w\\:document').length || !document('w\\:body').length || document('w\\:document').attr('xmlns:w') !== 'http://schemas.openxmlformats.org/wordprocessingml/2006/main') fail('DOCX main document structure is invalid.');
        } catch (error) {
            if (error.code === 'INVALID_UPLOADED_FILE') throw error;
            fail('Unable to read the DOCX package. Upload a valid, unencrypted Word (.docx) file.');
        }
    }
    return true;
}
