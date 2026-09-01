// The page view beacon, POST /api/track.
//
// Establishes the visitor and session cookies and writes the pair of rows the
// whole identity chain hangs off. Called by components/tracking/Beacon.js on
// first load and on every client side route change.

/*=============================================
    THIS ROUTE MUST NEVER FAIL A PAGE
=============================================*/
import { NextResponse } from 'next/server'

import { readIdentity, writeIdentity } from '@/lib/identity/resolve'
import { readTouch, emptyTouch } from '@/lib/attribution/touch'
import { requestFacts, accepted, MAX_BODY_BYTES } from '@/lib/analytics/beacon'
import { recordVisit } from '@/lib/db/queries/identity'
import { CANONICAL_HOST } from '@/lib/siteConfig'

// node rather than edge, the database driver needs it
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*
 Built from the request path and the query the browser reports, not from a
 source and medium the browser worked out for itself. Resolution stays on the
 server so one implementation decides what a touch is, and so a payload cannot
 declare itself to be google / cpc.
*/
/* 204 carries no body, so it is built directly rather than through NextResponse.json */
function emptyResponse() {
  return new NextResponse(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function landingUrl(payload) {
  const path = typeof payload?.path === 'string' ? payload.path : '/'
  const search = typeof payload?.search === 'string' ? payload.search : ''

  // Absolute because URL needs an origin. The host is ours, never the payload's.
  return `https://${CANONICAL_HOST}${path.startsWith('/') ? path : `/${path}`}${search}`
}

export async function POST(request) {
  const identity = readIdentity(request)
  const facts = requestFacts(request)

  /*
   The cookies are set on every response including the ones that write
   nothing. A bot gets an identity and no rows, which costs nothing, and it
   means the response shape does not tell a caller whether it was filtered.
  */
  const response = writeIdentity(emptyResponse(), identity)

  if (facts.isBot) return response

  let payload = null

  try {
    const body = await request.text()
    if (body.length > MAX_BODY_BYTES) return response
    payload = body ? JSON.parse(body) : null
  } catch {
    // A malformed payload still gets an identity, it just resolves to direct
    payload = null
  }

  /*
   Only a new session resolves a touch. Inside the 30 minute window the insert
   is a no op on everything but last_active_at, so re-resolving would burn the
   work and risk overwriting the arrival campaign if that rule ever changed.
  */
  const touch = identity.isNewSession
    ? readTouch({
        url: landingUrl(payload),
        referrer: typeof payload?.referrer === 'string' ? payload.referrer : null,
        siteHost: CANONICAL_HOST,
      })
    : emptyTouch()

  try {
    await recordVisit({ identity, touch, facts })
  } catch (cause) {
    /*
     Swallowed on purpose. This route is fired by every page on the site, and
     a database that is down or unmigrated must not turn into a failed request
     in the browser. The log is the record that it happened.
    */
    console.error('[track] could not record visit %s: %s', identity.sessionId, cause.message)
  }

  return response
}

// Anything but POST, so a crawler following the path gets a clean answer
export function GET() {
  return accepted()
}
