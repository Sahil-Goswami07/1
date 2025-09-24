import React from 'react';

const Step = ({ icon, title, description }) => (
  <div className="flex">
    <div className="flex-shrink-0">
      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
        {icon}
      </div>
    </div>
    <div className="ml-4">
      <h3 className="text-lg leading-6 font-medium text-slate-900">{title}</h3>
      <p className="mt-2 text-base text-slate-600">{description}</p>
    </div>
  </div>
);

export default function HowItWorks() {
  const icons = {
    upload: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    process: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V3m0 18v-3m6-12h-2m-4 0H9" />
      </svg>
    ),
    verify: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    share: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
      </svg>
    ),
  };

  const steps = [
    {
      icon: icons.upload,
      title: 'Step 1: Upload Certificate',
      description: 'Users (students, employers, or universities) upload a digital certificate (PDF, JPG, PNG) through our secure web portal.',
    },
    {
      icon: icons.process,
      title: 'Step 2: AI-Powered Analysis',
      description: 'Our system uses Optical Character Recognition (OCR) to extract text and AI models to analyze the document\'s layout, fonts, and signatures for any signs of tampering or forgery.',
    },
    {
      icon: icons.verify,
      title: 'Step 3: Blockchain & Database Verification',
      description: 'The extracted data is cross-referenced with immutable records on the blockchain and the university\'s official database for final validation.',
    },
    {
      icon: icons.share,
      title: 'Step 4: Receive & Share Verifiable Result',
      description: 'A tamper-proof verification report is generated instantly, which can be downloaded or shared securely with a unique link.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Workflow</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            How Our System Works
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            A transparent, step-by-step look into our verification process.
          </p>
        </div>

        <div className="mt-12">
          <div className="grid md:grid-cols-2 gap-10">
            {steps.map((step) => (
              <Step key={step.title} {...step} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
