import React from "react";
import heroImg from "../assets/images/hero.png";
export default function Hero({
  headline = "Your Academic Certificates,\n Verified & Secured Instantly",
  subheadline = "AI + Blockchain + Database powered authentication for education.",
  ctaPrimary = { label: "Verify Now", href: "/verify" },
  ctaSecondary = { label: "Apply (University)", href: "/university/apply" },
}) {
  const [line1, line2] = headline.split("\n");

  return (
    <section className="relative bg-#e0f2ff overflow-hidden">
      <div className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Left Content */}
          <div>
            <p className="text-sm font-medium text-slate-500 mb-3">
              Trusted · Fast · Transparent .
            </p>

            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
              <span className="block">{line1}</span>
              {line2 && (
                <span className="block bg-gradient-to-r from-blue-600 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
                  {line2}
                </span>
              )}
            </h1>

            <p className="mt-4 text-lg text-slate-600 max-w-xl">{subheadline}</p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <a
                href={ctaPrimary.href}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                {ctaPrimary.label}
              </a>

              <a
                href={ctaSecondary.href}
                className="inline-flex items-center px-6 py-3 rounded-md border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
              >
                {ctaSecondary.label}
              </a>

              <a
                href="/contact"
                className="inline-flex items-center px-6 py-3 rounded-md border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition"
              >
                Need Help?
              </a>
            </div>

            {/* Highlights */}
            <div className="mt-6 text-sm text-slate-500 space-x-4">
              <span>🔒 Three-step Verification</span>
              <span>⚡ 20s avg verification</span>
              <span>📁 Bulk import</span>
            </div>
          </div>

          {/* Right Image */}
          <div className="order-first lg:order-last">
            <img
              className="w-full h-auto aspect-video rounded-xl shadow-xl object-cover"
              src={heroImg}
              alt="Students verifying certificates"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
