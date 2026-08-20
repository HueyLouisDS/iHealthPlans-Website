'use client'

/**
 * The primary call to action pair, which changes depending on whether the
 * phone line is staffed.
 *
 * Open      calling is the primary action, which suits the beneficiary
 * Closed    requesting a callback is primary, which suits the adult child or
 *           appointed representative researching in the evening or at a
 *           weekend, who is otherwise hitting a line that just rings out
 *
 * The number is never hidden when closed, only demoted. People will call
 * anyway, leave a voicemail, or note it for the morning, and removing it takes
 * that away for no gain.
 *
 * Computed on mount rather than on the server, for the same reason as the
 * enrollment banner. A statically rendered page would freeze the answer at
 * build time and confidently tell someone on Sunday that the office is open.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CallLink from '@/components/tracking/CallLink'
import { getOfficeStatus } from '@/lib/officeHours'
import { PHONE_NUMBER } from '@/lib/siteConfig'

/**
 * Renders the buttons, plus a line of status text above them.
 *
 * `location` is passed through to CallLink so a call placed while the office
 * is shut is distinguishable in the funnel report from one placed while it is
 * open. Those are very different events and collapsing them would hide
 * exactly the behaviour this component exists to address.
 */
export default function OfficeStatusCta({ location, tone = 'dark' }) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    setStatus(getOfficeStatus())
  }, [])

  // Server render and first client pass. Show the neutral pair rather than
  // nothing, so the call to action is never missing for a visitor whose
  // JavaScript is slow or blocked.
  if (!status) {
    return (
      <div className="flex flex-wrap flex-col-reverse sm:flex-row items-start gap-4">
        <Link
          href="/quote-health-plans"
          className="px-7 py-2.5 rounded-lg sm:text-lg bg-ihealthGreen text-white font-semibold min-w-[225px] text-center"
        >
          Get a Free Quote
        </Link>
        <CallLink
          location={`${location}:unknownHours`}
          className="bg-transparent text-white border border-white/60 hover:border-white transition-colors px-7 py-2.5 rounded-lg sm:text-lg"
        >
          Call Now {PHONE_NUMBER}
        </CallLink>
      </div>
    )
  }

  const mutedText = tone === 'dark' ? 'text-white/80' : 'text-[#505258]'

  if (status.isOpen) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className={`text-base flex items-center gap-2 ${mutedText}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-ihealthGreen flex-shrink-0" aria-hidden="true" />
          Licensed agents are available now
        </p>

        <div className="flex flex-wrap flex-col-reverse sm:flex-row items-start gap-4">
          <CallLink
            location={`${location}:open`}
            className="px-7 py-2.5 rounded-lg sm:text-lg bg-ihealthGreen text-white font-semibold min-w-[225px] text-center inline-flex items-center justify-center"
          >
            Call Now {PHONE_NUMBER}
          </CallLink>
          <Link
            href="/quote-health-plans"
            className={`px-7 py-2.5 rounded-lg sm:text-lg border transition-colors ${
              tone === 'dark'
                ? 'bg-transparent text-white border-white/60 hover:border-white'
                : 'bg-transparent text-ihealthBlue border-ihealthBlue/40 hover:border-ihealthBlue'
            }`}
          >
            Get a Free Quote
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className={`text-base flex items-center gap-2 ${mutedText}`}>
        <span className="w-2.5 h-2.5 rounded-full bg-white/50 flex-shrink-0" aria-hidden="true" />
        Our agents are not available right now. We open {status.nextOpenLabel}.
      </p>

      <div className="flex flex-wrap flex-col-reverse sm:flex-row items-start gap-4">
        <Link
          href="/quote-health-plans?callback=1"
          className="px-7 py-2.5 rounded-lg sm:text-lg bg-ihealthGreen text-white font-semibold min-w-[225px] text-center inline-flex items-center justify-center"
        >
          Request a Callback
        </Link>
        <CallLink
          location={`${location}:closed`}
          className={`px-7 py-2.5 rounded-lg sm:text-lg border transition-colors ${
            tone === 'dark'
              ? 'bg-transparent text-white border-white/60 hover:border-white'
              : 'bg-transparent text-ihealthBlue border-ihealthBlue/40 hover:border-ihealthBlue'
          }`}
        >
          Call {PHONE_NUMBER}
        </CallLink>
      </div>
    </div>
  )
}
