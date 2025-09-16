import Hero from '../components/Hero'
import HowItWorks from '../components/HowItWorks'
import { Features, Stats, Logos, Testimonials } from '../components/Features'
import Verifier from '../components/Verifier'
import { site } from '../config/site'

export default function Home() {
  const h = site.home.hero
  return (
    <div>
      <Hero headline={h.headline} subheadline={h.subheadline} ctaPrimary={h.ctaPrimary} ctaSecondary={h.ctaSecondary} />
      <HowItWorks />
      <Features />
      <Verifier />
      <Stats />
      <Logos />
      <Testimonials />
    </div>
  )
}
