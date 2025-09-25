import { site } from '../config/site'

export default function SimplePage({ title }) {
  const content = {
    Features: (
      <div className="mt-6 grid sm:grid-cols-2 gap-6">
        {site.features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:shadow-xl hover:-translate-y-2 transform transition-all duration-300"
          >
            <p className="font-semibold text-slate-900 text-lg border-b-2 border-blue-600 inline-block pb-1">{f.title}</p>
            <p className="text-slate-700 text-sm mt-2">{f.description}</p>
          </div>
        ))}
      </div>
    ),
    'Technical Specifications': (
      <div className="mt-6 space-y-4">
        {Object.entries(site.techSpecs).map(([k, v]) => (
          <div
            key={k}
            className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:shadow-xl hover:-translate-y-2 transform transition-all duration-300"
          >
            <p className="font-medium text-slate-900 text-lg border-b border-blue-100 pb-1">{k}</p>
            <p className="text-slate-700 text-sm mt-1">{Array.isArray(v) ? v.join(', ') : v}</p>
          </div>
        ))}
      </div>
    ),
    'API Documentation': (
      <div className="mt-6 space-y-4">
        {site.api.endpoints.map((e) => (
          <div
            key={e.path}
            className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:shadow-xl hover:-translate-y-2 transform transition-all duration-300"
          >
            <p className="font-mono text-xs text-slate-500">{e.method}</p>
            <p className="font-semibold text-slate-900 text-sm">{e.path}</p>
            {e.auth && <p className="text-sm text-slate-600 mt-1">Auth: {e.auth}</p>}
            {e.body && (
              <pre className="mt-2 bg-blue-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(e.body, null, 2)}</pre>
            )}
          </div>
        ))}
      </div>
    ),
    About: (
      <div className="mt-6 grid sm:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:shadow-xl hover:-translate-y-2 transform transition-all duration-300">
          <p className="font-semibold text-slate-900 text-lg border-b-2 border-blue-600 pb-1">Team</p>
          <ul className="text-sm text-slate-700 list-disc pl-5 mt-2">
            {site.about.team.map((m) => (
              <li key={m.name}>
                <span className="font-medium">{m.name}</span> — {m.role}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:shadow-xl hover:-translate-y-2 transform transition-all duration-300">
          <p className="font-semibold text-slate-900 text-lg border-b-2 border-blue-600 pb-1">Advisors</p>
          <ul className="text-sm text-slate-700 list-disc pl-5 mt-2">
            {site.about.advisors.map((a, idx) => (
              <li key={idx}>
                <span className="font-medium">{a.role}</span> — {a.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
    Roadmap: (
      <div className="mt-6 space-y-4">
        {site.roadmap.milestones.map((m) => (
          <div
            key={m.phase}
            className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:shadow-xl hover:-translate-y-2 transform transition-all duration-300"
          >
            <p className="font-semibold text-slate-900 text-lg border-b border-blue-100 pb-1">{m.phase}</p>
            <ul className="text-sm text-slate-700 list-disc pl-5 mt-2">
              {m.deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    ),
    'Contact & Apply (University)': (
      <div className="mt-6 grid gap-4">
        <div className="rounded-2xl bg-white p-6 ring-1 ring-slate-200 hover:shadow-xl hover:-translate-y-2 transform transition-all duration-300">
          <p className="text-slate-700 text-sm">{site.contact.content}</p>
          <p className="text-slate-500 text-xs mt-2">{site.contact.privacyNote}</p>
          <div className="mt-3 text-sm">
            <p>
              <span className="font-medium">Email:</span> {site.contact.email}
            </p>
            <p>
              <span className="font-medium">Phone:</span> {site.contact.phone}
            </p>
          </div>
        </div>
      </div>
    ),
  }

  return (
    <main className="py-10 bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 border-b-4 border-blue-600 pb-2 inline-block">
          {title}
        </h1>
        {content[title] && <div>{content[title]}</div>}
      </div>
    </main>
  )
}
