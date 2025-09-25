import React, { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';

const MainLayout = ({ children }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const height = h.scrollHeight - h.clientHeight;
      const pct = height > 0 ? (scrolled / height) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div>
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-40">
        <div className="h-0.5 bg-blue-600 transition-all duration-150" style={{ width: progress + '%' }} />
      </div>
      <NavBar />
      <main>{children}</main>
      <footer className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <p>© {new Date().getFullYear()} EduAuth. All rights reserved.</p>
          <div className="flex gap-4">
            <a className="hover:text-slate-900" href="#">Privacy</a>
            <a className="hover:text-slate-900" href="#">Terms</a>
            <a className="hover:text-slate-900" href="/contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
