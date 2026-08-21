/**
 * The TTY code and office hours that must sit beside every phone number.
 *
 * From the Spark website guidelines, in the section that applies to all sites
 * a TPMO leverages rather than only to marketing ones:
 *
 *   "Include TTY and days and hours of operation with a phone number."
 *
 * Three items, together. TTY alone in a footer does not satisfy it when the
 * number in the hero has nothing beside it, which is why this is a component
 * rather than a line copied into each call to action. Copied lines are how one
 * of them ends up missing after a redesign nobody thought was risky.
 *
 * 711 is the national relay code and needs nothing from us technically. A
 * caller dials it, reaches a relay operator, and the operator dials the office
 * on an ordinary voice line. See the note in lib/siteConfig.js.
 */

import { PHONE_TTY, BUSINESS_HOURS } from '@/lib/siteConfig'

/**
 * Renders the line.
 * `tone` is dark when it sits on a photographic or brand coloured panel, where
 * the muted grey used elsewhere would fail contrast against a dark ground.
 */
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
