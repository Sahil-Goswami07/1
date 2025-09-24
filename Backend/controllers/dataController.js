import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { importExcel } from '../utils/excel.js';

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
