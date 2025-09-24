import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';
import VerificationLog from '../models/VerificationLog.js';
import { runOCR } from '../services/ocr.js';
import fileUpload from 'express-fileupload';

// Middleware for optional file upload (used only on this route)
export const verifyFileMiddleware = fileUpload({ useTempFiles: true, tempFileDir: './Backend/tmp', createParentPath: true });

export async function verifyCertificate(req, res) {
  try {
    let { certNo, rollNo } = req.body;
    let ocr = null;
    if (req.files && req.files.certificate) {
      ocr = await runOCR(req.files.certificate);
      // Attempt to infer certNo / rollNo from OCR if missing
      if (!rollNo && ocr.rollNumber && ocr.rollNumber !== 'Unknown') rollNo = ocr.rollNumber;
      if (!certNo && ocr.enrollmentNumber && ocr.enrollmentNumber !== 'Unknown') certNo = ocr.enrollmentNumber;
    }
    if (!certNo || !rollNo) return res.status(400).json({ error: 'certNo and rollNo required (either sent or derivable from OCR)' });
    const cert = await Certificate.findOne({ certNo }).populate('studentId');
    let status = 'failed';
    let score = 0;
    const reasons = [];
    if (cert) {
      const student = await Student.findById(cert.studentId._id);
      if (student && student.rollNo === rollNo) {
        status = 'verified';
        score = 100;
      } else {
        reasons.push('Roll number mismatch');
      }
    } else {
      reasons.push('Certificate not found');
    }
    await VerificationLog.create({ certNo, status, score, reasons, universityId: cert ? cert.universityId : undefined });
    res.json({ status, score, reasons, ocr });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
