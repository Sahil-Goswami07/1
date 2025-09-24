import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';
import VerificationLog from '../models/VerificationLog.js';
import { runOCR } from '../services/ocr.js';
import fileUpload from 'express-fileupload';

// Middleware for optional file upload (used only on this route)
export const verifyFileMiddleware = fileUpload({ useTempFiles: true, tempFileDir: './Backend/tmp', createParentPath: true });

export async function verifyCertificate(req, res) {
  try {
  let { certNo, rollNo, marks, graduationYear } = req.body;
    let ocr = null;
    if (req.files && req.files.certificate) {
      ocr = await runOCR(req.files.certificate);
      // Attempt to infer certNo / rollNo from OCR if missing
      if (!rollNo && ocr.rollNumber && ocr.rollNumber !== 'Unknown') rollNo = ocr.rollNumber;
  if (!certNo && ocr.enrollmentNumber && ocr.enrollmentNumber !== 'Unknown') certNo = ocr.enrollmentNumber;
    }
  if (!certNo || !rollNo) return res.status(400).json({ error: 'certNo and rollNo required (either sent or derivable from OCR / enrollment fallback)' });
    const cert = await Certificate.findOne({ certNo }).populate('studentId');
  const reasons = [];
  const fieldsMatched = [];
  const fieldsMismatched = [];
  const scoreBreakdown = {};
  let score = 0;
    if (!cert) {
      reasons.push('Certificate not found');
    }
    if (cert) {
      // Roll number match (mandatory)
      if (cert.studentId && cert.studentId.rollNo === rollNo) {
        fieldsMatched.push('rollNo');
        scoreBreakdown.rollNo = 50; score += 50; // base weight
      } else {
        fieldsMismatched.push('rollNo');
        reasons.push('Roll number mismatch');
      }
      // Graduation year comparison if provided by client or exists in student record
      const storedGrad = cert.studentId ? cert.studentId.graduationYear : undefined;
      if (graduationYear) graduationYear = Number(graduationYear);
      if (storedGrad) {
        if (!graduationYear || graduationYear === storedGrad) {
          fieldsMatched.push('graduationYear');
            scoreBreakdown.graduationYear = 15; score += 15;
        } else {
          fieldsMismatched.push('graduationYear');
          reasons.push('Graduation year mismatch');
        }
      }
      // Marks comparison if client supplied marks
      if (marks) {
        const suppliedMarks = Number(marks);
        if (!isNaN(suppliedMarks) && cert.marksPercent != null) {
          if (Math.abs(suppliedMarks - cert.marksPercent) <= 1) { // allow small OCR rounding difference
            fieldsMatched.push('marks');
            scoreBreakdown.marks = 25; score += 25;
          } else {
            fieldsMismatched.push('marks');
            reasons.push('Marks mismatch');
          }
        }
      } else if (cert.marksPercent != null) {
        scoreBreakdown.marksPresence = 10; score += 10; // partial
      }
      // Name matching (OCR candidateName vs stored student name) - loose normalization
      if (cert.studentId && ocr && ocr.candidateName && ocr.candidateName !== 'Unknown') {
        const norm = s => s.replace(/[^A-Z]/gi,'').toUpperCase();
        const oName = norm(ocr.candidateName);
        const sName = norm(cert.studentId.name || '');
        if (oName && sName && (oName === sName || oName.includes(sName) || sName.includes(oName))) {
          fieldsMatched.push('name');
          scoreBreakdown.name = 10; score += 10;
        } else {
          fieldsMismatched.push('name');
          reasons.push('Name mismatch');
        }
      }
      // Issue date heuristic if OCR extracted a date (not implemented yet – placeholder for future)
    }
    // Compute final status threshold
    const status = cert && score >= 50 && fieldsMismatched.length === 0 ? 'verified' : (cert ? 'partial' : 'failed');
    await VerificationLog.create({ certNo, status, score, reasons, fieldsMatched, fieldsMismatched, scoreBreakdown, ocrName: ocr ? ocr.candidateName : undefined, universityId: cert ? cert.universityId : undefined });
    res.json({ status, score, reasons, fieldsMatched, fieldsMismatched, scoreBreakdown, ocr, certificate: cert ? {
      certNo: cert.certNo,
      issueDate: cert.issueDate,
      marks: cert.marksPercent,
      universityId: cert.universityId,
      student: cert.studentId ? {
        name: cert.studentId.name,
        rollNo: cert.studentId.rollNo,
        course: cert.studentId.course,
        graduationYear: cert.studentId.graduationYear
      } : null
    } : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
