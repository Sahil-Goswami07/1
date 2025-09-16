import { Link, NavLink } from 'react-router-dom'
import { site } from '../config/site'

export default function NavBar() {
  return (
    <header className="bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-30 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight" aria-label={site.logo.alt}>
          <span className="inline-block h-6 w-6 rounded-md" style={{ background: `linear-gradient(135deg, ${site.colors.primary}, ${site.colors.secondary})` }} />
          <span>EduAuth</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm text-slate-700">
          {site.nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => isActive ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="md:hidden" />
      </div>
    </header>
  )
}
