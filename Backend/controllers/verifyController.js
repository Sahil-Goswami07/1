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
 * Removed: ML anomaly scoring, blockchain references.
 * Kept:    OCR + strict deterministic matching.
 */

import Certificate        from '../models/Certificate.js';
import VerificationLog    from '../models/VerificationLog.js';
import { runOCR }         from '../services/ocr.js';
import fileUpload         from 'express-fileupload';
import { SCORING, POLICY } from '../config/scoring.js';
import { nameSimilarity } from '../utils/textNormalize.js';
import { validateRules }  from '../utils/ruleValidator.js';

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
    let { certNo, rollNo, marks, graduationYear } = req.body;

    // ── Step 1: OCR ─────────────────────────────────────────────────────────
    let ocr = null;
    if (req.files && req.files.certificate) {
      ocr = await runOCR(req.files.certificate);

      // Infer identifiers from OCR if not supplied by the caller
      if (!rollNo) {
        rollNo = ocr.correctedRollNumber !== 'Unknown'
          ? ocr.correctedRollNumber
          : ocr.rollNumber !== 'Unknown' ? ocr.rollNumber : undefined;
      }
      if (!certNo) {
        certNo = ocr.correctedEnrollmentNumber !== 'Unknown'
          ? ocr.correctedEnrollmentNumber
          : ocr.enrollmentNumber !== 'Unknown' ? ocr.enrollmentNumber
          : ocr.serialNumber !== 'Unknown' ? ocr.serialNumber : undefined;
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
      if (student && normalizeId(student.rollNo) === rollNo) {
        fieldsMatched.push('rollNo');
        scoreBreakdown.rollNo = weights.rollNo;
        score += weights.rollNo;
      } else {
        fieldsMismatched.push('rollNo');
        reasons.push('Roll number mismatch');
        scoreBreakdown.rollNo = 0;
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

    // ── Step 7: Log and respond ──────────────────────────────────────────────
    const logDoc = {
      certNo,
      status: status.toLowerCase(),
      score,
      reasons,
      fieldsMatched,
      fieldsMismatched,
      scoreBreakdown,
      ocrName:     ocr ? ocr.candidateName : undefined,
      universityId: cert ? cert.universityId : undefined,
    };
    await VerificationLog.create(logDoc);

    return res.json({
      status,
      score,
      reasons,
      fieldsMatched,
      fieldsMismatched,
      scoreBreakdown,
      ocr,
      certificate: cert
        ? {
            certNo:      cert.certNo,
            issueDate:   cert.issueDate,
            marks:       cert.marksPercent,
            universityId: cert.universityId,
            student: student
              ? {
                  name:           student.name,
                  rollNo:         student.rollNo,
                  course:         student.course,
                  graduationYear: student.graduationYear,
                }
              : null,
          }
        : null,
    });
  } catch (err) {
    console.error('[verifyCertificate] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
