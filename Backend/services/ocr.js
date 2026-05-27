import Tesseract from 'tesseract.js';
import { fromPath } from 'pdf2pic';
import sharp from 'sharp';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

/**
 * Convert first page of PDF to PNG buffer
 */
async function pdfToImageBuffer(pdfPath) {
  if (!pdfPath) throw new Error('PDF path is undefined');

  // pdf2pic requires a real savePath directory — use os.tmpdir()
  const savePath = os.tmpdir();
  const options = {
    density: 300,
    format: 'png',
    width: 1200,
    height: 1600,
    savePath,
  };

  const storeAsImage = fromPath(pdfPath, options);
  const page1 = await storeAsImage(1);

  // page1.base64 is populated when no savePath was given in older versions;
  // newer versions write to disk and return page1.path instead.
  if (page1.base64) {
    return Buffer.from(page1.base64, 'base64');
  }
  if (page1.path) {
    const buf = await fs.readFile(page1.path);
    // clean up temp file (best-effort)
    fs.unlink(page1.path).catch(() => {});
    return buf;
  }
  throw new Error('pdf2pic did not return base64 or path for page 1');
}

/**
 * Run OCR on uploaded certificate
 */
export async function runOCR(file) {
  if (!file) throw new Error('No file provided for OCR');
  if (process.env.DEBUG_OCR) {
    console.log('[OCR DEBUG] runOCR invoked', { name: file.name, mimetype: file.mimetype, size: file.size });
  }

  // ── STAGE 1: File received ────────────────────────────────────────────────
  console.log('[VERIFY-DEBUG] STAGE 1 — file received:', {
    name:     file.name,
    mimetype: file.mimetype,
    size:     file.size,
  });

  const filePath = file.tempFilePath || file.path;
  console.log('[VERIFY-DEBUG] STAGE 1 — resolved filePath:', filePath);
  if (!filePath) throw new Error('File path is missing');

  // ── STAGE 2: File type detection ─────────────────────────────────────────
  let imageBuffer;

  if (file.mimetype === 'application/pdf') {
    console.log('[VERIFY-DEBUG] STAGE 2 — detected PDF, converting to image buffer via pdf2pic');
    imageBuffer = await pdfToImageBuffer(filePath);
    console.log('[VERIFY-DEBUG] STAGE 2 — PDF→image buffer size:', imageBuffer.length, 'bytes');
  } else {
    console.log('[VERIFY-DEBUG] STAGE 2 — detected IMAGE, reading raw file buffer');
    imageBuffer = await fs.readFile(filePath);
    console.log('[VERIFY-DEBUG] STAGE 2 — image buffer size:', imageBuffer.length, 'bytes');
  }

  // ── STAGE 3: Preprocessing ───────────────────────────────────────────────
  console.log('[VERIFY-DEBUG] STAGE 3 — starting sharp preprocessing...');
  try {
    const preprocessed = await sharp(imageBuffer)
      .grayscale()
      .normalize()         // contrast stretch
      .sharpen(1, 0.5, 1)
      .resize({ width: 1400 })
      .toBuffer();
    // Only use preprocessed result if it is non-trivially sized
    if (preprocessed && preprocessed.length > 1024) {
      imageBuffer = preprocessed;
      console.log('[VERIFY-DEBUG] STAGE 3 — preprocessing OK, buffer size:', imageBuffer.length, 'bytes');
    } else {
      console.log('[VERIFY-DEBUG] STAGE 3 — preprocessed buffer too small, keeping original');
    }
  } catch (sharpErr) {
    console.log('[VERIFY-DEBUG] STAGE 3 — preprocessing FAILED:', sharpErr.message, '— using original buffer');
    // imageBuffer stays as-is (original)
  }

  // ── STAGE 4: OCR execution ───────────────────────────────────────────────
  console.log('[VERIFY-DEBUG] STAGE 4 — starting Tesseract OCR...');
  let text;
  try {
    const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: m => { if (process.env.DEBUG_OCR) console.log(m); }
    });
    text = data.text || '';
    console.log('[VERIFY-DEBUG] STAGE 4 — OCR complete. Text length:', text.length, 'chars');
    console.log('[VERIFY-DEBUG] STAGE 4 — First 500 chars of OCR output:\n' + text.slice(0, 500).replace(/\n/g, '\\n'));
  } catch (e) {
    console.log('[VERIFY-DEBUG] STAGE 4 — Tesseract FAILED:', e.message);
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

  // Helper to normalize a probable person name (collapse spaces, strip trailing label fragments)
  function cleanName(raw) {
    if (!raw) return raw;
    return raw
      .replace(/\b(FATHER'?S|MOTHER'?S)\b.*$/i,'') // remove if a second label bled in
      .replace(/[^A-Z .'\-]/gi,' ') // keep letters & common punctuation
      .replace(/\s+/g,' ') // collapse spaces
      .trim()
      .toUpperCase();
  }

  // Early broad extraction (handles cases where Name and Father's Name share a line):
  // e.g. "Name : GOUTAM KUMAR JHA  Father's Name : SATYENDRA JHA"
  try {
    const jointNameLine = text.match(/Name\s*:\s*([^\n]+?)(?:Father'?s\s+Name|Roll\s*No|Enrollment\s*No|College\s*Name|$)/i);
    if (jointNameLine) {
      const possible = cleanName(jointNameLine[1]);
      if (possible && possible.length >= 3) candidateName = possible;
    }
    const jointFatherLine = text.match(/Father'?s\s+Name\s*:\s*([^\n]+?)(?:Name|Roll\s*No|Enrollment\s*No|College\s*Name|$)/i);
    if (jointFatherLine) {
      const fpos = cleanName(jointFatherLine[1]);
      if (fpos && fpos.length >= 3) fatherName = fpos;
    }
  } catch(_) { /* ignore */ }

  try {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Precompile patterns
    const nameOfCandidateRe = /Name\s+of\s+Candidate\s*[:\-]\s*([A-Z][A-Z .']{2,})/i;
    const fatherNameRe = /Father'?s\s+Name\s*[:\-]\s*([A-Z][A-Z .']{2,})/i;
    const serialRe = /S\.?\s*No\.?\s*[:\-]?\s*([A-Z0-9 ]{3,})/i;

    for (const rawLine of lines) {
      const line = rawLine.replace(/\s+/g,' ');
      if (candidateName === 'Unknown') {
        // Dedicated simple label on its own line: "Name : <value>"
        const simpleName = line.match(/^Name\s*[:\-]\s*([A-Z][A-Z .']{2,})$/i);
        if (simpleName && !/UNIVERSITY|COLLEGE/i.test(simpleName[1])) {
          candidateName = cleanName(simpleName[1]);
        } else {
          const m = line.match(nameOfCandidateRe);
          if (m && !/UNIVERSITY|COLLEGE/i.test(m[1])) candidateName = cleanName(m[1]);
        }
      }
      if (fatherName === 'Unknown') {
        const simpleFather = line.match(/^Father'?s\s+Name\s*[:\-]\s*([A-Z][A-Z .']{2,})$/i);
        if (simpleFather) fatherName = cleanName(simpleFather[1]);
        else {
          const m = line.match(fatherNameRe);
          if (m) fatherName = cleanName(m[1]);
        }
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
      if (generic && !/UNIVERSITY|COLLEGE/i.test(generic[1])) candidateName = cleanName(generic[1]);
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
    // ── digit-surrounded character fixes ──────────────────────────────────
    // O/Q → 0 between digits
    r = r.replace(/(?<=\d)[OQ](?=\d)/g,'0');
    // I/l → 1 between digits
    r = r.replace(/(?<=\d)[IL](?=\d)/g,'1');
    // S → 5 between digits
    r = r.replace(/(?<=\d)S(?=\d)/g,'5');
    // B → 8 between digits
    r = r.replace(/(?<=\d)B(?=\d)/g,'8');
    // ── RTU-specific photo OCR fixes ───────────────────────────────────────
    // RTU IDs always start with 2-digit year then E (e.g. 23E...).
    // Camera photos commonly misread E → F at that position.
    r = r.replace(/^(2\d)F([JC1I])/, '$1E$2');  // 23FJCCS → 23EJCCS
    // J misread as I at start of branch code (after year+E)
    r = r.replace(/^(2\dE)I([A-Z])/, '$1J$2');  // 23EICCS → 23EJCCS
    // Remove stray punctuation (keep alphanumerics only)
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

      // ── Roll No — tolerant pattern (also handles "Roll No." with dot) ──────
      const rollAlt = line.match(/Roll\s*No\.?\s*[:\-]?\s*([A-Z0-9]{5,})/i);
      if (rollAlt) {
        const cand = confusionMap(rollAlt[1].toUpperCase());
        if (/^[A-Z0-9]{5,}$/.test(cand)) rollNumber = pickBest(rollNumber, cand);
      }

      // ── Enrollment — handle SAME LINE layout: "Roll No ... Enrollment No ..." ─
      // In the photographed RTU format, both IDs are on the same line.
      // The regex below searches anywhere on the line, not just at start.
      const enrAlt = line.match(/Enrol+ment\s*No\.?\s*[:\-]?\s*([A-Z0-9]{6,})/i);
      if (enrAlt) {
        const cand = confusionMap(enrAlt[1].toUpperCase());
        if (/^[A-Z0-9]{6,}$/.test(cand)) enrollmentNumber = pickBest(enrollmentNumber, cand);
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
        // Crop the TOP 22% — that's where Roll No / Enrollment No live in RTU layout.
        // Using 22% instead of 35% avoids the watermark stamp which sits in the middle.
        const headerHeight = Math.min(meta.height, Math.round(meta.height * 0.22));
        let headerBuffer = await sharp(imageBuffer)
          .extract({ left: 0, top: 0, width: meta.width, height: headerHeight })
          .grayscale()
          .linear(1.5, -20)   // stronger contrast boost for photo tint
          .normalise()         // stretch histogram fully
          .threshold(140)      // slightly lower threshold → preserve thin strokes
          .toBuffer();

        const headerResult = await Tesseract.recognize(headerBuffer, 'eng', {
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.- /',
          logger: m => { if (process.env.DEBUG_OCR) console.log('[OCR HEADER]', m); }
        });
        const headerText = headerResult.data.text || '';
        // Always log header pass text so failures are visible without DEBUG_OCR
        console.log('[VERIFY-DEBUG] HEADER PASS text:', headerText.replace(/\n/g,'\\n').slice(0, 400));

        const headerLines = headerText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
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
            // Tolerate dot after No (Roll No. vs Roll No)
            const m = line.match(/ROLL\s*NO\.?\s*[:\-]?\s*([A-Z0-9]{4,})/);
            if (m) rollNumber = pickBest(rollNumber, confusionMap(m[1]));
          }
          if (enrollmentNumber === 'Unknown') {
            // Match both "Enrollment No" and "Enrolment No" with optional dot
            const m = line.match(/ENROLL?MENT?\.?\s*NO\.?\s*[:\-]?\s*([A-Z0-9]{6,})/);
            if (m) enrollmentNumber = pickBest(enrollmentNumber, confusionMap(m[1]));
          }
          if (serialNumber === 'Unknown') {
            const m = line.match(/S\.\s*NO\.?\s*[:\-]?\s*([A-Z0-9 ]{3,})/);
            if (m) serialNumber = pickBest(serialNumber, m[1].replace(/\s+/g,''));
          }
          if (rollNumber !== 'Unknown' && enrollmentNumber !== 'Unknown' && serialNumber !== 'Unknown') break;
        }
        console.log('[VERIFY-DEBUG] HEADER PASS extracted:', { rollNumber, enrollmentNumber, serialNumber });
      }
    } catch(e) {
      console.log('[VERIFY-DEBUG] Header pass error:', e.message);
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

  // ── STAGE 5: Extracted fields ───────────────────────────────────────────────
  const extractedFields = {
    candidateName,
    fatherName,
    serialNumber,
    rollNumber,
    correctedRollNumber,
    enrollmentNumber,
    correctedEnrollmentNumber,
    collegeName,
  };
  console.log('[VERIFY-DEBUG] STAGE 5 — extracted fields:', JSON.stringify(extractedFields, null, 2));

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
