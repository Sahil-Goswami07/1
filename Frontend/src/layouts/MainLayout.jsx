import React from 'react';
import NavBar from '../components/NavBar';

const MainLayout = ({ children }) => {
  return (
    <div>
      <NavBar />
      <main>{children}</main>
      <footer className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <p>© {new Date().getFullYear()} EduAuth. All rights reserved.</p>
          <div className="flex gap-4">
            <a className="hover:text-slate-900" href="#">Privacy</a>
            <a className="hover:text-slate-900" href="#">Terms</a>
            <a className="hover:text-slate-900" href="#">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
