/**
 * Authentication for the admin area. Google Workspace sign in only.
 * This is the file that decides who can read lead PII and call recordings, so
 * it is deliberately small and everything in it is explicit.
 *
 * Two independent checks must both pass, and neither is sufficient alone.
 *
 * 1. The account's email domain must match ADMIN_ALLOWED_DOMAIN, and it must
 *    be verified by Google. This is checked here on the server, against the
 *    profile Google returns. The `hd` parameter sent in the authorization
 *    request is only a hint to Google's account chooser, it is trivially
 *    altered by the caller, and it must never be treated as a control.
 *
 * 2. The email address must appear in ADMIN_ALLOWED_EMAILS. The domain check
 *    alone would admit all 150 licensed agents, and this area is for the
 *    management team. An allowlist is crude but it is auditable, it fails
 *    closed, and it needs no Directory API access to maintain.
 *
 * TODO when the management list becomes tedious to maintain by hand, move to a
 * Google Group membership check via the Admin SDK. That needs a service
 * account with domain wide delegation, which is a bigger setup than a single
 * client at this size currently justifies.
 */

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

/**
 * Parses a comma separated environment variable into a lowercase set.
 * Lowercasing matters because email comparison must not be case sensitive,
 * and a case mismatch here would lock out a legitimate administrator.
 */
function parseList(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  )
}

const allowedDomain = String(process.env.ADMIN_ALLOWED_DOMAIN || '').trim().toLowerCase()
const allowedEmails = parseList(process.env.ADMIN_ALLOWED_EMAILS)

/**
 * Decides whether an authenticated Google account may enter the admin area.
 * Exported separately so it can be unit tested without standing up an OAuth
 * flow, and so route handlers can re-check rather than trusting a session
 * that was issued before the allowlist changed.
 */
export function isAuthorisedAdmin(profile) {
  if (!profile) return false

  const email = String(profile.email || '').trim().toLowerCase()
  if (!email) return false

  // Google tells us whether it has verified the address. An unverified address
  // proves nothing about who controls it.
  if (profile.email_verified === false) return false

  // Fail closed. A misconfigured or missing environment variable must deny
  // everyone rather than admit everyone, which is the failure mode that
  // matters here.
  if (!allowedDomain || allowedEmails.size === 0) return false

  const domain = email.split('@')[1]
  if (domain !== allowedDomain) return false

  return allowedEmails.has(email)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      // A hint only. It pre-filters Google's account chooser so a personal
      // account is not offered, which is a usability nicety. The real check
      // is isAuthorisedAdmin below.
      authorization: { params: { hd: allowedDomain, prompt: 'select_account' } },
    }),
  ],

  pages: {
    signIn: '/admin/signin',
    error: '/admin/signin',
  },

  session: {
    strategy: 'jwt',
    // Short by ordinary standards. This session opens lead PII and call
    // recordings, so an unattended laptop should stop being a way in within a
    // working day rather than a month.
    maxAge: 8 * 60 * 60,
  },

  callbacks: {
    /**
     * The gate. Returning false here aborts the sign in and Google's account
     * is never issued a session.
     */
    signIn({ profile }) {
      return isAuthorisedAdmin(profile)
    },

    /**
     * Copies the fields the admin UI needs onto the token, and nothing else.
     * The Google profile carries more than we need and none of the rest
     * should end up in a cookie.
     */
    jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email
        token.name = profile.name
        token.picture = profile.picture
      }
      return token
    },

    /**
     * Re-checks authorisation on every session read rather than trusting the
     * token alone. Removing someone from ADMIN_ALLOWED_EMAILS then takes
     * effect on their next request instead of whenever their session happens
     * to expire.
     */
    session({ session, token }) {
      session.user.email = token.email
      session.user.name = token.name
      session.user.image = token.picture
      session.user.isAuthorised = isAuthorisedAdmin({ email: token.email, email_verified: true })
      return session
    },
  },

  // TODO route these to a real audit log once the database exists. Who signed
  // in, and when, is the minimum record to keep for a system holding this
  // data, and it is also the first thing anyone will ask for after an
  // incident.
  events: {
    signIn({ user }) {
      console.info('[admin] sign in', { email: user?.email, at: new Date().toISOString() })
    },
    signOut() {
      console.info('[admin] sign out', { at: new Date().toISOString() })
    },
  },
})
