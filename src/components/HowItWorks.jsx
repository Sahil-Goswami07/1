function Step({ icon, title, desc }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-slate-600 text-sm mt-1">{desc}</p>
        </div>
      </div>
    </div>
  )
}

export default function HowItWorks() {
  const icons = {
    upload: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 3l4 4h-3v6h-2V7H8l4-4z"/>
        <path d="M4 14h16v5H4z"/>
      </svg>
    ),
    shield: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2l7 3v6c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V5l7-3z"/>
      </svg>
    ),
    check: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20.3 7.7l-1.4-1.4z"/>
      </svg>
    ),
  }

  return (
    <section id="learn" className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-slate-900">How It Works</h2>
        <div className="mt-4 grid sm:grid-cols-3 gap-4">
          <Step icon={icons.upload} title="Upload Certificate" desc="Upload the PDF or image of the certificate." />
          <Step icon={icons.shield} title="AI + Blockchain Validation" desc="Our engine validates with AI, blockchain anchors and databases." />
          <Step icon={icons.check} title="Get Result" desc="See an instant authentic/invalid result with details." />
        </div>
      </div>
    </section>
  )
}
