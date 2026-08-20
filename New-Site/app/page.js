/**
 * Homepage. Composition only, every section is its own component so the page
 * reads as an outline of what a visitor scrolls through.
 * Section order is the live site's order and it is a funnel, do not shuffle it
 * without a reason worth measuring.
 */

import { HeaderSpacer } from '@/components/layout/Header'
import Hero from '@/components/marketing/Hero'
import TrustBar from '@/components/marketing/TrustBar'
import MedicareOverview from '@/components/marketing/MedicareOverview'
import DecadeOfService from '@/components/marketing/DecadeOfService'
import WhyChoose from '@/components/marketing/WhyChoose'
import Faq from '@/components/marketing/Faq'
import ZipCta from '@/components/marketing/ZipCta'

/**
 * Renders the homepage.
 */
export default function HomePage() {
  return (
    <>
      <HeaderSpacer />
      <main className="flex flex-col items-center justify-center">
        <Hero />
        <TrustBar />
        <MedicareOverview />
        <DecadeOfService />
        <WhyChoose />
        <Faq />
        <ZipCta />
      </main>
    </>
  )
}
