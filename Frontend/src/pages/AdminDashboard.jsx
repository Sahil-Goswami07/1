import React from 'react';

const AdminDashboard = () => {
  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-lg text-slate-600">Global overview of the EduAuth ecosystem.</p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Total Universities</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">200+</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Certificates Verified</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">1.5M+</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Total Students</h3>
            <p className="mt-1 text-3xl font-semibold text-slate-900">2.1M+</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-medium text-slate-500">Forgeries Detected</h3>
            <p className="mt-1 text-3xl font-semibold text-red-600">4,210</p>
          </div>
        </div>

        {/* Recent Activity & University List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Verification Activity</h2>
            {/* Placeholder for activity feed or chart */}
            <div className="h-64 bg-slate-100 rounded-md flex items-center justify-center">
              <p className="text-slate-500">Activity Chart Placeholder</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Registered Universities</h2>
            <ul className="space-y-3">
              <li className="flex items-center justify-between">
                <span className="text-slate-700">Rajasthan Technical University</span>
                <span className="text-sm font-medium text-slate-500">150k Verified</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-700">MLSU, Udaipur</span>
                <span className="text-sm font-medium text-slate-500">120k Verified</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-700">RUHS, Jaipur</span>
                <span className="text-sm font-medium text-slate-500">95k Verified</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-700">University of Jaipur</span>
                <span className="text-sm font-medium text-slate-500">88k Verified</span>
              </li>
              <li className="pt-2">
                <a href="#" className="text-sm font-semibold text-blue-600 hover:text-blue-700">View All Universities →</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
