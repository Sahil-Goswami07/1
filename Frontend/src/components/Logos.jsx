import React, { useEffect, useState } from 'react';

const FALLBACK_LOGOS = [
  { name: 'Trusted University', logo: 'https://via.placeholder.com/140x48?text=University' },
  { name: 'EduAuth Partner', logo: 'https://via.placeholder.com/140x48?text=Partner' },
  { name: 'Accredited Board', logo: 'https://via.placeholder.com/140x48?text=Board' },
  { name: 'Research Institute', logo: 'https://via.placeholder.com/140x48?text=Research' }
];

const Logos = () => {
  const [logos, setLogos] = useState(FALLBACK_LOGOS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('http://localhost:5000/api/universities')
      .then(async (res) => {
        if (!res.ok) throw new Error('status ' + res.status);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Not array');
        return data.filter(u => u.status === 'approved').map(u => ({ name: u.name, logo: u.logo || 'https://via.placeholder.com/140x48?text=' + encodeURIComponent(u.code || 'UNI') }));
      })
      .then((data) => { if (!cancelled && data.length) setLogos(data); })
      .catch(() => {/* keep fallback */})
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {Array.isArray(logos) && logos.map((logo) => (
            <div key={logo.name} className="col-span-1 flex justify-center">
              <img
                className="h-12"
                src={logo.logo}
                alt={logo.name}
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/140x48?text=Logo'; }}
              />
            </div>
          ))}
        </div>
        {!loaded && <p className="text-center text-xs text-slate-400 mt-4">Loading partners…</p>}
      </div>
    </div>
  );
};

export default Logos;
