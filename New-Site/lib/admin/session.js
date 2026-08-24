// Resolves the admin session, with a development only bypass.

/*=============================================
    THE ADMIN AUTH BYPASS, DEVELOPMENT ONLY
=============================================*/

import { auth } from '@/auth'

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

  return auth()
}
