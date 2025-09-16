import { useState } from 'react'
import { postVerify } from '../lib/api'

export default function Verifier() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | running | done
  const [result, setResult] = useState(null) // extended result

  const onValidate = async () => {
    if (!file) return
    setStatus('running')
    setResult(null)
    try {
      const res = await postVerify(file)
      const verdict = res.status === 'VALID' ? 'authentic' : res.status.toLowerCase()
      setResult({ ...res, verdict })
      setStatus('done')
    } catch (e) {
      setResult({ verdict: 'error', details: 'Verification failed. Please try again.' })
      setStatus('done')
    }
  }

  return (
    <section id="verify" className="py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Verify Certificate</h2>
          <p className="mt-1 text-slate-600 text-sm">Upload a certificate PDF/image to validate instantly.</p>
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label htmlFor="cert-file" className="sr-only">Certificate file</label>
            <input
              id="cert-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 file:font-medium hover:file:bg-blue-100"
            />
            <button
              onClick={onValidate}
              disabled={!file || status === 'running'}
              className="inline-flex items-center justify-center rounded-lg text-white px-5 py-2.5 font-semibold shadow-sm disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {status === 'running' ? 'Validating…' : 'Validate'}
            </button>
          </div>
          {status !== 'idle' && (
            <div className="mt-5" aria-live="polite" role="status">
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
                <div className={`rounded-xl p-4 ring-1 ${result.verdict === 'authentic' ? 'bg-green-50 ring-green-200' : result.verdict === 'error' ? 'bg-amber-50 ring-amber-200' : 'bg-rose-50 ring-rose-200'}`}>
                  <div className="flex items-start gap-3">
                    {result.verdict === 'authentic' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 text-green-600" fill="currentColor"><path d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20.3 7.7l-1.4-1.4z"/></svg>
                    ) : result.verdict === 'error' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 text-amber-600" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v2h2v-2zm0-6h-2v4h2v-4z"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 text-rose-600" fill="currentColor"><path d="M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>
                    )}
                    <div>
                      <p className={`font-semibold ${result.verdict === 'authentic' ? 'text-green-800' : result.verdict === 'error' ? 'text-amber-800' : 'text-rose-800'}`}>
                        {result.verdict === 'authentic' ? 'Authentic' : result.verdict === 'error' ? 'Error' : (result.status || 'Invalid')}
                      </p>
                      {result.details && <p className="text-sm mt-1 text-slate-700">{result.details}</p>}
                      {result.ocrFields && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-slate-500">Name:</span> {result.ocrFields.name}</div>
                          <div><span className="text-slate-500">Cert #:</span> {result.ocrFields.cert_number}</div>
                          <div><span className="text-slate-500">Marks:</span> {result.ocrFields.marks}</div>
                          <div><span className="text-slate-500">Institution:</span> {result.ocrFields.institution}</div>
                          <div><span className="text-slate-500">Year:</span> {result.ocrFields.year}</div>
                        </div>
                      )}
                      {typeof result.score === 'number' && (
                        <div className="mt-3">
                          <div className="text-sm text-slate-500">Confidence Score</div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full" style={{ width: `${result.score}%`, backgroundColor: 'var(--secondary)' }} />
                          </div>
                        </div>
                      )}
                      {Array.isArray(result.reasons) && result.reasons.length > 0 && (
                        <ul className="mt-3 text-sm text-slate-700 list-disc pl-5">
                          {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                      {'registryMatch' in (result || {}) && (
                        <p className="mt-3 text-sm"><span className="font-medium">Registry Match:</span> {result.registryMatch ? 'Yes' : 'No'}</p>
                      )}
                      <button className="mt-3 inline-flex items-center rounded-md px-3 py-1.5 text-sm ring-1 ring-slate-300 text-slate-700 cursor-not-allowed" disabled>
                        Download Report (demo)
                      </button>
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
