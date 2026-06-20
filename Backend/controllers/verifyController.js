/**
 * controllers/verifyController.js
 *
 * Certificate verification pipeline:
 *  1. Receive uploaded certificate file (optional)
 *  2. Run OCR to extract fields
 *  3. Look up the certificate + student in the database
 *  4. Score each field deterministically (roll, year, marks, name)
 *  5. Return a structured result with per-field breakdown
 *
 * Kept: OCR + strict deterministic matching + Image Forensics + ML Anomaly.
 */

import Certificate        from '../models/Certificate.js';
import Student            from '../models/Student.js';
import VerificationLog    from '../models/VerificationLog.js';
import University         from '../models/University.js';
import { runOCR }         from '../services/ocr.js';
import { extractWithGemini } from '../services/geminiOcr.js';
import fileUpload         from 'express-fileupload';
import { SCORING, POLICY } from '../config/scoring.js';
import { nameSimilarity } from '../utils/textNormalize.js';
import { validateRules }  from '../utils/ruleValidator.js';
import { buildFeatureVector, scoreAnomaly } from '../services/mlAnomaly.js';
import { runImageForensics } from '../services/imageForensics.js';
import mongoose from 'mongoose';

// Middleware for optional file upload (used only on this route)
export const verifyFileMiddleware = fileUpload({
  useTempFiles: true,
  tempFileDir: './Backend/tmp',
  createParentPath: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip everything except alphanumerics, uppercase. */
const normalizeId = (v) =>
  typeof v === 'string' ? v.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : v;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function verifyCertificate(req, res) {
  try {
    // ── STAGE 0: Request inspection ──────────────────────────────────────────
    console.log('[VERIFY-DEBUG] STAGE 0 — req.body keys:', Object.keys(req.body || {}));
    console.log('[VERIFY-DEBUG] STAGE 0 — req.body values:', {
      certNo:          req.body?.certNo,
      rollNo:          req.body?.rollNo,
      enrollmentNo:    req.body?.enrollmentNo,
      marks:           req.body?.marks,
      graduationYear:  req.body?.graduationYear,
    });
    console.log('[VERIFY-DEBUG] STAGE 0 — req.files keys:', req.files ? Object.keys(req.files) : 'NO FILES');
    // The controller looks for req.files.certificate — log whether that key exists
    console.log('[VERIFY-DEBUG] STAGE 0 — req.files.certificate present?', !!(req.files && req.files.certificate));
    console.log('[VERIFY-DEBUG] STAGE 0 — req.files.file present?', !!(req.files && req.files.file));

    const logId = new mongoose.Types.ObjectId();
    let { certNo, rollNo, enrollmentNo, marks, graduationYear } = req.body;

    // ── Step 1: OCR ─────────────────────────────────────────────────────────
    // Accept both 'file' (new frontend key) and 'certificate' (legacy key)
    let ocr = null;
    const uploadedFile = req.files && (req.files.file || req.files.certificate);
    if (uploadedFile) {
      console.log('[VERIFY-DEBUG] STAGE 1 — using file key:', req.files.file ? "'file'" : "'certificate'");

      // ── 1a: Tesseract OCR (handles digital PDFs + clean images well) ────────
      ocr = await runOCR(uploadedFile);

      // ── 1b: Gemini Vision (primary for photographed / watermarked images) ───
      // Only invoke Gemini if Tesseract failed to get at least one critical ID.
      const isRollValid = ocr.rollNumber && ocr.rollNumber !== 'Unknown' && ocr.rollNumber.length >= 9 && ocr.rollNumber.length <= 11;
      const isEnrollValid = ocr.enrollmentNumber && ocr.enrollmentNumber !== 'Unknown' && ocr.enrollmentNumber.length >= 14 && ocr.enrollmentNumber.length <= 16;
      const tesseractMissingCritical = !isRollValid || !isEnrollValid;

      if (tesseractMissingCritical) {
        console.log('[VERIFY-DEBUG] Tesseract missing critical fields — invoking Gemini Vision...');
        const filePath = uploadedFile.tempFilePath || uploadedFile.path;
        const gemini   = await extractWithGemini(filePath, uploadedFile.mimetype);

        if (gemini) {
          // Trust Gemini's answers for ALL fields it provides — not just Unknown ones.
          if (gemini.rollNumber) {
            console.log('[VERIFY-DEBUG] Gemini rollNumber:', gemini.rollNumber, '(was:', ocr.rollNumber, ')');
            ocr.rollNumber = ocr.correctedRollNumber = gemini.rollNumber;
          }
          if (gemini.enrollmentNumber) {
            console.log('[VERIFY-DEBUG] Gemini enrollmentNumber:', gemini.enrollmentNumber, '(was:', ocr.enrollmentNumber, ')');
            ocr.enrollmentNumber = ocr.correctedEnrollmentNumber = gemini.enrollmentNumber;
          }
          if (gemini.candidateName)    ocr.candidateName = gemini.candidateName;
          if (gemini.fatherName)       ocr.fatherName    = gemini.fatherName;
          if (!ocr.marks && gemini.sgpa) {
            ocr.marks = parseFloat(gemini.sgpa) * 10;
          }
          ocr._geminiUsed = true;
          console.log('[VERIFY-DEBUG] Gemini merge complete. rollNumber:', ocr.rollNumber, 'enrollmentNumber:', ocr.enrollmentNumber);
        } else {
          console.log('[VERIFY-DEBUG] Gemini returned null — staying with Tesseract results');
        }
      }

      // Infer identifiers from OCR result (Tesseract + Gemini merged)
      if (!rollNo) {
        if (ocr.correctedRollNumber && ocr.correctedRollNumber !== 'Unknown') rollNo = ocr.correctedRollNumber;
        else if (ocr.rollNumber && ocr.rollNumber !== 'Unknown') rollNo = ocr.rollNumber;
      }
      if (!enrollmentNo) {
        if (ocr.correctedEnrollmentNumber && ocr.correctedEnrollmentNumber !== 'Unknown') enrollmentNo = ocr.correctedEnrollmentNumber;
        else if (ocr.enrollmentNumber && ocr.enrollmentNumber !== 'Unknown') enrollmentNo = ocr.enrollmentNumber;
      }
      if (!certNo) {
        if (ocr.correctedEnrollmentNumber && ocr.correctedEnrollmentNumber !== 'Unknown') certNo = ocr.correctedEnrollmentNumber;
        else if (ocr.enrollmentNumber && ocr.enrollmentNumber !== 'Unknown') certNo = ocr.enrollmentNumber;
        else if (ocr.serialNumber && ocr.serialNumber !== 'Unknown') {
          certNo = ocr.serialNumber;
          if (!req.inferredSources) req.inferredSources = [];
          req.inferredSources.push('certNo:serialNumber');
        }
      }
    }
    // ── Step 2: Normalize identifiers ───────────────────────────────────────
    if (certNo) certNo = normalizeId(certNo);
    if (rollNo) rollNo = normalizeId(rollNo);

    if (!certNo || !rollNo) {
      return res.status(400).json({
        error: 'certNo and rollNo are required (send directly or let OCR derive them)',
      });
    }

    // ── Step 3: Database lookup ──────────────────────────────────────────────
    let cert       = null;
    let lookupMode = 'scoped';

    if (req.user && req.user.universityId) {
      cert = await Certificate.findOne({ certNo, universityId: req.user.universityId })
        .populate('studentId');
    } else {
      cert = await Certificate.findOne({ certNo }).populate('studentId');
      lookupMode = 'unscoped-noauth';
    }

    if (!cert) {
      // Check whether the cert exists under a different university (diagnostic only)
      const anyCert = await Certificate.findOne({ certNo }).populate('studentId');
      if (anyCert) {
        lookupMode = 'found-different-university';
        cert = anyCert;
      }
    }

    const student = cert?.studentId ?? null;

    let university = null;
    if (cert && cert.universityId) {
      university = await University.findById(cert.universityId);
    }

    // ── Step 4: Field scoring ────────────────────────────────────────────────
    const reasons          = [];
    const fieldsMatched    = [];
    const fieldsMismatched = [];
    const scoreBreakdown   = {};
    let   score            = 0;

    if (!cert) {
      reasons.push('Certificate not found in database');
    } else if (lookupMode === 'found-different-university') {
      reasons.push('Certificate belongs to a different university');
    }

    if (cert) {
      const { weights, nameThresholds, criticalFields } = SCORING;

      // ── Roll number (hard-critical) ────────────────────────────────────────
      // OCR frequently confuses 'O' and '0'. We replace 'O' with '0' in both sides for resilient comparison.
      const dbRoll = student ? normalizeId(student.rollNo).replace(/O/g, '0') : '';
      const inputRoll = rollNo ? rollNo.replace(/O/g, '0') : '';

      if (student && dbRoll === inputRoll) {
        fieldsMatched.push('rollNo');
        scoreBreakdown.rollNo = weights.rollNo;
        score += weights.rollNo;
      } else {
        fieldsMismatched.push('rollNo');
        reasons.push('Roll number mismatch');
        scoreBreakdown.rollNo = 0;
      }

      // ── Enrollment number checking (if available in DB) ───────────────────
      if (student && student.enrollmentNo) {
        const dbEnroll = normalizeId(student.enrollmentNo).replace(/O/g, '0');
        const inputEnroll = enrollmentNo ? normalizeId(enrollmentNo).replace(/O/g, '0') : '';
        if (inputEnroll && dbEnroll === inputEnroll) {
          fieldsMatched.push('enrollmentNo');
          if (weights.enrollmentNo) {
            scoreBreakdown.enrollmentNo = weights.enrollmentNo;
            score += weights.enrollmentNo;
          }
        } else if (inputEnroll) {
          fieldsMismatched.push('enrollmentNo');
          reasons.push('Enrollment number mismatch');
        }
      }

      // ── Graduation year ────────────────────────────────────────────────────
      const storedGrad = student?.graduationYear;
      if (graduationYear) graduationYear = Number(graduationYear);

      if (storedGrad) {
        if (!graduationYear || graduationYear === storedGrad) {
          fieldsMatched.push('graduationYear');
          scoreBreakdown.graduationYear = weights.graduationYear;
          score += weights.graduationYear;
        } else {
          fieldsMismatched.push('graduationYear');
          reasons.push('Graduation year mismatch');
          scoreBreakdown.graduationYear = 0;
        }
      }

      // ── Marks ──────────────────────────────────────────────────────────────
      if (marks) {
        const suppliedMarks = Number(marks);
        if (!isNaN(suppliedMarks) && cert.marksPercent != null) {
          if (Math.abs(suppliedMarks - cert.marksPercent) <= 1) {
            fieldsMatched.push('marks');
            scoreBreakdown.marks = weights.marks;
            score += weights.marks;
          } else {
            fieldsMismatched.push('marks');
            reasons.push('Marks mismatch');
            scoreBreakdown.marks = 0;
          }
        }
      } else if (cert.marksPercent != null) {
        let marksAwarded = false;

        if (POLICY.implicitFullMarksIfStored) {
          fieldsMatched.push('marks');
          scoreBreakdown.marks = weights.marks;
          scoreBreakdown.marksReason = 'implicit (stored marks present, none supplied)';
          score += weights.marks;
          marksAwarded = true;
        }

        if (!marksAwarded && POLICY.allowOCRMarksFallback && ocr && typeof ocr.marks === 'number') {
          const diff = Math.abs(ocr.marks - cert.marksPercent);
          if (diff <= (POLICY.ocrMarksTolerance ?? 2)) {
            fieldsMatched.push('marks');
            scoreBreakdown.marks = weights.marks;
            scoreBreakdown.marksReason = 'OCR fallback';
            score += weights.marks;
            marksAwarded = true;
          }
        }

        if (!marksAwarded) {
          scoreBreakdown.marksPresence = weights.marksPresence;
          score += weights.marksPresence;
        }
      }

      // ── Name (soft-critical, strict Levenshtein matching) ─────────────────
      if (student && ocr && ocr.candidateName && ocr.candidateName !== 'Unknown') {
        const { similarity, details, compareResult } = nameSimilarity(
          ocr.candidateName,
          student.name
        );

        // similarity is 0–1 (compareNames score / 100); nameScore is 0–100
        const nameScore = compareResult.name_similarity_score;

        scoreBreakdown.nameSimilarityScore = nameScore;
        scoreBreakdown.nameMatchedTokens   = compareResult.matched_tokens;
        scoreBreakdown.nameMismatchedTokens= compareResult.mismatched_tokens;
        scoreBreakdown.nameReason          = compareResult.reason;

        if (nameScore >= nameThresholds.full) {
          fieldsMatched.push('name');
          scoreBreakdown.name = weights.name;
          score += weights.name;
        } else if (nameScore >= nameThresholds.partial) {
          scoreBreakdown.namePartial = weights.namePartial;
          score += weights.namePartial;
          reasons.push(`Name partial match (score ${nameScore}/100): ${compareResult.reason}`);
        } else {
          fieldsMismatched.push('name');
          reasons.push(`Name mismatch (score ${nameScore}/100): ${compareResult.reason}`);
          scoreBreakdown.name = 0;
        }
      }
    }

    // ── Step 5: Determine final status ──────────────────────────────────────
    const { status: statusCfg, criticalFields } = SCORING;
    let status;

    if (!cert) {
      status = 'FAILED';
    } else if (
      score >= statusCfg.verifiedMinScore &&
      (!statusCfg.requireAllCritical ||
        !criticalFields.some((f) => fieldsMismatched.includes(f)))
    ) {
      status = 'VERIFIED';
    } else {
      status = 'SUSPICIOUS';
    }

    // ── Step 6: Rule-based sanity checks ────────────────────────────────────
    let ruleResult = null;
    if (cert) {
      ruleResult = await validateRules({
        cert,
        student,
        university: cert.universityId,
      });
      if (!ruleResult.ok) {
        reasons.push(...ruleResult.reasons);
        // Rule failures escalate status to FAKE
        if (status !== 'FAILED') status = 'FAKE';
      }
    }

    // 1. Image Forensics Pipeline (Stages 1-7)
    let logoSimilarity = 1.0;
    let sealSimilarity = 1.0;
    let layoutSimilarity = 1.0;
    let metadataRisk = 0.0;
    let tamperingScore = 0.0;
    let qrScore = 1.0;
    let extractedLogoPath = null;
    let extractedSealPath = null;
    let metadataDetails = {};
    if (cert && uploadedFile) {
      const forensics = await runImageForensics({
        university,
        file: uploadedFile,
        certNo: cert.certNo,
        rollNo: student ? student.rollNo : rollNo,
        logId
      });
      logoSimilarity = forensics.logoSimilarity;
      sealSimilarity = forensics.sealSimilarity;
      layoutSimilarity = forensics.layoutSimilarity;
      metadataRisk = forensics.metadataRisk;
      tamperingScore = forensics.tamperingScore;
      qrScore = forensics.qrScore;
      extractedLogoPath = forensics.extractedLogoPath;
      extractedSealPath = forensics.extractedSealPath;
      metadataDetails = forensics.metadata || {};
    }

    // 2. ML anomaly scoring (using extended 11-dimensional feature vector)
    let anomalyScore = 0; let anomalyReasons = [];
    if (cert) {
      const fv = buildFeatureVector({
        cert,
        student,
        logoSimilarity,
        sealSimilarity,
        metadataRisk,
        tamperingScore,
        layoutSimilarity,
        qrScore
      });
      try {
        const { anomalyScore: aScore, error, missingModel } = await scoreAnomaly(fv);
        anomalyScore = aScore || 0;
        if (missingModel) anomalyReasons.push('Anomaly model missing (default score)');
        if (error) {
          console.error('[Anomaly Error Details]', error);
          anomalyReasons.push('Anomaly scoring error');
        }
      } catch(e){
        anomalyReasons.push('Anomaly scoring exception');
      }
    }

    // 3. Combined Final Decision Logic
    let finalStatus = status;
    if (cert) {
      // Hard rules or database validation mismatch
      if (ruleResult && !ruleResult.ok) {
        finalStatus = 'FAKE';
      }
      // Critical visual tampering, or complete mismatch of logo/seal/layout
      else if (tamperingScore > 0.6 || logoSimilarity < 0.6 || sealSimilarity < 0.6 || layoutSimilarity < 0.6) {
        finalStatus = 'FAKE';
        reasons.push(`Tampering alert: High metadata/image forgery signals or structural mismatches found.`);
      }
      // Borderline parameters, missing QR verification, metadata risks, or neural anomaly flagging
      else if (
        anomalyScore > 0.7 ||
        logoSimilarity < 0.75 ||
        sealSimilarity < 0.75 ||
        layoutSimilarity < 0.75 ||
        metadataRisk > 0.7 ||
        qrScore < 0.8 ||
        finalStatus === 'partial'
      ) {
        finalStatus = 'SUSPICIOUS';
        if (anomalyScore > 0.7) reasons.push(`AI Anomaly Engine: Unusually high outlier score (${Math.round(anomalyScore * 100)}%)`);
        if (logoSimilarity < 0.75) reasons.push(`Logo matching: ${Math.round(logoSimilarity * 100)}% match (requires >=75%)`);
        if (sealSimilarity < 0.75) reasons.push(`Seal matching: ${Math.round(sealSimilarity * 100)}% match (requires >=75%)`);
        if (layoutSimilarity < 0.75) reasons.push(`Layout alignment: ${Math.round(layoutSimilarity * 100)}% match (requires >=75%)`);
        if (metadataRisk > 0.7) reasons.push('Metadata flags: Suspicious editing software signature found.');
        if (qrScore < 0.8) reasons.push('QR code mismatch: Encoded data does not match database record.');
      }
      // Fully verified pass
      else if (finalStatus === 'verified') {
        finalStatus = 'VERIFIED';
      }
    }

    const logDoc = {
      _id: logId,
      certNo,
      status: finalStatus.toLowerCase(),
      score,
      reasons,
      fieldsMatched,
      fieldsMismatched,
      scoreBreakdown,
      ocrName: ocr ? ocr.candidateName : undefined,
      universityId: cert ? cert.universityId : undefined,
      anomalyScore,
      anomalyReasons: [...new Set([...anomalyReasons, ...(ruleResult && !ruleResult.ok ? ruleResult.reasons : [])])],
      logoSimilarity: Math.round(logoSimilarity * 100),
      sealSimilarity: Math.round(sealSimilarity * 100),
      layoutSimilarity: Math.round(layoutSimilarity * 100),
      tamperingScore: Math.round(tamperingScore * 100),
      metadataRisk: Math.round(metadataRisk * 100),
      qrScore: Math.round(qrScore * 100),
      imageAnomalyScore: anomalyScore,
      extractedLogoPath,
      extractedSealPath
    };
    await VerificationLog.create(logDoc);

    res.json({
      status: finalStatus,
      deterministicScore: score,
      anomalyScore,
      anomalyReasons: logDoc.anomalyReasons,
      imageAuthenticity: {
        logoSimilarity: Number(logoSimilarity.toFixed(2)),
        sealSimilarity: Number(sealSimilarity.toFixed(2)),
        layoutSimilarity: Number(layoutSimilarity.toFixed(2)),
        metadataRisk: Number(metadataRisk.toFixed(2)),
        tamperingScore: Number(tamperingScore.toFixed(2)),
        qrScore: Number(qrScore.toFixed(2)),
        extractedLogoPath,
        extractedSealPath,
        metadata: metadataDetails
      },
      score,
      reasons,
      fieldsMatched,
      fieldsMismatched,
      scoreBreakdown,
      ocr,
      certificate: cert ? {
        certNo: cert.certNo,
        issueDate: cert.issueDate,
        marks: cert.marksPercent,
        universityId: cert.universityId,
        sealImage: university ? university.sealImage : undefined,
        logoImage: university ? university.logoImage : undefined,
        student: student ? {
          name: student.name,
          rollNo: student.rollNo,
          enrollmentNo: student.enrollmentNo,
          course: student.course,
          graduationYear: student.graduationYear
        } : null
      } : null
    });
  } catch (e) {
    console.error('[Verify Error]', e.stack || e);
    res.status(500).json({ error: e.message, stack: e.stack });
  }
}
