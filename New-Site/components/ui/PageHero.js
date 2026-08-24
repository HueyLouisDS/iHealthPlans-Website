// Gradient page hero, shared by the product pages and the enrollment pages.
// Extracted from ProductPage rather than copied, so the 7 landing pages that
// use it cannot drift apart visually.
//
// Deliberately not a photo hero. Choosing stock photography for regulated
// pages is a client decision, and the brand gradient is already part of the
// design system, so these ship without waiting on image selection.

import OfficeStatusCta from '@/components/marketing/OfficeStatusCta'

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

        {/* Hours aware, so a visitor arriving outside the 42.5 staffed hours is
            offered a callback rather than a number that rings out. Carries the
            TTY code and hours with it, which must sit beside the number. */}
        <OfficeStatusCta location={callLocation} tone="dark" />
      </div>
    </div>
  )
}
