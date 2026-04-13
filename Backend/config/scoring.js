/**
 * config/scoring.js
 *
 * Central scoring configuration.
 * All weights and thresholds live here so tuning never requires touching
 * business logic files.
 *
 * Name thresholds now reflect the STRICT Levenshtein-based matcher in
 * utils/textNormalize.js (scores are 0–100, not 0–1 Jaccard fractions).
 */

export const SCORING = {
  weights: {
    rollNo:        45,  // primary identifier – highest weight
    graduationYear: 15,
    marks:         25,
    name:          15,  // awarded only if name passes full threshold
    namePartial:    5,  // reduced partial credit (strict mode)
    marksPresence: 10,
  },

  /**
   * Name thresholds (0–100 scale, output of compareNames()).
   *
   *  full    – score ≥ this → full name weight awarded.
   *            Set high (92) so minor OCR noise is tolerated but corruption
   *            like "GOTM" vs "GOUTAM" (≈50) is rejected.
   *
   *  partial – score ≥ this but < full → small partial credit.
   *            Represents acceptable 1-character OCR slip on a single token.
   *
   *  reject  – score < partial → name treated as mismatch, no credit.
   */
  nameThresholds: {
    full:    92,   // very lenient on exact/near-exact matches, strict on mismatches
    partial: 70,   // allow one small OCR error per name, but no whole-token corruption
    reject:  0,    // below partial → mismatch (implicit: just use `< partial`)
  },

  status: {
    verifiedMinScore:   65,  // minimum aggregate score to reach "verified"
    requireAllCritical: true, // all critical fields must match for "verified"
  },

  // Fields that MUST match for final status = "verified".
  // "name" is intentionally kept off this list (it's soft-critical):
  // a corrupted name drops the score but does NOT auto-fail if roll + marks OK.
  // Adjust by adding 'name' here if you want name to be hard-critical.
  criticalFields: ['rollNo', 'graduationYear', 'marks'],
};

/** Feature-flag policy settings */
export const POLICY = {
  /** If user omits marks but certificate has marksPercent, award full marks weight. */
  implicitFullMarksIfStored: true,

  /** If OCR extracts a marks value close to stored, award full marks weight. */
  allowOCRMarksFallback: true,

  /** ± tolerance (percentage points) for OCR vs stored marks comparison. */
  ocrMarksTolerance: 2,
};

export default SCORING;
