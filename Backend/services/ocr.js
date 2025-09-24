import Tesseract from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import sharp from 'sharp';
import fs from 'fs/promises';

/**
 * Convert first page of PDF to PNG buffer
 */
async function pdfToImageBuffer(pdfPath) {
  if (!pdfPath) throw new Error('PDF path is undefined');

  const options = {
    density: 300,
    format: 'png',
    width: 1200,
    height: 1600,
    savePath: undefined, // don't save, return buffer
  };

  const storeAsImage = fromPath(pdfPath, options);
  const page1 = await storeAsImage(1);
  return Buffer.from(page1.base64, 'base64');
}

/**
 * Run OCR on uploaded certificate
 */
export async function runOCR(file) {
  if (!file) throw new Error('No file provided for OCR');

  const filePath = file.tempFilePath || file.path;
  if (!filePath) throw new Error('File path is missing');

  let imageBuffer;

  if (file.mimetype === 'application/pdf') {
    imageBuffer = await pdfToImageBuffer(filePath);
  } else {
    imageBuffer = await fs.readFile(filePath);
  }

  // Optional preprocessing with Sharp
  imageBuffer = await sharp(imageBuffer)
    .resize({ width: 1200 })
    .toBuffer();

  // Run OCR
  const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng', {
    logger: m => console.log(m),
  });

  // Extract details using regex
  const candidateNameMatch = text.match(/Name\s*[:\-]?\s*([A-Z ]+)/i);
  const candidateName = candidateNameMatch ? candidateNameMatch[1].trim() : 'Unknown';

  const collegeMatch = text.match(/College Name\s*[:\-]?\s*(.+)/i);
  const collegeName = collegeMatch ? collegeMatch[1].trim() : 'Unknown';

  const rollMatch = text.match(/Roll No\s*[:\-]?\s*([A-Z0-9]+)/i);
  const rollNumber = rollMatch ? rollMatch[1].trim() : 'Unknown';

  const enrollmentMatch = text.match(/Enrollment No\s*[:\-]?\s*([A-Z0-9]+)/i);
  const enrollmentNumber = enrollmentMatch ? enrollmentMatch[1].trim() : 'Unknown';

  // Extract courses with midterm, endterm, and grade
  const courseRegex = /^(.+?)\s+(\S+)\s+(\d+)\s+(\d+)\s+([A-Z\+]+)/gm;
  const courses = [];
  let match;
  while ((match = courseRegex.exec(text)) !== null) {
    courses.push({
      courseTitle: match[1].trim(),
      courseCode: match[2],
      marks1: parseInt(match[3]),
      marks2: parseInt(match[4]),
      grade: match[5],
    });
  }

  // Aggregate marks (simple sum of both columns)
  let totalMarks = 0;
  let totalComponents = 0;
  for (const c of courses) {
    if (!isNaN(c.marks1)) { totalMarks += c.marks1; totalComponents++; }
    if (!isNaN(c.marks2)) { totalMarks += c.marks2; totalComponents++; }
  }
  const averageComponent = totalComponents ? totalMarks / totalComponents : 0;
  // For percentage we can approximate using marks2 (endterm) weight heavier, but for now just average scaled to 100 if needed
  const percent = averageComponent; // placeholder interpretation; adjust once max per component known

  return {
    candidateName,
    collegeName,
    rollNumber,
    enrollmentNumber,
    courses,
    fullText: text,
    certId: 'Unknown',
  marks: percent,
  maxMarks: 100,
    sealPosition: { x: 0.35, y: 0.85 },
    templateSeal: { x: 0.30, y: 0.80 },
    createdWith: 'Unknown'
  };
}
