// TTY code and office hours, which the Spark guidelines require together
// beside every phone number. A component rather than a copied line, because a
// copied line is how one call to action ends up missing it after a redesign.

import { PHONE_TTY, BUSINESS_HOURS } from '@/lib/siteConfig'

export default function CallAccessDetails({ tone = 'light', className = '' }) {
  return (
    <p className={`text-sm ${tone === 'dark' ? 'text-white/80' : 'text-[#505258]'} ${className}`}>
      {PHONE_TTY}
      {/* Decorative, so a screen reader reads the 2 facts as separate
          statements rather than announcing a bullet between them */}
      <span aria-hidden="true"> &middot; </span>
      {BUSINESS_HOURS}
    </p>
  )
}
