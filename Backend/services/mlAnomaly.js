import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Extract feature vector from certificate + student + derived info.
export function buildFeatureVector({ cert, student }) {
  const marks = typeof cert?.marksPercent === 'number' ? cert.marksPercent : 0;
  const issueYear = cert?.issueDate ? new Date(cert.issueDate).getFullYear() : 0;
  const certNoLength = (cert?.certNo || '').length;
  const nameLength = (student?.name || '').length;
  const roll = student?.rollNo || '';
  const upperRatio = roll ? [...roll].filter(c=>c>='A'&&c<='Z').length / roll.length : 0;
  const digitRatio = roll ? [...roll].filter(c=>c>='0'&&c<='9').length / roll.length : 0;
  const rollPatternScore = (upperRatio + digitRatio) / 2; // heuristic
  return [marks, issueYear, certNoLength, nameLength, rollPatternScore];
}

export async function scoreAnomaly(featureVector) {
  const base = path.join(process.cwd(),'Backend','ml');
  const tfModel = path.join(base,'model.h5');
  const isoModel = path.join(base,'model.pkl');
  let script;
  if (fs.existsSync(tfModel)) script = 'score_tf.py';
  else if (fs.existsSync(isoModel)) script = 'score.py';
  else return { anomalyScore: 0, missingModel: true };
  const py = spawn('python', [path.join('Backend','ml', script)]);
  const payload = JSON.stringify({ features: featureVector });
  return await new Promise((resolve, reject) => {
    let out=''; let err='';
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
      } catch(e){
        resolve({ anomalyScore: 0, error: 'parse error', raw: out });
      }
    });
    py.stdin.write(payload);
    py.stdin.end();
  });
}
