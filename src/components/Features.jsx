import React from 'react';

const Feature = ({ icon, title, description }) => (
  <div>
    <div>
      <span className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
        {icon}
      </span>
    </div>
    <div className="mt-5">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-base text-gray-500">{description}</p>
    </div>
  </div>
);

export default function Features() {
  const icons = {
    security: (
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    legacy: (
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    ai: (
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    coverage: (
      <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.737 16.95l.263.95m0 0a5.25 5.25 0 005.033 0m-5.033 0l.263-.95m-3.368-3.368l.95.263m0 0a5.25 5.25 0 000 5.033m0-5.033l-.95.263m10.092 0l-.95-.263m0 0a5.25 5.25 0 000-5.033m0 5.033l.95-.263" />
      </svg>
    ),
  };

  const features = [
    {
      icon: icons.security,
      title: 'Blockchain Security',
      description: 'Every verification is anchored to a public or private blockchain, creating a tamper-proof audit trail.',
    },
    {
      icon: icons.legacy,
      title: 'Legacy Certificate Support',
      description: 'Our AI can digitize and verify older, paper-based certificates with high accuracy.',
    },
    {
      icon: icons.ai,
      title: 'AI Anomaly Detection',
      description: 'Machine learning models detect subtle signs of digital tampering and forgery that the human eye might miss.',
    },
    {
      icon: icons.coverage,
      title: 'State-wide Coverage',
      description: 'We partner with government bodies and universities to provide comprehensive verification across the entire state.',
    },
  ];

  return (
    <div className="py-12 bg-white">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h2 className="sr-only">A better way to send money.</h2>
        <div className="space-y-10 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
          {features.map((feature) => (
            <Feature key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
}
