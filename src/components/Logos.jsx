import React from 'react';

const Logos = () => {
  const logos = [
    { name: 'RTU', logo: 'https://via.placeholder.com/150x50?text=RTU' },
    { name: 'MLSU', logo: 'https://via.placeholder.com/150x50?text=MLSU' },
    { name: 'RUHS', logo: 'https://via.placeholder.com/150x50?text=RUHS' },
    { name: 'University of Jaipur', logo: 'https://via.placeholder.com/150x50?text=Jaipur' },
  ];

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {logos.map((logo) => (
            <div key={logo.name} className="col-span-1 flex justify-center">
              <img className="h-12" src={logo.logo} alt={logo.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Logos;
