import Tesseract from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import sharp from 'sharp';
import fs from 'fs/promises';

/**
 * Convert first page of PDF to PNG buffer
 */
async function pdfToImageBuffer(pdfPath) {
  if (!pdfPath) throw new Error('PDF path is undefined');

  const options = {
    density: 300,
    format: 'png',
    width: 1200,
    height: 1600,
    savePath: undefined, // don't save, return buffer
  };

  const storeAsImage = fromPath(pdfPath, options);
  const page1 = await storeAsImage(1);
  return Buffer.from(page1.base64, 'base64');
}

/**
 * Run OCR on uploaded certificate
 */
export async function runOCR(file) {
  if (!file) throw new Error('No file provided for OCR');
  if (process.env.DEBUG_OCR) {
    console.log('[OCR DEBUG] runOCR invoked', { name: file.name, mimetype: file.mimetype, size: file.size });
  }

  const filePath = file.tempFilePath || file.path;
  if (!filePath) throw new Error('File path is missing');

  let imageBuffer;

  if (file.mimetype === 'application/pdf') {
    imageBuffer = await pdfToImageBuffer(filePath);
  } else {
    imageBuffer = await fs.readFile(filePath);
  }

  // Enhanced preprocessing: grayscale -> normalize -> sharpen -> resize
  imageBuffer = await sharp(imageBuffer)
    .grayscale()
    .normalize() // contrast stretch
    .sharpen(1, 0.5, 1)
    .resize({ width: 1400 })
    .toBuffer();

  // Run OCR
  let text;
  try {
    const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: m => { if (process.env.DEBUG_OCR) console.log(m); }
    });
    text = data.text || '';
  } catch (e) {
    if (process.env.DEBUG_OCR) console.log('[OCR DEBUG] Tesseract error', e.message);
    throw e;
  }

  if (process.env.DEBUG_OCR) {
    const head = text.slice(0, 500).replace(/\n/g,'\\n');
    console.log('[OCR DEBUG] Initial OCR text head:', head);
  }

  // === ESSENTIAL FIELD EXTRACTION ===
  // We only need: candidateName, rollNumber, enrollmentNumber, serialNumber (optional), fatherName (optional)
  let candidateName = 'Unknown';
  let fatherName = 'Unknown';
  let serialNumber = 'Unknown';

  try {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Precompile patterns
    const nameOfCandidateRe = /Name\s+of\s+Candidate\s*[:\-]\s*([A-Z][A-Z .']{2,})/i;
    const fatherNameRe = /Father'?s\s+Name\s*[:\-]\s*([A-Z][A-Z .']{2,})/i;
    const serialRe = /S\.?\s*No\.?\s*[:\-]?\s*([A-Z0-9 ]{3,})/i;

    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+/g,' ');
      if (candidateName === 'Unknown') {
        const m = line.match(nameOfCandidateRe);
        if (m && !/UNIVERSITY|COLLEGE/i.test(m[1])) candidateName = m[1].trim();
      }
      if (fatherName === 'Unknown') {
        const m = line.match(fatherNameRe);
        if (m) fatherName = m[1].trim();
      }
      if (serialNumber === 'Unknown') {
        const m = line.match(serialRe);
        if (m) serialNumber = m[1].trim();
      }
      if (candidateName !== 'Unknown' && fatherName !== 'Unknown' && serialNumber !== 'Unknown') break;
    }

    // Fallback: previous generic pattern if still unknown
    if (candidateName === 'Unknown') {
      const generic = text.match(/(?:Candidate|Student)?\s*Name\s*[:\-]\s*([A-Z][A-Z .']{2,})/i);
      if (generic && !/UNIVERSITY|COLLEGE/i.test(generic[1])) candidateName = generic[1].trim();
    }
  } catch (e) { /* ignore */ }

  const collegeMatch = text.match(/College Name\s*[:\-]?\s*(.+)/i);
  const collegeName = collegeMatch ? collegeMatch[1].trim() : 'Unknown';

  const rollMatch = text.match(/Roll\s*No\.?\s*[:\-]?\s*([A-Z0-9]+)/i);
  let rollNumber = rollMatch ? rollMatch[1].trim() : 'Unknown';

  const enrollmentMatch = text.match(/Enrollment\s*No\.?\s*[:\-]?\s*([A-Z0-9]+)/i);
  let enrollmentNumber = enrollmentMatch ? enrollmentMatch[1].trim() : 'Unknown';
  // Minimal course parsing (not critical for DB match): capture lines after header containing multiple spaces
  const courses = [];
  try {
    const lines = text.split(/\r?\n/).map(l=>l.trim());
    const headerIdx = lines.findIndex(l => /Course\s+Code/i.test(l) && /Course\s+Title/i.test(l));
    if (headerIdx !== -1) {
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || /^Result Date/i.test(line)) break;
        // Split by 2+ spaces
        const parts = line.split(/\s{2,}/).map(p=>p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          // Heuristic: first maybe code or title; detect code by pattern with digits/hyphen
          let courseCode = ''; let title = '';
          if (/^[A-Z0-9\-]{3,}$/.test(parts[0])) { courseCode = parts[0]; title = parts[1]; }
          else { title = parts[0]; courseCode = parts[1]; }
          const grade = parts.find(p=>/^[A-D][+]*$|^A\+\+$/i.test(p)) || '';
          courses.push({ courseCode, courseTitle: title, grade });
        }
      }
    }
  } catch(e) { /* ignore course parsing errors */ }

  // We don't rely on derived percent now; leave marks unknown unless a direct percentage is found.
  let percent = undefined;
  const sgpaMatch = text.match(/SGPA\)?\)?\s*[:=]?\s*([0-9]{1,2}\.[0-9]+)/i);
  if (sgpaMatch) percent = parseFloat(sgpaMatch[1]) * 10; // rough scaling if needed

  // === Fallback lightweight token scanning for essential IDs if still Unknown ===
  const confusionMap = (raw) => {
    if (!raw) return raw;
    let r = raw.toUpperCase();
    // Replace interior Os that are surrounded by digits with 0
    r = r.replace(/(?<=\d)[OQ](?=\d)/g,'0');
    // Replace I or l between digits with 1
    r = r.replace(/(?<=\d)[IL](?=\d)/g,'1');
    // Replace S between digits with 5
    r = r.replace(/(?<=\d)S(?=\d)/g,'5');
    // Common slip: B mistaken for 8 between digits
    r = r.replace(/(?<=\d)B(?=\d)/g,'8');
    // Remove stray punctuation
    r = r.replace(/[^A-Z0-9]/g,'');
    return r;
  };

  function pickBest(current, candidate) {
    if (current && current !== 'Unknown') return current;
    if (!candidate) return current;
    if (candidate.length < 3) return current;
    return candidate;
  }

  if (rollNumber === 'Unknown' || enrollmentNumber === 'Unknown') {
    const lines = text.split(/\r?\n/);
    for (let raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      // Tolerant roll pattern capturing after colon or within line
      const rollAlt = line.match(/Roll\s*No\.?\s*[:\-]?\s*([A-Z0-9]{5,})/i);
      if (rollAlt) {
        const cand = confusionMap(rollAlt[1].toUpperCase());
        if (/^[A-Z0-9]{5,}$/.test(cand)) rollNumber = pickBest(rollNumber, cand);
      }
      const enrAlt = line.match(/Enrol+ment\s*No\.?\s*[:\-]?\s*([A-Z0-9]{5,})/i); // handles Enrollment / Enrolment
      if (enrAlt) {
        const cand = confusionMap(enrAlt[1].toUpperCase());
        if (/^[A-Z0-9]{5,}$/.test(cand)) enrollmentNumber = pickBest(enrollmentNumber, cand);
      }
      const serialAlt = line.match(/S\.?\s*No\.?\s*[:\-]?\s*([A-Z0-9 ]{3,})/i);
      if (serialAlt) serialNumber = pickBest(serialNumber, serialAlt[1].trim().replace(/\s+/g,' '));
    }
  }

  // === SECOND PASS (HEADER REGION) ===
  // If still missing critical IDs, crop header region (top ~35%), apply stronger binarization and re-run OCR with restricted whitelist.
  if (rollNumber === 'Unknown' || enrollmentNumber === 'Unknown' || serialNumber === 'Unknown') {
    try {
      const meta = await sharp(imageBuffer).metadata();
      if (meta && meta.width && meta.height) {
        const headerHeight = Math.min(meta.height, Math.round(meta.height * 0.35));
        let headerBuffer = await sharp(imageBuffer)
          .extract({ left: 0, top: 0, width: meta.width, height: headerHeight })
          .grayscale()
          .linear(1.25, -10) // boost contrast
          .normalise?.() // in some sharp versions normalise alias
          .threshold(160) // binarize
          .toBuffer();

        const headerResult = await Tesseract.recognize(headerBuffer, 'eng', {
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.- /',
          logger: m => { if (process.env.DEBUG_OCR) console.log('[OCR HEADER]', m); }
        });
        const headerText = headerResult.data.text || '';
        if (process.env.DEBUG_OCR) {
          console.log('[OCR DEBUG] Header pass text:\n', headerText);
        }
        const headerLines = headerText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
        // Normalization for label distortions (R0LL -> ROLL, ENR0LL -> ENROLL, S  . NO -> S. NO)
        function normLabelLine(l){
          return l
            .toUpperCase()
            .replace(/R0LL/g,'ROLL')
            .replace(/ENR0L{1,2}/g,'ENROLL')
            .replace(/ENR0LL/g,'ENROLL')
            .replace(/ENR0/g,'ENRO')
            .replace(/ENR0LLMENT/g,'ENROLLMENT')
            .replace(/S\s*\.?\s*NO/g,'S. NO')
            .replace(/[^A-Z0-9:./\- ]/g,' ')
            .replace(/\s+/g,' ')
            .trim();
        }
        const headerDebug = [];
        for (const raw of headerLines) {
          const line = normLabelLine(raw);
          headerDebug.push(line);
          if (rollNumber === 'Unknown') {
            const m = line.match(/ROLL\s*NO\.?\s*[:\-]?\s*([A-Z0-9]{5,})/);
            if (m) rollNumber = pickBest(rollNumber, confusionMap(m[1]));
          }
          if (enrollmentNumber === 'Unknown') {
            const m = line.match(/ENROLL?MENT?\s*NO\.?\s*[:\-]?\s*([A-Z0-9]{6,})/);
            if (m) enrollmentNumber = pickBest(enrollmentNumber, confusionMap(m[1]));
          }
          if (serialNumber === 'Unknown') {
            const m = line.match(/S\.\s*NO\.?\s*[:\-]?\s*([A-Z0-9 ]{3,})/);
            if (m) serialNumber = pickBest(serialNumber, m[1].replace(/\s+/g,''));
          }
          if (rollNumber !== 'Unknown' && enrollmentNumber !== 'Unknown' && serialNumber !== 'Unknown') break;
        }
        if (process.env.DEBUG_OCR) {
          console.log('[OCR DEBUG] Header normalized lines:', headerDebug);
          console.log('[OCR DEBUG] Extracted IDs after header pass', { rollNumber, enrollmentNumber, serialNumber });
        }
      }
    } catch(e) {
      if (process.env.DEBUG_OCR) console.log('[OCR DEBUG] Header pass error', e.message);
    }
  }

  // === UNLABELED TOKEN HEURISTIC (last resort) ===
  if ((rollNumber === 'Unknown' || enrollmentNumber === 'Unknown') && text) {
    try {
      const topSection = text.split(/\n/).slice(0, 40).join(' ');
      const rawTokens = topSection.split(/[^A-Za-z0-9]/).filter(t => t.length >= 6 && t.length <= 18);
      const candidates = rawTokens.map(t => confusionMap(t)).filter(Boolean);
      const unique = [...new Set(candidates)];
      // Score tokens
      const scored = unique.map(t => {
        const letters = (t.match(/[A-Z]/g) || []).length;
        const digits = (t.match(/\d/g) || []).length;
        const score = letters + digits + (t.startsWith('23') ? 2 : 0) + (/[CS]/.test(t) ? 1 : 0);
        return { t, letters, digits, len: t.length, score };
      }).sort((a,b)=>b.score - a.score);
      function pick(predicate){ return scored.find(predicate)?.t; }
      if (rollNumber === 'Unknown') {
        const rollCand = pick(r => r.len >= 8 && r.len <= 12 && r.digits >= 2 && r.letters >= 4);
        if (rollCand) rollNumber = rollCand;
      }
      if (enrollmentNumber === 'Unknown') {
        const enrCand = pick(r => r.len >= 12 && r.digits >= 4 && r.letters >= 5);
        if (enrCand) enrollmentNumber = enrCand;
      }
      if (process.env.DEBUG_OCR) console.log('[OCR DEBUG] Heuristic tokens', scored.slice(0,8));
    } catch(e){ if (process.env.DEBUG_OCR) console.log('[OCR DEBUG] Heuristic extraction error', e.message); }
  }

  // Final normalization once more
  if (rollNumber !== 'Unknown') rollNumber = confusionMap(rollNumber);
  if (enrollmentNumber !== 'Unknown') enrollmentNumber = confusionMap(enrollmentNumber);
  if (serialNumber !== 'Unknown') serialNumber = confusionMap(serialNumber);

  if (process.env.DEBUG_OCR) {
    try {
      console.log('[OCR DEBUG] Final IDs', { rollNumber, enrollmentNumber, serialNumber, candidateName });
    } catch(_) { /* ignore */ }
  }

  // === Post-correction heuristics ===
  function correctEnrollment(raw) {
    if (!raw || raw === 'Unknown') return raw;
    let v = raw;
    // Ensure starts with 23 (year) if we have 2 and next is E (misread of 23E -> 2E)
    if (/^2E/.test(v)) v = '23' + v.slice(1); // 2E -> 23E
    // Normalize CCS cluster: replace IC C S variants (I misread 1, etc.)
    v = v.replace(/ICCSM/i,'JCCSM'); // if I for J leading confusion
    // Convert MASP to M4SP or similar corrections? Keep minimal until we inspect more samples.
    // Replace MASPIB S -> MASP1989 like pattern if digits missing - not enough context so skip heavy rewrite.
    return v;
  }
  function correctRoll(raw) {
    if (!raw || raw === 'Unknown') return raw;
    let v = raw;
    if (/^2E/.test(v)) v = '23' + v.slice(1);
    return v;
  }
  const correctedEnrollmentNumber = correctEnrollment(enrollmentNumber);
  const correctedRollNumber = correctRoll(rollNumber);

  return {
    candidateName,
    fatherName,
    serialNumber,
    normalizedCandidateName: candidateName,
    collegeName,
  rollNumber,
  enrollmentNumber,
  correctedRollNumber,
  correctedEnrollmentNumber,
    courses,
    fullText: text,
  passes: { initial: true, header: (rollNumber !== 'Unknown' || enrollmentNumber !== 'Unknown' || serialNumber !== 'Unknown') },
    certId: serialNumber || 'Unknown',
    marks: percent,
    maxMarks: 100,
    sealPosition: { x: 0.35, y: 0.85 },
    templateSeal: { x: 0.30, y: 0.80 },
    createdWith: 'Unknown'
  };
}
