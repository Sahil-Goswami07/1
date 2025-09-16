import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Demo from './pages/Demo'
import SimplePage from './pages/SimplePage'

export default function App() {
  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/features" element={<SimplePage title="Features" />} />
        <Route path="/tech-specs" element={<SimplePage title="Technical Specifications" />} />
        <Route path="/api" element={<SimplePage title="API Documentation" />} />
        <Route path="/about" element={<SimplePage title="About" />} />
        <Route path="/roadmap" element={<SimplePage title="Roadmap" />} />
        <Route path="/contact" element={<SimplePage title="Contact & Request Pilot" />} />
        <Route path="*" element={<SimplePage title="Not Found">The page you’re looking for doesn’t exist.</SimplePage>} />
      </Routes>
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
  )
}
