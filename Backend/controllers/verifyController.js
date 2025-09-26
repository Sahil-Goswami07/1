import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';
import VerificationLog from '../models/VerificationLog.js';
import { runOCR } from '../services/ocr.js';
import fileUpload from 'express-fileupload';
import { SCORING, POLICY } from '../config/scoring.js';
import { nameSimilarity } from '../utils/textNormalize.js';

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
      // Centralized scoring weights & thresholds allow quick tuning without code edits elsewhere.
      const { weights, nameThresholds, status: statusCfg, criticalFields } = SCORING;
      // Roll number (critical)
      if (cert.studentId && cert.studentId.rollNo === rollNo) {
        fieldsMatched.push('rollNo');
        scoreBreakdown.rollNo = weights.rollNo; score += weights.rollNo;
      } else {
        fieldsMismatched.push('rollNo');
        reasons.push('Roll number mismatch');
      }
      // Graduation year
      const storedGrad = cert.studentId ? cert.studentId.graduationYear : undefined;
      if (graduationYear) graduationYear = Number(graduationYear);
      if (storedGrad) {
        if (!graduationYear || graduationYear === storedGrad) {
          fieldsMatched.push('graduationYear');
          scoreBreakdown.graduationYear = weights.graduationYear; score += weights.graduationYear;
        } else {
          fieldsMismatched.push('graduationYear');
          reasons.push('Graduation year mismatch');
        }
      }
      // Marks logic with policy: prefer explicit user match; else implicit full credit if enabled; else OCR fallback; else presence partial
      if (marks) {
        const suppliedMarks = Number(marks);
        if (!isNaN(suppliedMarks) && cert.marksPercent != null) {
          if (Math.abs(suppliedMarks - cert.marksPercent) <= 1) {
            fieldsMatched.push('marks');
            scoreBreakdown.marks = weights.marks; score += weights.marks;
          } else {
            fieldsMismatched.push('marks');
            reasons.push('Marks mismatch');
          }
        }
      } else if (cert.marksPercent != null) {
        let awarded = false;
        if (!marks && POLICY.implicitFullMarksIfStored) {
          fieldsMatched.push('marks');
          scoreBreakdown.marks = weights.marks; score += weights.marks;
          scoreBreakdown.marksReason = 'implicitFull (stored marks present)';
          awarded = true;
        }
        // OCR fallback if not already awarded
        if (!awarded && POLICY.allowOCRMarksFallback && ocr && typeof ocr.marks === 'number') {
          const diff = Math.abs(ocr.marks - cert.marksPercent);
          if (diff <= (POLICY.ocrMarksTolerance ?? 2)) {
            fieldsMatched.push('marks');
            scoreBreakdown.marks = weights.marks; score += weights.marks;
            scoreBreakdown.marksReason = 'ocrFallback';
            awarded = true;
          }
        }
        if (!awarded) {
          scoreBreakdown.marksPresence = weights.marksPresence; score += weights.marksPresence;
        }
      }
      // Name fuzzy similarity (soft-critical): we allow partial credit and don't block verification if other critical fields pass.
      if (cert.studentId && ocr && ocr.candidateName && ocr.candidateName !== 'Unknown') {
        const { similarity, details } = nameSimilarity(ocr.candidateName, cert.studentId.name);
        const pct = Number((similarity * 100).toFixed(1));
        scoreBreakdown.nameSimilarity = pct;
        scoreBreakdown.nameTokens = { o: details.oTokens, s: details.sTokens }; // optional diagnostics
        if (similarity >= nameThresholds.full || (details.sTokens.length <= 2 && similarity >= nameThresholds.shortNameFull)) {
          fieldsMatched.push('name');
          scoreBreakdown.name = weights.name; score += weights.name;
        } else if (similarity >= nameThresholds.partial) {
          scoreBreakdown.namePartial = weights.namePartial; score += weights.namePartial;
          reasons.push(`Name partial match (${pct}%)`);
        } else {
          fieldsMismatched.push('name');
          reasons.push(`Name mismatch (${pct}%)`);
        }
      }
      // Future: issue date, seal position, anomaly detection
    }
  // Compute final status with new config (critical fields must match if requireAllCritical=true)
    const { status: statusCfg2, criticalFields: critical2 } = SCORING;
    const nonNameMismatches = fieldsMismatched.filter(f => f !== 'name');
    let status;
    if (!cert) status = 'failed';
    else if (score >= statusCfg2.verifiedMinScore && (!statusCfg2.requireAllCritical || !critical2.some(f => fieldsMismatched.includes(f)))) status = 'verified';
    else status = 'partial';
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
