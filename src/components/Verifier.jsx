import { useState } from 'react'

export default function Verifier() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | running | done
  const [result, setResult] = useState(null) // { verdict: 'authentic'|'invalid', details: string }

  const onValidate = async () => {
    if (!file) return
    setStatus('running')
    setResult(null)
    // Simulate AI+Blockchain+DB validation delay
    await new Promise((r) => setTimeout(r, 1200))
    // Simple deterministic rule: if filename contains 'valid', mark authentic
    const name = file.name.toLowerCase()
    const authentic = name.includes('valid') || name.includes('auth') || name.includes('degree')
    setResult({
      verdict: authentic ? 'authentic' : 'invalid',
      details: authentic
        ? 'Signature and hashes matched with blockchain anchors and university records.'
        : 'No matching records found. The document appears altered or unregistered.',
    })
    setStatus('done')
  }

  return (
    <section id="verify" className="py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Verify Certificate</h2>
          <p className="mt-1 text-slate-600 text-sm">Upload a certificate PDF/image to validate instantly.</p>
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
            />
            <button
              onClick={onValidate}
              disabled={!file || status === 'running'}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-5 py-2.5 font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {status === 'running' ? 'Validating…' : 'Validate'}
            </button>
          </div>
          {status !== 'idle' && (
            <div className="mt-5">
              {status === 'running' && (
                <div className="flex items-center gap-3 text-slate-700">
                  <svg className="h-5 w-5 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Running AI + Blockchain validation…
                </div>
              )}
              {status === 'done' && result && (
                <div className={`rounded-xl p-4 ring-1 ${result.verdict === 'authentic' ? 'bg-green-50 ring-green-200' : 'bg-rose-50 ring-rose-200'}`}>
                  <div className="flex items-start gap-3">
                    {result.verdict === 'authentic' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="currentColor"><path d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20.3 7.7l-1.4-1.4z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 text-rose-600" fill="currentColor"><path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>
                    )}
                    <div>
                      <p className={`font-semibold ${result.verdict === 'authentic' ? 'text-green-800' : 'text-rose-800'}`}>
                        {result.verdict === 'authentic' ? 'Authentic' : 'Invalid'}
                      </p>
                      <p className="text-sm mt-1 text-slate-700">{result.details}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
