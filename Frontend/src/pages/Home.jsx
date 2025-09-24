import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import Features from '../components/Features'
import Stats from '../components/Stats'
import Logos from '../components/Logos'
import Testimonials from '../components/Testimonials'
import { site } from '../config/site'
import CertificateUpload from '../components/certificateUpload'

export default function Home() {
  const h = site.home.hero
  return (
    <div className="bg-slate-50">
      <Hero headline={h.headline} subheadline={h.subheadline} ctaPrimary={h.ctaPrimary} ctaSecondary={h.ctaSecondary} />
      <Logos />
      <HowItWorks />
      <Features />
      <Stats />
      <Testimonials />
      <CertificateUpload />
    </div>
  )
}
