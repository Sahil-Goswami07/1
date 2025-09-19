import React from 'react';

const Stats = () => {
  const stats = [
    { id: 1, name: 'Institutions Onboarded', value: '200+' },
    { id: 2, name: 'Certificates Verified', value: '1.5M+' },
    { id: 3, name: 'Verification Accuracy', value: '99.9%' },
    { id: 4, name: 'Reduction in Fraud', value: 'Up to 90%' },
  ];

  return (
    <div className="bg-blue-600">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Trusted by the Numbers
          </h2>
          <p className="mt-3 text-xl text-blue-200 sm:mt-4">
            Our platform is making a real impact in the education ecosystem.
          </p>
        </div>
        <div className="mt-10 text-center">
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="flex flex-col">
                <dt className="order-2 mt-2 text-lg leading-6 font-medium text-blue-200">{stat.name}</dt>
                <dd className="order-1 text-5xl font-extrabold text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Stats;
