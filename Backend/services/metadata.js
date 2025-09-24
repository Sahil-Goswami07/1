// backend/services/metadata.js
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import ExifParser from 'exif-parser';

export async function extractMetadata(file) {
  const filePath = file.tempFilePath || file.path;

  if (file.mimetype === 'application/pdf') {
    const data = await fs.readFile(filePath);
    const pdfDoc = await PDFDocument.load(data);

    return {
      type: 'pdf',
      title: pdfDoc.getTitle() || '',
      author: pdfDoc.getAuthor() || '',
      producer: pdfDoc.getProducer() || 'Unknown',
      creator: pdfDoc.getCreator() || '',
      creationDate: pdfDoc.getCreationDate()
        ? pdfDoc.getCreationDate().toISOString()
        : 'Unknown',
      createdWith: pdfDoc.getProducer() || 'Unknown'
    };
  } else {
    const buffer = await fs.readFile(filePath);
    try {
      const parser = ExifParser.create(buffer);
      const exif = parser.parse();
      return {
        type: 'image',
        createdWith: exif.tags.Software || 'Unknown',
        camera: exif.tags.Make || '',
        date: exif.tags.DateTimeOriginal || '',
      };
    } catch {
      return { type: 'image', createdWith: 'Unknown' };
    }
  }
}
