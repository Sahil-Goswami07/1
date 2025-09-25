import { Link, NavLink, useNavigate } from 'react-router-dom'
import { site } from '../config/site'
import { useAuth } from '../hooks/useAuth.js';
import React, { useEffect, useState } from 'react';

export default function NavBar() {
  const { token, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const handleLogout = () => { logout(); navigate('/'); };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const items = site.nav.filter(n => {
    if (n.to === '/admin' && role !== 'superAdmin') return false;
    if (n.to === '/university' && !['universityAdmin','superAdmin'].includes(role)) return false;
    if (token && n.publicOnly) return false;
    return true;
  });

  const headerClasses = `sticky top-0 z-30 supports-[backdrop-filter]:bg-white/60 backdrop-blur ${scrolled ? 'bg-white/80 shadow-sm' : 'bg-white/70 border-b border-slate-200'}`;

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight transition-transform duration-200 hover:scale-[1.03]" aria-label={site.logo.alt}>
          <span className="inline-block h-6 w-6 rounded-md ring-1 ring-slate-200" style={{ background: `linear-gradient(135deg, ${site.colors.primary}, ${site.colors.secondary})` }} />
          <span className="text-slate-900">EduAuth</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm text-slate-700">
          {items.map(item => (
            item.children ? (
              <div key={item.label} className="relative group">
                <button className="px-3 py-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center gap-1">
                  <span>{item.label}</span>
                  <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 absolute left-0 mt-1 min-w-[180px] rounded-md border border-slate-200 bg-white shadow-lg py-1">
                  {item.children.map(child => (
                    <NavLink key={child.to} to={child.to} className={({ isActive }) => `block px-3 py-2 text-sm ${isActive ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `group relative px-3 py-1.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-700 hover:text-slate-900'}`}
              >
                {({ isActive }) => (
                  <span className="relative">
                    {item.label}
                    <span className={`absolute left-0 -bottom-0.5 h-[2px] bg-blue-600 transition-all duration-200 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}/>
                  </span>
                )}
              </NavLink>
            )
          ))}
          {token && (
            <button onClick={handleLogout} className="ml-2 px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Logout</button>
          )}
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Open menu" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 6l12 12M6 18L18 6"/></svg>
          ) : (
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          )}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 space-y-2 transition-all duration-200">
            {items.map(item => (
              item.children ? (
                <div key={item.label} className="px-1 py-1">
                  <div className="px-2 py-1 text-xs uppercase tracking-wide text-slate-500">{item.label}</div>
                  <div className="mt-1 space-y-1">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) => `block px-3 py-2 rounded-md ${isActive ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-50'}`}
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center justify-between px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-50'}`}
                >
                  <span>{item.label}</span>
                  <svg className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
                </NavLink>
              )
            ))}
            {token && <button onClick={() => { setMobileOpen(false); handleLogout(); }} className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 text-slate-600 transition-colors">Logout</button>}
          </div>
        </div>
      )}
    </header>
  )
}
