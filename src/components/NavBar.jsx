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
            <NavLink to="/" className={({ isActive }) => isActive ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'}>Home</NavLink>
            <NavLink to="/demo" className={({ isActive }) => isActive ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'}>Demo</NavLink>
            <NavLink to="/upload" className={({ isActive }) => isActive ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'}>Upload</NavLink>
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'}>Admin</NavLink>
            <NavLink to="/university" className={({ isActive }) => isActive ? 'text-slate-900 font-semibold' : 'hover:text-slate-900'}>University</NavLink>
          </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/upload"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-700 text-sm font-semibold px-3 py-1.5 hover:bg-slate-50"
          >
            Upload
          </Link>
          <Link
            to="/demo"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white text-sm font-semibold px-3 py-1.5 hover:bg-blue-700"
          >
            Try Demo
          </Link>
        </div>
        <div className="md:hidden" />
      </div>
    </header>
  )
}
