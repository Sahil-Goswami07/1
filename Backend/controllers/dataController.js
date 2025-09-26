import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { importExcel } from '../utils/excel.js';
import xlsx from 'xlsx';

const upload = multer({ dest: path.join(process.cwd(), 'Backend', 'tmp', 'uploads') });

export const excelUploadMiddleware = upload.single('file');

export async function importUniversityData(req, res) {
  if (!req.file) return res.status(400).json({ error: 'File required' });
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const result = await importExcel(fileBuffer, req.user.universityId);
    fs.unlink(req.file.path, () => {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

// Downloadable Excel template for universities
export function exportTemplate(req, res) {
  const headers = ['rollNo','name','course','graduationYear','certNo','marks','issueDate'];
  const sampleRows = [
    { rollNo: '23EJCIT054', name: 'GOUTAM KUMAR JHA', course: 'B. Tech', graduationYear: 2025, certNo: '23EJJCITM45P054', marks: 88, issueDate: '2025-12-09' },
    { rollNo: '23EJCIT055', name: 'GOUTAM KUMAR JHA', course: 'B. Tech', graduationYear: 2026, certNo: '23EJJCITM45P055', marks: 89, issueDate: '2025-12-10' },
    { rollNo: '23EJCIT056', name: 'GOUTAM KUMAR JHA', course: 'B. Tech', graduationYear: 2027, certNo: '23EJJCITM45P056', marks: 90, issueDate: '2025-12-11' },
  ];
  const wsData = [headers, ...sampleRows.map(r => headers.map(h => r[h] ?? ''))];
  const ws = xlsx.utils.aoa_to_sheet(wsData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Template');
  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="university-upload-template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}
