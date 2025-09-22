import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Student from '../models/Student.js';
import Certificate from '../models/Certificate.js';
import VerificationLog from '../models/VerificationLog.js';
import crypto from 'crypto';
import { generatePdfReport } from './pdfReport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_DIR = path.resolve(__dirname, '../../python');

let PY_CMD = null;
function parseCmdString(cmdString) {
  const parts = cmdString.trim().split(/\s+/);
  return { cmd: parts[0], args: parts.slice(1) };
}

function detectPython() {
  if (PY_CMD) return PY_CMD;
  const envCmd = process.env.PYTHON_EXECUTABLE;
  const candidates = [];
  if (envCmd) candidates.push(parseCmdString(envCmd));
  // Common candidates on Windows and cross-platform
  candidates.push(
    { cmd: 'python', args: [] },
    { cmd: 'py', args: ['-3'] },
    { cmd: 'py', args: [] },
    { cmd: 'python3', args: [] }
  );
  for (const c of candidates) {
    try {
      const res = spawnSync(c.cmd, [...c.args, '--version'], { encoding: 'utf8' });
      if (res.status === 0 || (res.stdout || res.stderr)) {
        PY_CMD = c; // cache
        return PY_CMD;
      }
    } catch (_) {
      // try next
    }
  }
  // Fallback to 'python'
  PY_CMD = { cmd: 'python', args: [] };
  return PY_CMD;
}

function runPython(script, args = []) {
  return new Promise((resolve, reject) => {
    const pyCmd = detectPython();
    const py = spawn(pyCmd.cmd, [...pyCmd.args, script, ...args], { cwd: PYTHON_DIR });
    let out = '';
    let err = '';
    py.stdout.on('data', (d) => (out += d.toString()));
    py.stderr.on('data', (d) => (err += d.toString()));
    py.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `Python exited ${code}`));
      try {
        resolve(JSON.parse(out));
      } catch (e) {
        reject(new Error('Invalid JSON from Python: ' + out));
      }
    });
  });
}

function scoreFromSignals(signals) {
  let score = 0;
  const weights = {
    registry: 0.5,
    template: 0.15,
    seal: 0.1,
    ela: 0.1,
    metadata: 0.05,
    hash: 0.1,
  };

  Object.entries(weights).forEach(([key, w]) => {
    score += (signals[key]?.score ?? 0) * w;
  });
  return Math.round(score);
}

function statusFromScore(score, registryMatch, hashMatch) {
  if (score >= 85 && (registryMatch || hashMatch)) return 'VERIFIED';
  if (score < 60) return 'LIKELY_FAKE';
  return 'SUSPICIOUS';
}

export async function runVerification({ filePath }) {
  if (!fs.existsSync(PYTHON_DIR)) fs.mkdirSync(PYTHON_DIR, { recursive: true });

  const ocr = await runPython('ocr.py', [filePath]);

  const certNo = ocr.fields.certNo || ocr.fields.certificateNumber || '';
  const roll = ocr.fields.rollNo || ocr.fields.roll || '';

  let registry = { match: false, suspicion: false, student: null, certificate: null };
  if (certNo) {
    registry.certificate = await Certificate.findOne({ certNo }).populate('studentId').lean();
    if (registry.certificate) {
      registry.match = true;
      registry.student = registry.certificate.studentId;
    } else if (roll) {
      registry.student = await Student.findOne({ rollNo: roll }).lean();
      if (registry.student) registry.suspicion = true;
    }
  }

  const forgery = await runPython('forgery.py', [filePath]);

  const fileBuffer = fs.readFileSync(filePath);
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const hashMatch = registry.certificate?.certificateHash === fileHash;

  const signals = {
    registry: { score: registry.match ? 100 : registry.suspicion ? 50 : 0, details: registry },
    template: { score: Math.round((forgery.templateSSIM || 0) * 100) },
    seal: { score: Math.round((forgery.sealMatch || 0) * 100) },
    ela: { score: Math.round((forgery.elaAnomaly || 0) * 100) },
    metadata: { score: Math.round((forgery.metadataScore || 0) * 100) },
    hash: { score: hashMatch ? 100 : 0, value: fileHash },
  };

  const score = scoreFromSignals(signals);
  const status = statusFromScore(score, registry.match, hashMatch);

  const reportJson = {
    id: crypto.randomUUID(),
    status,
    score,
    data: {
      name: ocr.fields.name,
      rollNo: roll,
      certNo,
      marksPercent: ocr.fields.marksPercent,
      institution: ocr.fields.institution,
      year: ocr.fields.year,
    },
    signals,
    ocrText: ocr.text || '',
  };

  const { id, pdfPath } = await generatePdfReport(reportJson);

  const log = await VerificationLog.create({
    certNo,
    status,
    score,
    reasons: Object.entries(signals)
      .map(([k, v]) => `${k}:${v.score}`),
    reportPath: pdfPath,
  });

  return { ok: true, id, status, score, report: reportJson, pdf: `/api/reports/${id}`, logId: log._id };
}
