/**
 * Authentication for the admin area. Google Workspace sign in only.
 * This is the file that decides who can read lead PII and call recordings, so
 * it is deliberately small and everything in it is explicit.
 *
 * Two independent checks must both pass, and neither is sufficient alone.
 *
 * 1. The account's email domain must match LH_ADMIN_ALLOWED_DOMAIN, and it must
 *    be verified by Google. This is checked on the server, against the profile
 *    Google returns. The `hd` parameter sent in the authorization request is
 *    only a hint to Google's account chooser, it is trivially altered by the
 *    caller, and it must never be treated as a control.
 *
 * 2. The address must be an active row in admin_users. The domain check alone
 *    would admit all 150 licensed agents, and this area is for the management
 *    team.
 */

/*=======================================================
        THE EDGE CANNOT REACH THE DATABASE
========================================================*/

/*
 middleware.js runs on the edge runtime, where pg cannot load. It imports
 auth.config.js and never this file, which is what keeps the edge bundle
 clean. The split is not stylistic, importing this file from middleware fails
 the build.

   signIn           node, once per login. The gate. Queries the table.
   the token        carries the answer, so session() needs no database
   getAdminSession  node, every admin page. Re-checks, so a revoke lands.

 A revoked account keeps a valid token until it expires. Middleware lets them
 past, the page then refuses, which is why the page checks at all.
*/

import NextAuth from 'next-auth'
import { authConfig, preCheck, allowedEmails } from '@/auth.config'

export { preCheck } from '@/auth.config'

/*
 The environment allowlist, kept only until admin_users has rows in it. An
 empty table would otherwise lock out everybody including whoever was about to
 populate it.

 Every use logs, because this is a changeover measure and a warning appearing
 months from now means the table was never filled in and the deployed site is
 still governed by a comma separated string.
*/
function envFallback(email) {
  if (allowedEmails.size === 0) return false
  if (!allowedEmails.has(email)) return false

  console.warn(
    '[admin] LH_ADMIN_ALLOWED_EMAILS fallback admitted %s. admin_users is empty, seed it.',
    email
  )

  return true
}

/*-------- This is critical --------*/

/**
 * Decides whether an authenticated Google account may enter the admin area.
 * Node only, it reads the database. Exported so route handlers can re-check
 * rather than trusting a token issued before somebody was revoked.
 */
export async function isAuthorisedAdmin(profile) {
  const early = preCheck(profile)
  if (early !== null) return early

  const email = String(profile.email || '').trim().toLowerCase()
  const { isActiveAdmin, adminTableSeeded } = await import('@/lib/db/queries/adminUsers')

  if (await isActiveAdmin(email)) return true
  if (await adminTableSeeded()) return false

  return envFallback(email)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  callbacks: {
    ...authConfig.callbacks,

    /**
     * The gate. Runs on node, so this is where the database is asked.
     * Returning false aborts the sign in and no session is ever issued.
     */
    async signIn({ profile }) {
      return isAuthorisedAdmin(profile)
    },
  },

  // TODO route these to audit_log. Who signed in, and when, is the minimum
  // record to keep for a system holding this data, and it is the first thing
  // anyone will ask for after an incident.
  events: {
    signIn({ user }) {
      console.info('[admin] sign in', { email: user?.email, at: new Date().toISOString() })
    },
    signOut() {
      console.info('[admin] sign out', { at: new Date().toISOString() })
    },
  },
})
