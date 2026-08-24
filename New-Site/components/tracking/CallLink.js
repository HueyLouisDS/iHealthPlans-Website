'use client'

/**
 * Every phone link on the site renders through this component.
 * It exists so click to call becomes trackable in one place instead of 355.
 * Today it renders a plain tel: anchor, tomorrow the click handler posts to
 * /api/call/click, gets back a callId bound to the visitor's session, and
 * that id is what joins the web session to the call recording and the CRM.
 */

import { PHONE_NUMBER } from '@/lib/siteConfig'

/**
 * Renders a tel: anchor and reports the click.
 * Wraps the number so attribution has a single seam. `location` names where on
 * the page the click happened, which is what makes the funnel report useful,
 * a header click and a hero click are very different intent signals.
 */
export default function CallLink({ location, className, children, number = PHONE_NUMBER }) {
  // tel: cannot contain spaces or formatting, strip anything that is not a digit
  const dialable = number.replace(/[^0-9+]/g, '')

  /**
   * Fires on click, before the dialer opens.
   * Kept deliberately non blocking. The call must start even if tracking
   * fails, so nothing here is awaited and nothing can reject into the anchor.
   */
  function handleClick() {
    /*
     * TODO post to /api/call/click with the sessionId, the page path, and
     * `location`, then swap the href for the pooled number that route returns.
     * Until that route exists this is a no op and the anchor behaves normally.
     */
  }

  return (
    <a href={`tel:${dialable}`} className={className} onClick={handleClick} data-lh-call-location={location}>
      {children}
    </a>
  )
}
