// The call click beacon, POST /api/call/click.
//
// Mints the row that binds a web session to the phone call that follows. A
// tel: link leaves no trace on our side, so this is the only moment the two
// can be connected, and the match against the dialer log happens later.

/*=============================================
    THE CLICK ID IS MINTED HERE, NOT BY THE BROWSER
=============================================*/
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

import { readIdentity, writeIdentity } from '@/lib/identity/resolve'
import { emptyTouch } from '@/lib/attribution/touch'
import { requestFacts, MAX_BODY_BYTES } from '@/lib/analytics/beacon'
import { recordCallClick } from '@/lib/db/queries/identity'
import { PHONE_NUMBER } from '@/lib/siteConfig'

// node rather than edge, the database driver and node:crypto both need it
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LOCATION = 120                // call_clicks.location, migration 001
const MAX_PAGE_PATH = 500               // call_clicks.page_path
const UNKNOWN_LOCATION = 'unknown'      // location is NOT NULL, so it needs a floor

function text(value, max, fallback = null) {
  if (typeof value !== 'string') return fallback

  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : fallback
}

/*
 The path is taken from the payload because the beacon fires from a client
 route where the server has no other way to know it. It is clamped and never
 parsed, so the worst a bad value does is put a wrong string in a report.
*/
function pagePath(payload) {
  const path = text(payload?.path, MAX_PAGE_PATH, '/')
  return path.startsWith('/') ? path : `/${path}`
}

export async function POST(request) {
  const identity = readIdentity(request)
  const facts = requestFacts(request)

  const response = writeIdentity(
    new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } }),
    identity
  )

  if (facts.isBot) return response

  let payload = null

  try {
    const body = await request.text()
    if (body.length > MAX_BODY_BYTES) return response
    payload = body ? JSON.parse(body) : null
  } catch {
    payload = null
  }

  /*
   A click arriving as the first action of a visit has no session row yet, so
   it carries a touch for the one recordCallClick will create. Inside an
   existing session the insert is a no op on everything but last_active_at, so
   an empty touch there changes nothing.
  */
  const touch = emptyTouch()

  try {
    await recordCallClick({
      // Minted server side so a browser cannot choose it, replay it, or
      // collide two visitors onto one id
      clickId: randomUUID(),
      identity,
      touch,
      facts,
      click: {
        location: text(payload?.location, MAX_LOCATION, UNKNOWN_LOCATION),
        pagePath: pagePath(payload),
        /*
         Read from config rather than the payload. There is one number today,
         so the server already knows it and a claimed one would only ever be
         wrong or hostile. When number pooling lands, this reads the number
         that was actually served to this session.
        */
        presentedNumber: PHONE_NUMBER,
      },
    })
  } catch (cause) {
    /*
     Swallowed, same as /api/track. The tel: link has already opened the
     dialler by the time this resolves, so throwing achieves nothing except
     an error in a console the caller will never see.
    */
    console.error('[call-click] could not record click for %s: %s', identity.sessionId, cause.message)
  }

  return response
}
