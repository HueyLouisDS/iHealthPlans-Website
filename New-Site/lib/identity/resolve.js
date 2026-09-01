// Reads the visitor and session cookies off a request, minting either one that
// is missing, and writes them back onto the response.
// Both beacon routes go through here so a visitor arriving on a call click
// gets the same identity a page view would have given them.

import 'server-only'

import { randomUUID } from 'node:crypto'

import {
  VISITOR_COOKIE,
  SESSION_COOKIE,
  visitorCookieOptions,
  sessionCookieOptions,
} from '@/lib/identity/cookies'

/*
 A cookie value is whatever the browser was told to send back, so it is
 checked before it reaches a CHAR(36) column. Anything else is treated as
 absent and replaced, which self heals a truncated or hand edited cookie.
*/
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function readId(request, name) {
  const value = request.cookies.get(name)?.value
  return value && UUID_SHAPE.test(value) ? value : null
}

/*=======================================================
        A MISSING SESSION IS A NEW VISIT, NOT AN ERROR
========================================================*/

/*
 The session cookie expires after 30 minutes of inactivity, so its absence is
 the definition of a new visit rather than a fault to recover from. The
 visitor cookie outliving it is the normal case and the whole point of holding
 two.

 isNewSession drives whether a touch is resolved and written. A returning
 request inside the window must not re-resolve one, or a page to page move
 would overwrite the campaign that brought somebody in with an internal
 referrer.
*/
export function readIdentity(request) {
  const visitorId = readId(request, VISITOR_COOKIE)
  const sessionId = readId(request, SESSION_COOKIE)

  return {
    visitorId: visitorId || randomUUID(),
    sessionId: sessionId || randomUUID(),
    isNewVisitor: !visitorId,
    isNewSession: !sessionId,
  }
}

/*
 Both are re-set on every beacon, not only when minted. The session cookie has
 to be, since its 30 minute window slides on activity and a cookie that is
 only written once expires mid visit. The visitor cookie is re-set for the
 same reason at a 2 year scale, so somebody who returns every month keeps the
 same id indefinitely rather than aging out on the original write.
*/
export function writeIdentity(response, identity) {
  response.cookies.set(VISITOR_COOKIE, identity.visitorId, visitorCookieOptions)
  response.cookies.set(SESSION_COOKIE, identity.sessionId, sessionCookieOptions)

  return response
}
