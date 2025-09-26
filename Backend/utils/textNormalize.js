// Utility for fuzzy normalization and token similarity of names / identifiers.
// Responsibilities:
// 1. Apply common OCR character confusion corrections (0->O, 1->I, etc.)
// 2. Remove diacritics and punctuation noise
// 3. Normalize middle initials (G K J vs GOUTAM KUMAR JHA)
// 4. Provide a similarity function tolerant of initials vs full tokens.

const CHAR_CONFUSIONS = [
  // Pattern, replacement (upper-case only; we will uppercase before replacements)
  [/0/g, 'O'],
  [/1/g, 'I'], // Could also map to 'L' but choose 'I'; we'll handle lone 'I' vs 'L' later
  [/5/g, 'S'],
  [/2/g, 'Z'],
  [/6/g, 'G'],
  [/8/g, 'B'],
  [/4/g, 'A'],
];

const STOP_WORDS = new Set(['COLLEGE','INSTITUTE','UNIVERSITY','OF','THE','AND','ENGINEERING','RESEARCH','CENTRE','CENTER','TECHNOLOGY']);

// Map single-letter tokens that could be mis-read (I/L) into canonical form
// Collapse confusing single-letter variations (L->I) so that I/L mismatch does not penalize.
function normalizeInitial(token){
  if(token.length === 1){
    if(token === 'L') return 'I'; // collapse L into I
    return token;
  }
  return token;
}

export function basicNormalize(str){
  if(!str) return '';
  // Uppercase & remove diacritics
  let s = str.normalize('NFD').replace(/\p{Diacritic}/gu,'').toUpperCase();
  // Replace common OCR confusions
  for(const [pat, rep] of CHAR_CONFUSIONS){
    s = s.replace(pat, rep);
  }
  // Remove punctuation except internal apostrophes & periods (used for initials)
  s = s.replace(/[^A-Z0-9 .'']/g,' ');
  // Collapse extra spaces
  s = s.replace(/\s+/g,' ').trim();
  return s;
}

// Convert name string into filtered tokens, excluding institution stop words.
export function tokensForName(name){
  const norm = basicNormalize(name);
  const rawTokens = norm.split(' ').filter(Boolean);
  const tokens = rawTokens
    .map(t => t.replace(/\.+$/,'').trim()) // strip trailing periods in initials
    .map(normalizeInitial)
    .filter(t => t && !STOP_WORDS.has(t) && t.length > 0);
  return tokens;
}

// Specialized similarity: Jaccard + soft match for initials (e.g., G K J vs GOUTAM KUMAR JHA)
// Return similarity in [0,1] plus detail tokens and matched pairs for debugging.
export function nameSimilarity(ocrName, storedName){
  const oTokens = tokensForName(ocrName);
  const sTokens = tokensForName(storedName);
  if(oTokens.length === 0 || sTokens.length === 0) return { similarity: 0, details: { oTokens, sTokens, matched: [] }};
  const usedS = new Set();
  let matches = 0;
  const matchedPairs = [];
  for(const ot of oTokens){
    // Exact token match
    let foundIndex = sTokens.findIndex((st,i)=>!usedS.has(i) && st === ot);
    if(foundIndex === -1 && ot.length === 1){
      // Try initial match (first letter) against any unused longer token
      foundIndex = sTokens.findIndex((st,i)=>!usedS.has(i) && st.startsWith(ot));
    }
    if(foundIndex === -1 && ot.length > 1){
      // Try initial-only OCR vs full stored or vice versa
      const first = ot[0];
      foundIndex = sTokens.findIndex((st,i)=>!usedS.has(i) && (st === first || st[0] === first));
    }
    if(foundIndex !== -1){
      usedS.add(foundIndex);
      matches++;
      matchedPairs.push([ot, sTokens[foundIndex]]);
    }
  }
  const unionSize = new Set([...oTokens, ...sTokens]).size || 1;
  const jaccard = matches / unionSize;
  return { similarity: jaccard, details: { oTokens, sTokens, matched: matchedPairs } };
}

// Convenience scoring helper (not currently used directly but available)
export function percentSimilarity(ocrName, storedName){
  return Math.round(nameSimilarity(ocrName, storedName).similarity * 1000)/10; // one decimal
}
