// backend/services/anomaly.js
export async function anomalyCheck(extractedData, imageMeta) {
  let score = 0;
  const reasons = [];

  // Rule 1: Marks exceed maximum
  if (extractedData.marks > extractedData.maxMarks) {
    score += 0.4;
    reasons.push('Marks exceed maximum');
  }

  // Rule 2: Seal position deviation
  const dx = Math.abs(extractedData.sealPosition.x - extractedData.templateSeal.x);
  const dy = Math.abs(extractedData.sealPosition.y - extractedData.templateSeal.y);
  if (dx > 0.05 || dy > 0.05) {
    score += 0.3;
    reasons.push('Seal location unusual');
  }

  // Rule 3: Suspicious editing software
  const createdWith = imageMeta.createdWith || imageMeta.producer || '';
  if (createdWith.toLowerCase().includes('photoshop')) {
    score += 0.3;
    reasons.push('Metadata shows Photoshop editing');
  }

  if (score > 1) score = 1;

  let status = 'Authentic';
  if (score >= 0.7)      status = 'Likely Forged';
  else if (score >= 0.3) status = 'Suspicious';

  return { status, score, reasons };
}
