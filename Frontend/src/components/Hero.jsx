import React from 'react';

export default function Hero({
  headline = 'Secure, Verified, Trusted Academic Certificates',
  subheadline = "AI + Blockchain + Database powered authentication for education.",
  ctaPrimary = { label: 'Verify (to easily verify from here also)', href: '/verify' },
  ctaSecondary = { label: 'Apply (University)', href: '/university/apply' },
}) {
  return (
    <section className="relative bg-gradient-to-b from-white to-slate-50 overflow-hidden">
      <div className="container py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-3">Trusted · Fast · Transparent</p>
            <h1 className="text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900">
              <span className="block">{headline.split('\n')[0]}</span>
              <span className="block text-gradient-to-r bg-clip-text text-transparent" style={{background: 'linear-gradient(90deg,#0B5FFF,#00C48C)'}}>{headline.split('\n')[1] || ''}</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-xl">{subheadline}</p>

            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <a href={ctaPrimary.href} className="btn btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {ctaPrimary.label}
              </a>
              <a href={ctaSecondary.href} className="btn btn-ghost">
                {ctaSecondary.label}
              </a>
            </div>

            <div className="mt-6 text-sm text-slate-500">
              <span className="inline-block mr-3">🔒 GDPR-ready</span>
              <span className="inline-block mr-3">⚡ 2s avg verification</span>
              <span className="inline-block">📁 Bulk import</span>
            </div>
          </div>

          <div className="order-first lg:order-last">
            <img className="hero-image w-full h-156 object-cover" src="https://images.unsplash.com/photo-1693045181254-08462917f681?q=80&w=1057&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Students verifying certificates" />
          </div>
        </div>
      </div>
    </section>
  );
}
