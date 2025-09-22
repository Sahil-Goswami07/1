export async function postVerify(file) {
  const form = new FormData()
  form.append('file', file)
  try {
    const res = await fetch('/api/verify', { method: 'POST', body: form })
    if (!res.ok) throw new Error('Verification failed')
    const data = await res.json()
    return data
  } catch (e) {
    if (import.meta.env?.VITE_ENABLE_MOCK === 'true') {
      // Optional mock only when explicitly enabled
      const name = (file?.name || '').toLowerCase()
      const authentic = /(\bvalid\b|auth|degree)/.test(name) && !/invalid/.test(name)
      const riskScore = authentic ? 8 : 72
      const reasons = authentic
        ? ['Signature/hash match (simulated)', 'Issuer template structure consistent']
        : ['No registry match', 'Layout anomalies detected (simulated)', 'Potential text tamper around marks (simulated)']
      const ocrFields = {
        name: 'Mock User',
        cert_number: 'DEMO1234',
        marks: authentic ? 78.5 : 88.5,
        institution: 'Demo University',
        year: 2021,
      }
      await new Promise((r) => setTimeout(r, 300))
      return {
        ok: true,
        id: 'mock',
        status: authentic ? 'VERIFIED' : 'SUSPICIOUS',
        score: 100 - riskScore,
        report: { data: { ...ocrFields } },
        pdf: '#',
        reasons,
      }
    }
    throw e
  }
}
