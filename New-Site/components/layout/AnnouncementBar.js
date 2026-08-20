/**
 * The dark blue call bar pinned above the header.
 * Two variants of the copy exist on the live site, one in the desktop header
 * and a longer one inside the open mobile menu, so the message is a prop.
 */

import CallLink from '@/components/tracking/CallLink'
import { PHONE_NUMBER, PHONE_TTY, BUSINESS_HOURS } from '@/lib/siteConfig'

/**
 * Renders the announcement bar.
 * `variant` picks which of the 2 approved sentences follows the number.
 * `location` is passed through to CallLink so the 2 bars stay distinguishable
 * in the click report even though they show the same number.
 */
export default function AnnouncementBar({ variant = 'header', location = 'announcementBar' }) {
  const isMenu = variant === 'menu'

  return (
    <section className="bg-ihealthBlue text-white px-4 py-2 border-b-4 border-b-ihealthGreen">
      <p className="text-[clamp(12px,1.48vw,16px)] text-center mx-auto">
        Call us today{' '}
        <CallLink location={location} className="font-bold">
          {PHONE_NUMBER}{' '}
          {isMenu ? `(${PHONE_TTY})` : <span className="sm:hidden">({PHONE_TTY})</span>}
        </CallLink>{' '}
        {isMenu ? (
          <>
            to get a quote for your Medicare Advantage Plan, Medicare Supplement Plan or
            Prescription Drug Plan. {BUSINESS_HOURS}.
          </>
        ) : (
          <>
            to speak with a licensed insurance agent.
            <span className="sm:hidden"> {BUSINESS_HOURS}.</span>
          </>
        )}
        <br className="xxl:hidden" />
        <span className="ml-1 md:ml-2 text-white/80 font-light">
          A non-government entity powered by iHealth Plans, a health insurance agency.
        </span>
      </p>
    </section>
  )
}
