'use client'

// Fires the page view beacon at /api/track on first load and on every client
// side route change. Mounted once in the root layout, renders nothing.
// The server does all the resolution, this only reports where the browser is.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

const TRACK_ENDPOINT = '/api/track'
const ADMIN_PREFIX = '/admin'           // the reporting tool does not report on itself

/*=======================================================
        SEND BEACON FIRST, FETCH ONLY AS A FALLBACK
========================================================*/

/*
 sendBeacon is queued by the browser and survives the page being closed, which
 an ordinary fetch does not. The click that matters most is often the last
 thing somebody does before leaving, so the fallback carries keepalive to get
 as close to the same behaviour as it can.
*/
function send(endpoint, payload) {
  const body = JSON.stringify(payload)

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    // Blob rather than a bare string, so the content type is not text/plain
    const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
    if (sent) return
  }

  fetch(endpoint, {
    method: 'POST',
    body,
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {
    // Nothing to do and nobody to tell. A dropped beacon is a missing row,
    // not a broken page, and retrying would double count the ones that landed.
  })
}

export default function Beacon() {
  const pathname = usePathname()
  const hasFired = useRef(false)        // false until the first beacon of this mount

  useEffect(() => {
    if (!pathname || pathname.startsWith(ADMIN_PREFIX)) return

    /*
     document.referrer only means anything on the first view of a visit. After
     a client side navigation it still holds the original external referrer,
     and sending it again would look like a second arrival from the same
     campaign. The server ignores it on an existing session either way, this
     is belt and braces on the side that knows which view it is.
    */
    const referrer = hasFired.current ? null : document.referrer || null

    hasFired.current = true

    /*
     Read off window rather than useSearchParams, which forces the nearest
     boundary into client rendering and needs a Suspense wrapper. This runs in
     an effect, so the browser value is always available and always current.
    */
    send(TRACK_ENDPOINT, {
      path: pathname,
      search: window.location.search || '',
      referrer,
    })
  }, [pathname])

  return null
}
