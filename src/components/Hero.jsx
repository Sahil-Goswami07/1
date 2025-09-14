export default function Hero() {
  return (
    <section className="pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Secure, Verified,
            <br />
            Trusted Academic Certificates
          </h1>
          <p className="mt-4 text-slate-600 text-lg">
            AI + Blockchain + Database powered authentication for Rajasthan's
            education ecosystem.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="#verify" className="inline-flex items-center justify-center rounded-lg bg-blue-600 text-white px-5 py-3 font-semibold shadow-sm hover:bg-blue-700">
              Verify Now
            </a>
            <a href="#learn" className="inline-flex items-center justify-center rounded-lg bg-white text-slate-900 px-5 py-3 font-semibold ring-1 ring-slate-200 hover:bg-slate-50">
              About this
            </a>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md">
          {/* Illustration card */}
          <div className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="h-56 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center">
              {/* Simple document + chain illustration */}
              <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="10" width="120" height="140" rx="10" fill="#ffffff" stroke="#dbeafe" strokeWidth="2"/>
                <rect x="30" y="25" width="80" height="10" rx="3" fill="#bfdbfe" />
                <rect x="30" y="45" width="95" height="10" rx="3" fill="#dbeafe" />
                <rect x="30" y="65" width="70" height="10" rx="3" fill="#dbeafe" />
                <rect x="30" y="85" width="90" height="10" rx="3" fill="#dbeafe" />
                {/* QR */}
                <rect x="30" y="110" width="36" height="36" rx="4" fill="#1e40af" opacity="0.9" />
                <rect x="40" y="120" width="8" height="8" fill="#ffffff" />
                <rect x="54" y="120" width="8" height="8" fill="#ffffff" />
                <rect x="40" y="134" width="8" height="8" fill="#ffffff" />
                <rect x="54" y="134" width="8" height="8" fill="#ffffff" />
                {/* Ribbon */}
                <circle cx="125" cy="120" r="14" fill="#60a5fa" />
                <path d="M125 112l4 8h-8l4-8z" fill="#2563eb" />
                {/* Chain blocks */}
                <rect x="160" y="40" width="24" height="24" rx="6" fill="#93c5fd" />
                <rect x="160" y="78" width="24" height="24" rx="6" fill="#60a5fa" />
                <rect x="160" y="116" width="24" height="24" rx="6" fill="#3b82f6" />
                <line x1="160" y1="52" x2="146" y2="52" stroke="#93c5fd" strokeWidth="3" />
                <line x1="160" y1="90" x2="146" y2="90" stroke="#60a5fa" strokeWidth="3" />
                <line x1="160" y1="128" x2="146" y2="128" stroke="#3b82f6" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
