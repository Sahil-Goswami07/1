import React from 'react';

const UniversityDashboard = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Rajasthan Technical University</h1>
          <p className="mt-1 text-lg text-slate-600">Verification Dashboard</p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Total Students</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">250,000</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Verified Certificates</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">150,212</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Pending Verifications</h3>
            <p className="mt-1 text-3xl font-semibold text-amber-600">89</p>
          </div>
        </div>

        {/* Recent Verifications Table */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Verifications</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Certificate No.</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">Priya Sharma</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">RTU-12345</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">Sep 18, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Verified</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">Amit Kumar</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">RTU-67890</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">Sep 18, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Mismatch Found</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">Sunita Devi</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">RTU-54321</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">Sep 17, 2025</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Verified</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UniversityDashboard;
