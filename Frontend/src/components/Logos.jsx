import React, { useEffect, useState } from 'react';

const Logos = () => {
  const [logos, setLogos] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/universities') // Example API
      .then((res) => res.json())
      .then((data) => setLogos(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {logos.map((logo) => (
            <div key={logo.name} className="col-span-1 flex justify-center">
              <img
                className="h-12"
                src={logo.logo}
                alt={logo.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/logos/fallback.png';
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Logos;
