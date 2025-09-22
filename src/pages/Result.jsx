import React, { useMemo, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import ScoreBar from '../components/ScoreBar'
import HeatmapCanvas from '../components/HeatmapCanvas'

export default function Result() {
  const { state } = useLocation()
  const data = state || {}

  const signals = data.report?.signals || {}
  const fields = data.report?.data || {}

  const bars = useMemo(() => [
    { key: 'registry', label: 'Registry Match', value: signals.registry?.score ?? 0 },
    { key: 'hash', label: 'Hash/Signature', value: signals.hash?.score ?? 0 },
    { key: 'template', label: 'Template Similarity', value: signals.template?.score ?? signals.templateSSIM ?? 0 },
    { key: 'seal', label: 'Seal/Logo Match', value: signals.seal?.score ?? 0 },
    { key: 'ela', label: 'ELA Anomalies', value: signals.ela?.score ?? 0 },
    { key: 'metadata', label: 'Metadata Consistency', value: signals.metadata?.score ?? 0 },
  ], [signals])

  const statusColor = {
    VERIFIED: 'bg-green-100 text-green-800',
    SUSPICIOUS: 'bg-amber-100 text-amber-800',
    LIKELY_FAKE: 'bg-red-100 text-red-800',
  }[data.status] || 'bg-slate-100 text-slate-800'

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start justify-between gap-6 flex-col lg:flex-row">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-slate-900">Verification Result</h1>
            <div className={`inline-flex mt-3 px-3 py-1 rounded-full text-sm font-semibold ${statusColor}`}>{data.status} · Score {data.score}</div>
            <div className="mt-6 grid sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h2 className="font-semibold text-slate-900 mb-3">Parsed Fields</h2>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {Object.entries(fields).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt className="text-slate-500 capitalize">{k}</dt>
                      <dd className="text-slate-900">{String(v)}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h2 className="font-semibold text-slate-900 mb-3">Signals</h2>
                <div className="space-y-3">
                  {bars.map((b) => (
                    <ScoreBar key={b.key} label={b.label} value={b.value} />
                  ))}
                </div>
              </div>
            </div>
            {data.pdf && (
              <a href={data.pdf} target="_blank" rel="noreferrer" className="inline-flex mt-6 px-4 py-2 rounded-md bg-slate-900 text-white">Download Signed PDF</a>
            )}
          </div>
          <div className="w-full lg:w-[420px]">
            <h2 className="font-semibold text-slate-900 mb-3">Forgery Heatmap</h2>
            <HeatmapCanvas width={400} height={520} score={signals.ela?.score ?? 0} />
            <p className="mt-2 text-xs text-slate-500">Illustrative heatmap based on ELA score.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
