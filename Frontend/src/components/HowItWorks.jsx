import React from 'react';
import { Upload, Settings, CheckCircle, Share2, ArrowRight } from 'lucide-react';

const Step = ({ icon, title, description }) => (
  <div className="flex flex-col items-center text-center space-y-2">
    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-600 text-white">
      {icon}
    </div>
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    <p className="text-gray-500 text-sm max-w-xs">{description}</p>
  </div>
);

export default function HowItWorks() {
  const steps = [
    {
      icon: <Upload size={32} />,
      title: 'Upload Certificate',
      description: 'Users upload a digital certificate (PDF, JPG, PNG) securely.',
    },
    {
      icon: <Settings size={32} />,
      title: 'AI-Powered Analysis',
      description: 'OCR extracts text & AI checks layout, fonts, and signatures.',
    },
    {
      icon: <CheckCircle size={32} />,
      title: 'Blockchain Verification',
      description: 'Data is cross-referenced with blockchain & official database.',
    },
    {
      icon: <Share2 size={32} />,
      title: 'Receive & Share Result',
      description: 'Tamper-proof report is generated, downloadable & shareable.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Workflow</h2>
          <p className="mt-2 text-3xl font-extrabold text-gray-900 sm:text-4xl">How Our System Works</p>
          <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto">
            A clear, step-by-step view of our verification process.
          </p>
        </div>

        {/* Horizontal Arrow Flow */}
        <div className="flex flex-col md:flex-row items-center justify-between space-y-8 md:space-y-0 md:space-x-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <Step {...step} />
              {index < steps.length - 1 && (
                <ArrowRight size={32} className="hidden md:block text-gray-400" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
