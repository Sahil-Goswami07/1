import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract feature vector from certificate + student + derived info.
export function buildFeatureVector({ cert, student, logoSimilarity = 1.0, sealSimilarity = 1.0, metadataRisk = 0.0, tamperingScore = 0.0, layoutSimilarity = 1.0, qrScore = 1.0 }) {
  const marks = typeof cert?.marksPercent === 'number' ? cert.marksPercent : 0;
  const issueYear = cert?.issueDate ? new Date(cert.issueDate).getFullYear() : 0;
  const certNoLength = (cert?.certNo || '').length;
  const nameLength = (student?.name || '').length;
  const roll = student?.rollNo || '';
  const upperRatio = roll ? [...roll].filter(c=>c>='A'&&c<='Z').length / roll.length : 0;
  const digitRatio = roll ? [...roll].filter(c=>c>='0'&&c<='9').length / roll.length : 0;
  const rollPatternScore = (upperRatio + digitRatio) / 2; // heuristic
  return [
    marks,
    issueYear,
    certNoLength,
    nameLength,
    rollPatternScore,
    logoSimilarity,
    sealSimilarity,
    metadataRisk,
    tamperingScore,
    layoutSimilarity,
    qrScore
  ];
}

export async function scoreAnomaly(featureVector) {
  // ml folder is adjacent to services folder: ../ml
  const base = path.join(__dirname, '..', 'ml');
  const tfModel = path.join(base, 'model.h5');
  const isoModel = path.join(base, 'model.pkl');
  let script;
  if (fs.existsSync(tfModel)) script = 'score_tf.py';
  else if (fs.existsSync(isoModel)) script = 'score.py';
  else return { anomalyScore: 0, missingModel: true };

  const scriptPath = path.join(base, script);
  const payload = JSON.stringify({ features: featureVector });

  const runSpawn = (cmd) => {
    return new Promise((resolve, reject) => {
      const py = spawn(cmd, [scriptPath]);
      let out = '';
      let err = '';
      py.stdout.on('data', d => out += d.toString());
      py.stderr.on('data', d => err += d.toString());
      py.on('error', reject);
      py.on('close', code => {
        if (code !== 0) {
          return resolve({ anomalyScore: 0, error: err || out, code });
        }
        try {
          const parsed = JSON.parse(out.trim());
          resolve(parsed);
        } catch (e) {
          resolve({ anomalyScore: 0, error: 'parse error', raw: out });
        }
      });
      py.stdin.write(payload);
      py.stdin.end();
    });
  };

  try {
    if (process.platform === 'win32') {
      try {
        const res = await runSpawn('py');
        // If it returned successfully or has a real application-level error (not launcher missing/not found)
        if (!res.error || (!res.error.includes('Python was not found') && !res.error.includes('not recognized'))) {
          return res;
        }
      } catch (winErr) {
        // Fall back to standard 'python'
      }
    }
    return await runSpawn('python');
  } catch (err) {
    if (err.code === 'ENOENT') {
      try {
        return await runSpawn('py');
      } catch (err2) {
        return { anomalyScore: 0, error: `Python execution failed: ${err2.message}` };
      }
    }
    return { anomalyScore: 0, error: `Python execution failed: ${err.message}` };
  }
}
