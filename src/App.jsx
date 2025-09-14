import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import { Features, Stats, Logos, Testimonials } from './components/Features'
import Verifier from './components/Verifier'

export default function App() {
  return (
    <div>
      <Hero />
      <HowItWorks />
  <Features />
  <Verifier />
      <Stats />
      <Logos />
      <Testimonials />
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
