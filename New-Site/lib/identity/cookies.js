// Cookie names and options for the visitor and session identity chain.
// Named here before the code that sets them exists, because a cookie name is
// the one thing that genuinely cannot be changed later. Rename it after launch
// and every returning visitor becomes a new one, which silently resets the
// attribution for the whole existing audience.

/*=======================================================
        THESE NAMES ARE PERMANENT
========================================================*/

export const VISITOR_COOKIE = 'lh_vid'  // the browser, persists across visits
export const SESSION_COOKIE = 'lh_sid'  // one visit, refreshed on activity

const TWO_YEARS_SECONDS = 63_072_000    // visitor lifetime, the practical ceiling browsers honour
const THIRTY_MINUTES_SECONDS = 1_800    // session lifetime, restarted by activity rather than fixed
export const visitorCookieOptions = {
  maxAge: TWO_YEARS_SECONDS,
  sameSite: 'lax',                      // lax not strict, or the cookie is absent on inbound ad clicks
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export const sessionCookieOptions = {
  maxAge: THIRTY_MINUTES_SECONDS,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}