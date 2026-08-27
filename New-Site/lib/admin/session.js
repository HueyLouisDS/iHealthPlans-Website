// Resolves the admin session, with a development only bypass.
//
// Node only. This is where the token is checked against admin_users, because
// middleware runs on the edge and cannot reach the database. Every admin page
// and route calls this rather than auth() directly.

/*=============================================
    THE ADMIN AUTH BYPASS, DEVELOPMENT ONLY
=============================================*/
import { auth, isAuthorisedAdmin } from '@/auth'

export function devAuthBypassEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.LH_ADMIN_DEV_BYPASS_AUTH === 'true'
}

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

  const session = await auth()
  if (!session?.user?.email) return session

  /*
   Re-checked here rather than trusted from the token. The token says what was
   true at sign in, and a session lasts 8 hours, so without this a revoked
   account keeps working for the rest of the day.
  */
  const stillAllowed = await isAuthorisedAdmin({
    email: session.user.email,
    email_verified: true,
  })

  if (!stillAllowed) {
    console.warn('[admin] token still valid but access revoked for %s', session.user.email)
    return { ...session, user: { ...session.user, isAuthorised: false } }
  }

  // Best effort, so a write failure never costs somebody a page
  const { touchLastSeen } = await import('@/lib/db/queries/adminUsers')
  await touchLastSeen(session.user.email)

  return { ...session, user: { ...session.user, isAuthorised: true } }
}
