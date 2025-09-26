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

  // Extract candidate (student) name.
  // Updated to handle combined line: "Name : X Y Father's Name : Z" and avoid capturing college name.
  let candidateName = 'Unknown';
  try {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+/g,' ');
      // Skip pure college line
      if (/^college name/i.test(line)) continue;
      // If line contains both Name and Father's Name, isolate segment before Father's Name
      if (/name\s*[:]/i.test(line)) {
        let working = line;
        const fatherIdx = working.search(/father'?s name/i);
        if (fatherIdx > -1) working = working.slice(0, fatherIdx); // remove father's part
        // Now extract after first Name:
        const m = working.match(/(?:student|candidate)?\s*name\s*[:\-]\s*([A-Z][A-Z .']{1,})/i);
        if (m) {
          const val = m[1].trim();
            if (val && !/COLLEGE|UNIVERSITY/i.test(val)) { candidateName = val; break; }
        }
      }
    }
    if (candidateName === 'Unknown') {
      // Global fallback search (stop at Father's if present)
      const global = text.match(/Name\s*[:\-]\s*([A-Z][A-Z .']{2,})(?=\s+Father's Name|\n|$)/i);
      if (global && !/COLLEGE|UNIVERSITY/i.test(global[1])) candidateName = global[1].trim();
    }
  } catch (e) { /* ignore */ }

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
    normalizedCandidateName: candidateName, // controller applies deeper normalization
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
