import { Link, NavLink, useNavigate } from 'react-router-dom'
import { site } from '../config/site'
import { useAuth } from '../hooks/useAuth.js';

export default function NavBar() {
  const { token, role, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/'); };
  return (
    <header className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-30 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight" aria-label={site.logo.alt}>
          <span className="inline-block h-6 w-6 rounded-md" style={{ background: `linear-gradient(135deg, ${site.colors.primary}, ${site.colors.secondary})` }} />
          <span>EduAuth</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm text-slate-700">
          {site.nav.filter(n => {
            if (n.to === '/admin' && role !== 'superAdmin') return false;
            if (n.to === '/university' && !['universityAdmin','superAdmin'].includes(role)) return false;
            if (token && n.publicOnly) return false; // hide public-only when logged in
            return true;
          }).map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'}>
              {item.label}
            </NavLink>
          ))}
          {/* Extra explicit login shortcuts removed; using distinct role links */}
          {token && <button onClick={handleLogout} className="text-slate-600 hover:text-slate-900">Logout</button>}
        </nav>
        <div className="md:hidden" />
      </div>
    </header>
  )
}
