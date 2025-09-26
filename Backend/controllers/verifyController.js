import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';
import VerificationLog from '../models/VerificationLog.js';
import { runOCR } from '../services/ocr.js';
import fileUpload from 'express-fileupload';
import { SCORING, POLICY } from '../config/scoring.js';
import { nameSimilarity } from '../utils/textNormalize.js';
import { validateRules } from '../utils/ruleValidator.js';
import { buildFeatureVector, scoreAnomaly } from '../services/mlAnomaly.js';

// Middleware for optional file upload (used only on this route)
export const verifyFileMiddleware = fileUpload({ useTempFiles: true, tempFileDir: './Backend/tmp', createParentPath: true });

export async function verifyCertificate(req, res) {
  try {
  let { certNo, rollNo, marks, graduationYear } = req.body;
    let ocr = null;
    if (req.files && req.files.certificate) {
      ocr = await runOCR(req.files.certificate);
      // Attempt to infer certNo / rollNo from OCR if missing
      if (!rollNo) {
        if (ocr.correctedRollNumber && ocr.correctedRollNumber !== 'Unknown') rollNo = ocr.correctedRollNumber;
        else if (ocr.rollNumber && ocr.rollNumber !== 'Unknown') rollNo = ocr.rollNumber;
      }
  if (!certNo) {
    if (ocr.correctedEnrollmentNumber && ocr.correctedEnrollmentNumber !== 'Unknown') certNo = ocr.correctedEnrollmentNumber;
    else if (ocr.enrollmentNumber && ocr.enrollmentNumber !== 'Unknown') certNo = ocr.enrollmentNumber;
  }
  // Fallback: use serial number if enrollment not found
  if (!certNo && ocr.serialNumber && ocr.serialNumber !== 'Unknown') {
    certNo = ocr.serialNumber;
    // Tag that we inferred from serial so downstream (future) logic could differentiate
    if (!req.inferredSources) req.inferredSources = [];
    req.inferredSources.push('certNo:serialNumber');
  }
    }
  // Basic normalization of identifiers (strip spaces & non-alphanumerics, uppercase) to improve match chance
  const normalizeId = v => typeof v === 'string' ? v.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : v;
  if (certNo) certNo = normalizeId(certNo);
  if (rollNo) rollNo = normalizeId(rollNo);
  if (!certNo || !rollNo) return res.status(400).json({ error: 'certNo and rollNo required (either sent or derivable from OCR / enrollment fallback)' });
  const cert = await Certificate.findOne({ certNo }).populate('studentId');
  const student = cert?.studentId || null;
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
  if (cert.studentId && normalizeId(cert.studentId.rollNo) === rollNo) {
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

    // Rule-based validation layer (independent of score) - influences anomalyReasons & potential FAKE
    let ruleResult = null;
    if (cert) {
      ruleResult = await validateRules({ cert, student, university: cert.universityId });
      if (!ruleResult.ok) {
        reasons.push(...ruleResult.reasons);
      }
    }

    // ML anomaly scoring (only if cert exists)
    let anomalyScore = 0; let anomalyReasons = [];
    if (cert) {
      const fv = buildFeatureVector({ cert, student });
      try {
        const { anomalyScore: aScore, error, missingModel } = await scoreAnomaly(fv);
        anomalyScore = aScore || 0;
        if (missingModel) anomalyReasons.push('Anomaly model missing (default score)');
        if (error) anomalyReasons.push('Anomaly scoring error');
      } catch(e){
        anomalyReasons.push('Anomaly scoring exception');
      }
    }

    // Determine final AI status tier
    // Priority: if rule validation fails -> FAKE; else if anomalyScore > 0.7 -> SUSPICIOUS; else map legacy status
    let finalStatus = status;
    if (cert) {
      if (ruleResult && !ruleResult.ok) finalStatus = 'FAKE';
      else if (anomalyScore > 0.7) finalStatus = 'SUSPICIOUS';
      else if (finalStatus === 'verified') finalStatus = 'VERIFIED';
      else if (finalStatus === 'partial') finalStatus = 'SUSPICIOUS'; // partial now downgraded to SUSPICIOUS in new model
    }

    const logDoc = { certNo, status: finalStatus.toLowerCase(), score, reasons, fieldsMatched, fieldsMismatched, scoreBreakdown, ocrName: ocr ? ocr.candidateName : undefined, universityId: cert ? cert.universityId : undefined, anomalyScore, anomalyReasons: [...new Set([...anomalyReasons, ...(ruleResult && !ruleResult.ok ? ruleResult.reasons : [])])] };
    await VerificationLog.create(logDoc);
    res.json({ status: finalStatus, anomalyScore, anomalyReasons: logDoc.anomalyReasons, score, reasons, fieldsMatched, fieldsMismatched, scoreBreakdown, ocr, certificate: cert ? {
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
