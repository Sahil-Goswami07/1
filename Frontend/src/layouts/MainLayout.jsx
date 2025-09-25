import React, { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import Footer from '../components/footer';

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
     <Footer/>
    </div>
  );
};

export default MainLayout;
