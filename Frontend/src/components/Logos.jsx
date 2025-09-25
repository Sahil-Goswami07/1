import { FaUniversity, FaUserTie, FaClipboardList, FaFlask } from 'react-icons/fa';

const logos = [
  { name: 'University', icon: <FaUniversity size={48} /> },
  { name: 'Partner', icon: <FaUserTie size={48} /> },
  { name: 'Board', icon: <FaClipboardList size={48} /> },
  { name: 'Research', icon: <FaFlask size={48} /> },
];

const Logos = () => {
  return (
    <div className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
          Our Trusted Partners
        </h2>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-md hover:shadow-xl hover:scale-105 transition-transform duration-300 cursor-pointer"
            >
              <div className="text-blue-600 mb-4">{logo.icon}</div>
              <span className="text-gray-700 font-medium text-lg">{logo.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Logos;
