function Feature({ icon, title }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
        <p className="font-medium text-slate-900">{title}</p>
      </div>
    </div>
  )
}

export function Features() {
  const icon = (path) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">{path}</svg>
  )
  const items = [
    { title: 'Blockchain Security', icon: icon(<path d="M3 7l9-5 9 5-9 5-9-5zm9 7l9-5v8l-9 5-9-5v-8l9 5z"/>) },
    { title: 'Legacy Certificate Support', icon: icon(<path d="M5 3h10l4 4v14H5zM15 3v4h4"/>) },
    { title: 'AI Anomaly Detection', icon: icon(<path d="M12 3a9 9 0 100 18 9 9 0 000-18zm-1 5h2v6h-2zm0 8h2v2h-2z"/>) },
    { title: 'State-wide Coverage', icon: icon(<path d="M3 7l6-4 6 4v10l-6 4-6-4z"/>) },
    { title: 'Analytics', icon: icon(<path d="M5 19V8h2v11H5zm6 0V5h2v14h-2zm6 0v-7h2v7h-2z"/>) },
  ]
  return (
    <section className="py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-slate-900">Features</h2>
        <div className="mt-4 grid sm:grid-cols-5 gap-4">
          {items.map((f) => <Feature key={f.title} {...f} />)}
        </div>
      </div>
    </section>
  )
}

export function Stats() {
  const stats = [
    { value: '200+', label: 'Institutions Onboarded' },
    { value: '1.5M+', label: 'Certificates Verified' },
    { value: '30%', label: 'Gap Still Offline' },
  ]
  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-3 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-extrabold text-slate-900">{s.value}</div>
            <div className="text-slate-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Logos() {
  const items = ['RTU', 'MLSU', 'RUHS', 'Jaipur']
  return (
    <section className="py-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((name) => (
          <div key={name} className="rounded-xl bg-white p-4 text-center font-semibold text-slate-700 ring-1 ring-slate-200">
            {name}
          </div>
        ))}
      </div>
    </section>
  )
}

export function Testimonials() {
  const items = [
    {
      name: 'Priya Sharma', role: 'Student', text: 'This platform gave me instant verification for my job application abroad.',
    },
    {
      name: 'Rohit Singh', role: 'Recruiter', text: 'Saved us from hiring risks – we can now trust verified degrees.',
    },
  ]
  return (
    <section className="py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 gap-6">
        {items.map((t) => (
          <div key={t.name} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-slate-200" />
              <div>
                <p className="font-semibold text-slate-900">{t.name}</p>
                <p className="text-sm text-slate-600">{t.role}</p>
              </div>
            </div>
            <p className="mt-4 text-slate-700">{t.text}</p>
            <div className="mt-3 text-amber-400">★★★★★</div>
          </div>
        ))}
      </div>
    </section>
  )
}
