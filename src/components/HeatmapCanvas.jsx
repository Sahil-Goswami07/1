import React, { useRef, useEffect } from 'react'

export default function HeatmapCanvas({ width = 400, height = 500, score = 0 }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, width, height)
    // simple gradient heat based on score
    const grd = ctx.createLinearGradient(0, 0, width, height)
    const s = score / 100
    grd.addColorStop(0, 'rgba(255,0,0,0.2)')
    grd.addColorStop(0.5, `rgba(255,165,0,${0.1 + 0.5 * s})`)
    grd.addColorStop(1, `rgba(0,128,0,${0.05 + 0.3 * (1 - s)})`)
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, width, height)

    // add random hot spots for demo
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const r = 20 + Math.random() * 40
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(255,0,0,0.35)')
      g.addColorStop(1, 'rgba(255,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [width, height, score])
  return <canvas ref={ref} width={width} height={height} className="rounded-lg border border-slate-200" />
}
