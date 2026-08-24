// Cookie names and options for the visitor and session identity chain.
// Named here before the code that sets them exists, because a cookie name is
// the one thing that genuinely cannot be changed later. Rename it after launch
// and every returning visitor becomes a new one, which silently resets the
// attribution for the whole existing audience.

/*=======================================================
        THESE NAMES ARE PERMANENT
========================================================*/

/*
 A visitor cookie is a 2 year identifier sitting in browsers we do not
 control. There is no migration for it. Whatever ships first is the name
 forever, so it is settled here rather than invented inline by whoever
 writes the tracking route.

 Short values on purpose. These ride on every request including static asset
 requests, so 4 characters of name and a uuid is the whole budget.
*/
export const VISITOR_COOKIE = 'lh_vid'  // the browser, persists across visits
export const SESSION_COOKIE = 'lh_sid'  // one visit, refreshed on activity

const TWO_YEARS_SECONDS = 63_072_000    // visitor lifetime, the practical ceiling browsers honour
const THIRTY_MINUTES_SECONDS = 1_800    // session lifetime, restarted by activity rather than fixed

/*
 Cookie options for the visitor identifier.

 Not httpOnly, deliberately. The client side tracking has to read the visitor
 id to attach it to a call click before the request leaves the page, and a
 cookie the page cannot read would need a round trip to fetch a value the
 browser already has.

 That is an acceptable trade only because this value is an opaque random id.
 It is not a session token, it grants nothing, and reading it tells an
 attacker only what they already knew about their own browser.
*/
export const visitorCookieOptions = {
  maxAge: TWO_YEARS_SECONDS,
  sameSite: 'lax',                      // lax not strict, or the cookie is absent on inbound ad clicks
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

/*
 Cookie options for the session identifier.
 Same reasoning as the visitor cookie, shorter life.
*/
export const sessionCookieOptions = {
  maxAge: THIRTY_MINUTES_SECONDS,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

/*
 TODO the consent question. These are first party analytics identifiers
 rather than advertising ones, so several state privacy laws treat them
 differently from a tracking cookie. Confirm with compliance whether they
 need a banner before the tracking route ships, because retrofitting consent
 to an identifier already set is worse than gating it from the start.
*/
