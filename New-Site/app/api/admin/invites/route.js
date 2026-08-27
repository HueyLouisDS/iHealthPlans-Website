// Admin access management, POST and DELETE /api/admin/invites.
//
// POST   adds an address to admin_users and mints an invite link for it
// DELETE revokes an address, keeping the row for the record
//
// Backs the Verify and remove controls on the Admin Access card.
import { getAdminSession } from '@/lib/admin/session'
import { allowedDomain } from '@/auth.config'
import { addAdminUser, createInvite, revokeAdminUser } from '@/lib/db/queries/adminUsers'
import { databaseConfigured } from '@/lib/db/client'
import { SITE_URL } from '@/lib/siteConfig'
import { ERRORS, errorResponse } from '@/lib/errorCodes'

// node rather than edge, this reads the database
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*=============================================
    AN INVITE IS A CREDENTIAL, THE LINK IS SHOWN ONCE
=============================================*/

/*
 The token is returned in this response and nowhere else. It is hashed before
 it is stored, so a lost link is reissued rather than recovered, and nobody
 reading the table later can use one.
*/

function checkEmail(value) {
  const email = String(value || '').trim().toLowerCase()

  if (!/^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/.test(email)) return { error: 'That is not an email address.' }

  /*
   The domain is enforced here as well as in the UI. Without it a direct POST
   adds an off domain row, and auth.js would then be the only thing standing
   between that row and the admin area.
  */
  if (!allowedDomain) return { error: 'LH_ADMIN_ALLOWED_DOMAIN is not set.' }
  if (email.split('@')[1] !== allowedDomain) {
    return { error: `Only ${allowedDomain} addresses can be given access.` }
  }

  return { email }
}

async function requireAdmin() {
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null
  return session
}

export async function POST(request) {
  const session = await requireAdmin()
  if (!session) return errorResponse(ERRORS.unauthorised, { error: 'Sign in to manage access.' })

  if (!databaseConfigured()) {
    return errorResponse(ERRORS.forbidden, { error: 'No database configured, so there is nowhere to record an invite.' })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  const { email, error } = checkEmail(body?.email)
  if (error) return errorResponse(ERRORS.invalidPayload, { error })

  const user = await addAdminUser(email, session.user.email)
  const invite = await createInvite(email, session.user.email)

  console.warn('[admin] invite issued for %s by %s', email, session.user.email)

  return Response.json(
    {
      status: 'invited',
      email,
      accountStatus: user?.status ?? 'invited',
      // Shown once. Not stored, and not recoverable from the database.
      link: `${SITE_URL}/admin/invite/${invite.token}`,
      expiresInDays: invite.expiresInDays,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function DELETE(request) {
  const session = await requireAdmin()
  if (!session) return errorResponse(ERRORS.unauthorised, { error: 'Sign in to manage access.' })

  let body
  try {
    body = await request.json()
  } catch {
    return errorResponse(ERRORS.malformedJson, { error: 'Expected a JSON body.' })
  }

  const email = String(body?.email || '').trim().toLowerCase()
  if (!email) return errorResponse(ERRORS.invalidPayload, { error: 'No address given.' })

  /*
   Refusing to revoke the last active administrator, since doing so locks
   everybody out of the page that would undo it. Break glass would still get
   in, but only on a machine where LH_DEVELOPER_EMAIL is set.
  */
  if (email === String(session.user.email || '').toLowerCase()) {
    return errorResponse(ERRORS.invalidPayload, { error: 'You cannot revoke your own access.' })
  }

  const changed = await revokeAdminUser(email, session.user.email)
  if (changed === 0) return errorResponse(ERRORS.invalidPayload, { error: 'That address is not on the list.' })

  console.warn('[admin] access revoked for %s by %s', email, session.user.email)

  return Response.json({ status: 'revoked', email }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  return errorResponse(ERRORS.methodNotAllowed, {
    error: 'POST { email } to invite, DELETE { email } to revoke.',
  })
}
