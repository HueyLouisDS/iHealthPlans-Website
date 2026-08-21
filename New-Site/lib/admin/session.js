/**
 * Resolves the admin session, with a development only bypass.
 */

/*=============================================
    THE BYPASS EXISTS SO THE ADMIN UI CAN BE BUILT BEFORE A GOOGLE OAUTH CLIENT
    IS SET UP. It is guarded twice and both must hold.

      NODE_ENV !== 'production'      next build always sets production, so a
                                     built and deployed app can never take this
                                     path no matter what the environment says.
      ADMIN_DEV_BYPASS_AUTH==='true' explicit opt in, exact string, in .env.local

    That means the bypass only works under `next dev` on a developer's machine.
    It is not a flag somebody can flip in production hosting and it is not a
    default. Any page reached through it shows a banner saying authentication is
    bypassed.

    Delete this file once a Google OAuth client exists. It has no reason to
    survive past that point.
=============================================*/

import { auth } from '@/auth'

/**
 * True only when both guards hold.
 * Kept as its own function so the condition is stated once and every caller,
 * including middleware, agrees on it.
 */
export function devAuthBypassEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ADMIN_DEV_BYPASS_AUTH === 'true'
}

/**
 * Returns the session for an admin page, or null.
 * Pages call this rather than auth() directly, so the bypass is applied
 * consistently and there is one place to remove it.
 */
export async function getAdminSession() {
  if (devAuthBypassEnabled()) {
    return {
      user: {
        name: 'Development bypass',
        email: 'dev-bypass@localhost',
        isAuthorised: true,
        isDevBypass: true,
      },
    }
  }

  return auth()
}
