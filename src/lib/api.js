export async function postVerify(file) {
  // Mocked API: derive deterministic fields from filename
  const name = (file?.name || '').toLowerCase()
  const authentic = /(\bvalid\b|auth|degree)/.test(name) && !/invalid/.test(name)
  const riskScore = authentic ? 8 : 72
  const reasons = authentic
    ? ['Signature/hash match (simulated)', 'Issuer template structure consistent']
    : ['No registry match', 'Layout anomalies detected (simulated)', 'Potential text tamper around marks (simulated)']
  const ocrFields = {
    name: 'Ankit Sharma',
    cert_number: 'RU2021CSE01',
    marks: authentic ? 78.5 : 88.5,
    institution: 'Ranchi University',
    year: 2021,
  }
  const response = {
    status: authentic ? 'VALID' : 'SUSPICIOUS',
    score: 100 - riskScore,
    ocrFields,
    reasons,
    crypto: { hashMatch: authentic, issuer: 'Test Issuer', signature: 'base64…' },
    registryMatch: authentic,
    nextActions: authentic ? [] : ['escalate', 'request higher-res upload'],
  }
  await new Promise((r) => setTimeout(r, 900))
  return response
}
