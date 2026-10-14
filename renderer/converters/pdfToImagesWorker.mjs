import fs from 'node:fs/promises';
import path from 'node:path';
import { pdf } from 'pdf-to-img';
const workerData=JSON.parse(process.argv[2]);

let document;
let pageNumber = 1;
try {
    document = await pdf(await fs.readFile(workerData.pdfPath), { scale: 2 });
    const images = [];
    for (pageNumber = 1; pageNumber <= document.length; pageNumber++) {
        const buffer = await document.getPage(pageNumber);
        const fileName = `slide-${pageNumber}.png`;
        const filePath = path.join(workerData.outputDirectory, fileName);
        await fs.writeFile(filePath, buffer);
        images.push({ slideNumber: pageNumber, fileName, filePath });
    }
    if (!images.length) throw new Error('PDF contains no rendered pages');
    process.send({ images });
} catch (error) {
    console.error(`[PNG] Rendering failed on page ${pageNumber}: ${error.message}`);
    process.send({ error: { message: `PNG rendering failed on page ${pageNumber}: ${error.message}`, pageNumber } });
} finally {
    await document?.destroy();
    process.disconnect();
}
