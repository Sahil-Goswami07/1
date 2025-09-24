import { useMemo } from 'react'
import { site } from '../config/site'
import CertificateUpload from '../components/certificateUpload'

function MobileFallback() {
  const mf = site.demo.mobileFallback
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="font-medium text-slate-900">Low-bandwidth option</p>
      <p className="text-sm text-slate-700 mt-1">{mf.instructions}</p>
      <p className="text-xs text-slate-500 mt-1">{mf.note}</p>
    </div>
  )
}

export default function Demo() {
  const tips = useMemo(() => ([
    'Use a clear scan or photo for better OCR.',
    'Crop excess margins to improve detection.',
  ]), [])
  return (
    <main className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold text-slate-900">Live Demo</h1>
          <p className="text-slate-600 mt-1">Interactive demo: upload certificate (PDF/JPG) and view a verification report.</p>
          <div className="mt-4"><CertificateUpload /></div>
          <div className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="font-semibold text-slate-900">Results Panel (demo)</p>
            <ul className="mt-2 text-sm text-slate-700 list-disc pl-5">
              <li>OCR Text: shows extracted text (placeholder in demo)</li>
              <li>Risk Score: heuristic number based on filename keywords</li>
              <li>Reasons: brief explanation for the score</li>
              <li>Registry Match: simulated true/false</li>
              <li>Download Report: disable in demo</li>
            </ul>
          </div>
        </div>
        <div className="space-y-4">
          <MobileFallback />
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="font-medium text-slate-900">Tips</p>
            <ul className="text-sm text-slate-700 mt-1 list-disc pl-5">
              {tips.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
