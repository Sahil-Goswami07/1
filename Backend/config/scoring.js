// Central scoring configuration so weights & thresholds are adjustable in one place.

export const SCORING = {
  weights: {
    rollNo: 45,
    graduationYear: 15,
    marks: 25,
    name: 15,
    namePartial: 8, // partial credit for name
    marksPresence: 10,
  },
  nameThresholds: {
    full: 0.60,        // Jaccard-like similarity for full credit
    shortNameFull: 0.55, // len <=2 case
    partial: 0.35      // between partial and full yields partial credit
  },
  status: {
    verifiedMinScore: 65, // Adjusted since roll weight lowered
    requireAllCritical: true, // critical fields except name must match
  },
  criticalFields: ['rollNo','graduationYear','marks'] // name treated as soft-critical
};
// Policy flags (feature toggles) – can be made environment-driven later
export const POLICY = {
  implicitFullMarksIfStored: true, // If user omits marks but certificate has marksPercent, award full marks weight instead of partial presence.
  allowOCRMarksFallback: true,     // If user omits marks but OCR extracted a numeric percentage close to stored, still award full marks.
  ocrMarksTolerance: 2             // +/- range for OCR vs stored.
};

export default SCORING;
