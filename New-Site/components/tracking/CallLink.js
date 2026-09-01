'use client'
import { PHONE_NUMBER } from '@/lib/siteConfig'

const CLICK_ENDPOINT = '/api/call/click'

export default function CallLink({ location, className, children, number = PHONE_NUMBER }) {
  const dialable = number.replace(/[^0-9+]/g, '')   // tel: takes digits only, no formatting

  /*-------- This is critical --------*/
  /*
   Nothing here may block or delay the tel: link. The click is not prevented,
   nothing is awaited, and no state is set, so the dialler opens at exactly
   the speed it would without this.

   sendBeacon is what makes that safe. It hands the payload to the browser and
   returns, and the browser delivers it even though the page is being replaced
   by the dialler a moment later. An ordinary fetch is cancelled at that point,
   which is why the fallback carries keepalive.
  */
  function handleClick() {
    const body = JSON.stringify({ location, path: window.location.pathname })

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(CLICK_ENDPOINT, new Blob([body], { type: 'application/json' }))
      if (sent) return
    }

    fetch(CLICK_ENDPOINT, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {
      // A dropped click is an unmatched call later, not a broken link now
    })
  }

  return (
    <a href={`tel:${dialable}`} className={className} onClick={handleClick} data-lh-call-location={location}>
      {children}
    </a>
  )
}
