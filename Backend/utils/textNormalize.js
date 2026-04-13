/**
 * utils/textNormalize.js
 *
 * Strict, fraud-sensitive name comparison for certificate verification.
 * Uses token-level Levenshtein distance instead of loose Jaccard similarity.
 *
 * Design goals:
 *  - A single corrupted token (e.g. "GOTM" vs "GOUTAM") drops the score significantly.
 *  - Short OCR artifacts or missing tokens are penalized, not forgiven.
 *  - Returns a rich diagnostic object for logging and API responses.
 */

// ---------------------------------------------------------------------------
// Character-level Levenshtein distance (iterative, O(m*n) time, O(n) space)
// ---------------------------------------------------------------------------
function levenshtein(a, b) {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // Use two rows to save memory
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array(lb + 1);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,      // insertion
        prev[j] + 1,           // deletion
        prev[j - 1] + cost     // substitution
      );
    }
    [prev, curr] = [curr, prev]; // swap
  }
  return prev[lb];
}

// ---------------------------------------------------------------------------
// Character similarity ratio for two tokens (0.0 – 1.0)
// ---------------------------------------------------------------------------
function charSimilarity(a, b) {
  if (!a && !b) return 1.0;
  if (!a || !b) return 0.0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

// ---------------------------------------------------------------------------
// OCR character confusion map applied to names
// Converts common OCR misreads back to probable originals (letters only).
// ---------------------------------------------------------------------------
const OCR_CONFUSIONS = [
  [/0/g, 'O'],
  [/1/g, 'I'],
  [/5/g, 'S'],
  [/8/g, 'B'],
  [/6/g, 'G'],
];

function applyOCRCorrections(str) {
  let s = str;
  for (const [pattern, replacement] of OCR_CONFUSIONS) {
    s = s.replace(pattern, replacement);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Normalize a raw name string into clean uppercase tokens
// ---------------------------------------------------------------------------
function normalizeNameToTokens(raw) {
  if (!raw || typeof raw !== 'string') return [];

  let s = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove diacritics
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')   // keep only alphanumerics and spaces
    .replace(/\s+/g, ' ')
    .trim();

  s = applyOCRCorrections(s);

  return s.split(' ').filter(t => t.length > 0);
}

// ---------------------------------------------------------------------------
// Configuration constants (tune here, not in business logic)
// ---------------------------------------------------------------------------
const CONFIG = {
  /**
   * Minimum character-level similarity for a token pair to be considered
   * a "match". Tokens below this are treated as mismatches.
   * 0.85 means "GOUTAM" vs "GOTM" (0.67) → mismatch.
   */
  TOKEN_SIMILARITY_THRESHOLD: 0.85,

  /**
   * Score awarded per perfectly matched token (exact string equality).
   */
  EXACT_TOKEN_SCORE: 100,

  /**
   * Score awarded per token that passes character similarity threshold
   * but is not an exact match (e.g. minor OCR noise like extra space).
   * We keep this low to avoid rewarding corrupted tokens.
   */
  PARTIAL_TOKEN_SCORE: 60,

  /**
   * Penalty applied per token that is in the stored name but has no
   * acceptable match in the OCR name. Expressed as a flat deduction
   * from the raw score pool.
   */
  MISSING_TOKEN_PENALTY: 0,   // handled via unmatched count in final formula
};

// ---------------------------------------------------------------------------
// Core comparison function
// ---------------------------------------------------------------------------

/**
 * compare_names(ocrName, storedName)
 *
 * Compares an OCR-extracted name against the stored database name.
 * Implements strict, fraud-sensitive token-level matching.
 *
 * @param {string} ocrName    - Name extracted from the uploaded certificate via OCR.
 * @param {string} storedName - Authoritative name stored in the database.
 * @returns {{
 *   name_similarity_score: number,   // 0–100
 *   matched_tokens: string[][],      // [[ocrToken, dbToken], ...]
 *   mismatched_tokens: string[],     // DB tokens with no acceptable OCR match
 *   reason: string                   // Human-readable verdict
 * }}
 */
export function compareNames(ocrName, storedName) {
  const ocrTokens = normalizeNameToTokens(ocrName);
  const dbTokens  = normalizeNameToTokens(storedName);

  // Edge cases
  if (ocrTokens.length === 0 || dbTokens.length === 0) {
    return {
      name_similarity_score: 0,
      matched_tokens: [],
      mismatched_tokens: dbTokens,
      reason: 'one or both names could not be parsed',
    };
  }

  const matchedTokens    = [];   // [[ocrToken, dbToken], ...]
  const mismatchedTokens = [];   // DB tokens that were NOT matched
  const usedOCRIndices   = new Set();

  // For each DB token, find the best matching OCR token
  for (const dbToken of dbTokens) {
    let bestSim   = 0;
    let bestOCRIdx = -1;

    for (let i = 0; i < ocrTokens.length; i++) {
      if (usedOCRIndices.has(i)) continue;
      const sim = charSimilarity(dbToken, ocrTokens[i]);
      if (sim > bestSim) {
        bestSim    = sim;
        bestOCRIdx = i;
      }
    }

    if (bestSim >= CONFIG.TOKEN_SIMILARITY_THRESHOLD && bestOCRIdx !== -1) {
      usedOCRIndices.add(bestOCRIdx);
      matchedTokens.push([ocrTokens[bestOCRIdx], dbToken]);
    } else {
      mismatchedTokens.push(dbToken);
    }
  }

  // --- Score calculation ---
  // Base: every DB token contributes equally to a pool of 100 points.
  // A matched token contributes its proportional share.
  // An unmatched token contributes 0 (implicit heavy penalty).
  // Additionally, we scale matched tokens by whether they were exact or partial
  // to further penalise subtle character-level corruptions.

  const totalDBTokens = dbTokens.length;
  let rawScore = 0;

  for (const [ocrToken, dbToken] of matchedTokens) {
    const tokenWeight = 100 / totalDBTokens; // equal share per DB token
    if (ocrToken === dbToken) {
      rawScore += tokenWeight; // exact match → full share
    } else {
      // Partial match: scale by actual character similarity to avoid
      // rewarding heavily corrupted tokens that still cleared the threshold.
      const sim = charSimilarity(dbToken, ocrToken);
      rawScore += tokenWeight * sim;
    }
  }

  // Penalise extra OCR tokens that have no matching DB token (garbage noise).
  // Each unmatched OCR token deducts a small fraction of the pool.
  const unmatchedOCRCount = ocrTokens.length - usedOCRIndices.size;
  const ocrNoisePenalty   = (unmatchedOCRCount / Math.max(ocrTokens.length, 1)) * 10;
  const finalScore        = Math.max(0, Math.round(rawScore - ocrNoisePenalty));

  // --- Reason string ---
  let reason;
  if (mismatchedTokens.length === 0 && unmatchedOCRCount === 0 && finalScore >= 95) {
    reason = 'exact match';
  } else if (mismatchedTokens.length === 0 && finalScore >= 80) {
    reason = 'all tokens matched with minor OCR noise';
  } else if (mismatchedTokens.length > 0) {
    reason = `token mismatch: ${mismatchedTokens.join(', ')} not found in OCR output`;
  } else {
    reason = `low similarity (score ${finalScore})`;
  }

  return {
    name_similarity_score: finalScore,
    matched_tokens: matchedTokens,
    mismatched_tokens: mismatchedTokens,
    reason,
  };
}

// ---------------------------------------------------------------------------
// Legacy adapter – keeps verifyController.js interface unchanged
// Returns the shape that verifyController currently reads:
//   { similarity: 0–1, details: { oTokens, sTokens, matched } }
// ---------------------------------------------------------------------------
export function nameSimilarity(ocrName, storedName) {
  const result = compareNames(ocrName, storedName);

  return {
    similarity: result.name_similarity_score / 100,
    details: {
      oTokens: normalizeNameToTokens(ocrName),
      sTokens: normalizeNameToTokens(storedName),
      matched: result.matched_tokens,
    },
    // Attach the rich diagnostic for downstream use
    compareResult: result,
  };
}

// ---------------------------------------------------------------------------
// Convenience helpers (kept for compatibility, not used in core path)
// ---------------------------------------------------------------------------

export function basicNormalize(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokensForName(name) {
  return normalizeNameToTokens(name);
}

export function percentSimilarity(ocrName, storedName) {
  return compareNames(ocrName, storedName).name_similarity_score;
}
