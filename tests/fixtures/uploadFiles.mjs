import JSZip from 'jszip';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export async function docxSource(text = 'A readable source document about careful review.') {
    const zip = new JSZip();
    const escaped = text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${escaped}</w:t></w:r></w:p></w:body></w:document>`);
    return zip.generateAsync({ type: 'nodebuffer' });
}
export function pdfSource(text = 'A readable source document about careful review.') {
    const stream = `BT /F1 12 Tf 50 750 Td (${text.replace(/[()\\]/g,' ')}) Tj ET`;
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
    let data='%PDF-1.4\n'; const offsets=[0];
    objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(data));data+=`${i+1} 0 obj\n${object}\nendobj\n`;});
    const start=Buffer.byteLength(data);
    data+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
    return Buffer.from(data);
}
