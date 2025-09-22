import React from 'react'

export default function ScoreBar({ label, value = 0 }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const color = pct >= 85 ? 'bg-green-600' : pct < 60 ? 'bg-red-600' : 'bg-amber-500'
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full bg-slate-200 rounded">
        <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
