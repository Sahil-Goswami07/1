/**
 * tests/nameMatching.test.js
 *
 * Unit tests for the strict name comparison function.
 * Run with:  node ./tests/nameMatching.test.js
 *
 * No external test runner required.
 */

import { compareNames } from '../utils/textNormalize.js';

// ---------------------------------------------------------------------------
// Minimal assertion helper
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}`);
    failed++;
  }
}

function describe(title, fn) {
  console.log(`\n── ${title}`);
  fn();
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe('Exact match', () => {
  const r = compareNames('GOUTAM KUMAR JHA', 'GOUTAM KUMAR JHA');
  assert(r.name_similarity_score >= 95,         'score ≥ 95');
  assert(r.mismatched_tokens.length === 0,       'no mismatched tokens');
  assert(r.matched_tokens.length === 3,          '3 tokens matched');
  assert(r.reason === 'exact match',             'reason is "exact match"');
});

describe('Key forged token: GOTM vs GOUTAM', () => {
  const r = compareNames('GOTM KUMAR JHA', 'GOUTAM KUMAR JHA');
  console.log('    score:', r.name_similarity_score, '| reason:', r.reason);
  assert(r.name_similarity_score < 70,           'score < 70 (flagged as bad)');
  assert(r.mismatched_tokens.includes('GOUTAM'), 'GOUTAM in mismatched_tokens');
  assert(r.reason.includes('token mismatch'),    'reason mentions token mismatch');
});

describe('Minor OCR noise (truly 1-character typo: KUMARR)', () => {
  // KUMARR = KUMAR + 1 extra char → Levenshtein 1 → similarity 0.83.
  // This is close to the threshold; the strict matcher flags it as mismatch (correct).
  // To pass name matching you need 0.85+. This proves the threshold is working.
  const r = compareNames('GOUTAM KUMARR JHA', 'GOUTAM KUMAR JHA');
  console.log('    score:', r.name_similarity_score, '| reason:', r.reason);
  // KUMARR (len 6) vs KUMAR (len 5): dist=1, sim=1-1/6=0.833 → below 0.85 → mismatch
  // Score will be 67 (2/3 tokens matched). This is intentional strict behavior.
  assert(r.name_similarity_score >= 55,    'score ≥ 55 (two tokens still match)');
  assert(r.name_similarity_score < 95,    'score < 95 (not exact)');
});

describe('Completely different name', () => {
  const r = compareNames('RAHUL Singh', 'GOUTAM KUMAR JHA');
  console.log('    score:', r.name_similarity_score, '| reason:', r.reason);
  assert(r.name_similarity_score < 30,            'score < 30');
  assert(r.mismatched_tokens.length >= 2,         'two or more tokens mismatched');
});

describe('OCR initials only (G K J  vs GOUTAM KUMAR JHA)', () => {
  // Initials are very short – they will not reach 0.85 similarity against full names.
  // This is intentional: initials alone should NOT pass the strict threshold.
  const r = compareNames('G K J', 'GOUTAM KUMAR JHA');
  console.log('    score:', r.name_similarity_score, '| matched:', r.matched_tokens, '| mismatched:', r.mismatched_tokens);
  assert(r.name_similarity_score < 92, 'score < 92 (initials should not get full credit)');
});

describe('Name with OCR digit confusion (G0UTAM = GOUTAM with 0->O)', () => {
  const r = compareNames('G0UTAM KUMAR JHA', 'GOUTAM KUMAR JHA');
  console.log('    score:', r.name_similarity_score, '| reason:', r.reason);
  // After correction 0→O gives "GOUTAM" → should match exactly
  assert(r.name_similarity_score >= 90, 'score ≥ 90 after OCR correction');
});

describe('Missing middle token', () => {
  const r = compareNames('GOUTAM JHA', 'GOUTAM KUMAR JHA');
  console.log('    score:', r.name_similarity_score, '| mismatched:', r.mismatched_tokens);
  assert(r.name_similarity_score < 92,             'score < 92 (missing token penalised)');
  assert(r.mismatched_tokens.includes('KUMAR'),    'KUMAR in mismatched_tokens');
});

describe('Extra OCR garbage tokens', () => {
  const r = compareNames('GOUTAM KUMAR JHA XXYZ', 'GOUTAM KUMAR JHA');
  console.log('    score:', r.name_similarity_score);
  assert(r.name_similarity_score >= 80,            'Still high but penalised for noise');
  assert(r.name_similarity_score < 100,            'Not perfect due to extra token');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n══ Results: ${passed} passed, ${failed} failed ══\n`);
if (failed > 0) process.exit(1);
