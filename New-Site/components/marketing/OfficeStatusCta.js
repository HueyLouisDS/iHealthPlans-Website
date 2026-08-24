'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import CallLink from '@/components/tracking/CallLink'
import CallAccessDetails from '@/components/compliance/CallAccessDetails'
import { getOfficeStatus } from '@/lib/officeHours'
import { PHONE_NUMBER } from '@/lib/siteConfig'

export default function OfficeStatusCta({ location, tone = 'dark' }) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    setStatus(getOfficeStatus())
  }, [])
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

        <CallAccessDetails tone={tone === 'dark' ? 'dark' : 'light'} className="w-full" />
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

        <CallAccessDetails tone={tone === 'dark' ? 'dark' : 'light'} />
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

      <CallAccessDetails tone={tone === 'dark' ? 'dark' : 'light'} />
    </div>
  )
}
