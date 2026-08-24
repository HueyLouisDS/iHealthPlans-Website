// Gradient page hero, shared by the product pages and the enrollment pages.
// Extracted from ProductPage rather than copied, so the 7 landing pages that
// use it cannot drift apart visually.
//
// Deliberately not a photo hero. Choosing stock photography for regulated
// pages is a client decision, and the brand gradient is already part of the
// design system, so these ship without waiting on image selection.

import Link from 'next/link'
import CallLink from '@/components/tracking/CallLink'
import CallAccessDetails from '@/components/compliance/CallAccessDetails'
import { PHONE_NUMBER } from '@/lib/siteConfig'

export default function PageHero({ eyebrow, headline, intro, callLocation, children }) {
  return (
    <div className="w-full bg-[linear-gradient(96deg,var(--ihealth-blue)_20%,var(--ihealth-green)_140%)] text-white">
      <div className="w-full max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-start">
        <h6 className="border-l-2 border-l-ihealthGreen pl-3 uppercase tracking-[3px] text-sm font-extralight mb-3">
          {eyebrow}
        </h6>

        <h1 className="text-3xl sm:text-5xl font-bold leading-[120%] mb-4 max-w-3xl">{headline}</h1>

        <p className="text-lg sm:text-xl font-light max-w-3xl mb-8">{intro}</p>

        {/* Slot for anything page specific above the buttons, such as the
            live enrollment status banner on the AEP page */}
        {children}

        <div className="flex flex-wrap flex-col-reverse sm:flex-row items-start gap-4">
          <Link
            href="/quote-health-plans"
            className="px-7 py-2.5 rounded-lg sm:text-lg bg-white text-ihealthBlue font-semibold min-w-[225px] text-center"
          >
            Get a Free Quote
          </Link>
          <CallLink
            location={callLocation}
            className="bg-transparent text-white border border-white/60 hover:border-white transition-colors px-7 py-2.5 rounded-lg sm:text-lg"
          >
            Call Now {PHONE_NUMBER}
          </CallLink>
        </div>

        {/* Required beside the number, not only in the footer */}
        <CallAccessDetails tone="dark" className="mt-3" />
      </div>
    </div>
  )
}
