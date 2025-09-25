import React from "react";

const icons = {
  security: (
    <svg
      className="h-8 w-8"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  ),
  legacy: (
    <svg
      className="h-8 w-8"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  ),
  ai: (
    <svg
      className="h-8 w-8"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  coverage: (
    <svg
      className="h-8 w-8"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.737 16.95l.263.95m0 0a5.25 5.25 0 005.033 0m-5.033 0l.263-.95m-3.368-3.368l.95.263m0 0a5.25 5.25 0 000 5.033m0-5.033l-.95.263m10.092 0l-.95-.263m0 0a5.25 5.25 0 000-5.033m0 5.033l.95-.263"
      />
    </svg>
  ),
};

const Feature = ({ icon, title, description }) => (
  <div className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center text-center transition-transform transform hover:-translate-y-2 hover:shadow-xl hover:bg-blue-50 duration-300">
    <div className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-600 text-white mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    <p className="mt-2 text-gray-600">{description}</p>
  </div>
);

export default function Features() {
  const features = [
    {
      icon: icons.security,
      title: "Blockchain Security",
      description:
        "Every verification is anchored to a blockchain, creating a tamper-proof audit trail.",
    },
    {
      icon: icons.legacy,
      title: "Legacy Certificate Support",
      description:
        "AI digitizes and verifies older, paper-based certificates with high accuracy.",
    },
    {
      icon: icons.ai,
      title: "AI Anomaly Detection",
      description:
        "Machine learning detects subtle signs of digital tampering or forgery.",
    },
    {
      icon: icons.coverage,
      title: "State-wide Coverage",
      description:
        "Partnerships with government bodies and universities ensure wide reach.",
    },
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
          Key Features
        </h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Feature key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
