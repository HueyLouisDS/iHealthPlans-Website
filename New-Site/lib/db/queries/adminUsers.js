// Who may open the admin area, and the invites that get them there.
// Backs auth.js, the integrations page, and the invite accept route.
import 'server-only'

import crypto from 'node:crypto'
import { query, queryOne, execute, databaseConfigured } from '@/lib/db/client'

export const INVITED = 'invited'
export const ACTIVE = 'active'
export const REVOKED = 'revoked'

const INVITE_TTL_DAYS = 7
const TOKEN_BYTES = 32

/*
 Every comparison is on the lowercased address. A mixed case row is an account
 that silently never matches, which reads as a broken login rather than as a
 data problem.
*/
function normalise(email) {
  return String(email || '').trim().toLowerCase()
}

// sha256, so the table holds a fingerprint and never a working credential
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function listAdminUsers() {
  if (!databaseConfigured()) return []

  return query(
    `SELECT email, status, full_name, invited_at, activated_at, last_seen_at
       FROM admin_users
      WHERE status <> ?
      ORDER BY email`,
    [REVOKED]
  )
}

/*-------- This is critical --------*/

/*
 The only question that decides whether somebody sees beneficiary data.
 Returns false for anything it is not certain about, including a missing
 database, so a connection failure locks the door rather than opening it.
*/
export async function isActiveAdmin(email) {
  if (!databaseConfigured()) return false

  const row = await queryOne('SELECT status FROM admin_users WHERE email = ?', [normalise(email)])
  return row?.status === ACTIVE
}

/* whether the table has anything in it, which decides if the env fallback runs */
export async function adminTableSeeded() {
  if (!databaseConfigured()) return false

  const row = await queryOne('SELECT count(*)::int AS total FROM admin_users WHERE status <> ?', [
    REVOKED,
  ])
  return (row?.total ?? 0) > 0
}

/*
 Adds somebody to the list without inviting them yet. Re-adding a revoked
 person returns them to invited rather than failing, since the row was kept
 for the record rather than to block a rehire.
*/
export async function addAdminUser(email, invitedBy) {
  if (!databaseConfigured()) return null

  const rows = await query(
    `INSERT INTO admin_users (email, status, invited_by, invited_at)
     VALUES (?, ?, ?, now())
     ON CONFLICT (email) DO UPDATE SET
       status = CASE WHEN admin_users.status = '${REVOKED}' THEN '${INVITED}'
                     ELSE admin_users.status END,
       revoked_at = NULL,
       revoked_by = NULL
     RETURNING email, status`,
    [normalise(email), INVITED, normalise(invitedBy)]
  )

  return rows[0] ?? null
}

/*
 Kept rather than deleted. Removing the row loses the record that they ever
 had access, and access is decided on status rather than on the row existing.
*/
export async function revokeAdminUser(email, revokedBy) {
  if (!databaseConfigured()) return 0

  return execute(
    `UPDATE admin_users
        SET status = ?, revoked_at = now(), revoked_by = ?
      WHERE email = ?`,
    [REVOKED, normalise(revokedBy), normalise(email)]
  )
}

/*
 Mints an invite and returns the raw token exactly once. It is not stored and
 cannot be recovered, so a lost link is reissued rather than looked up.
*/
export async function createInvite(email, createdBy) {
  if (!databaseConfigured()) return null

  const token = crypto.randomBytes(TOKEN_BYTES).toString('hex')

  await query(
    `INSERT INTO admin_invites (token_hash, email, created_at, created_by, expires_at)
     VALUES (?, ?, now(), ?, now() + interval '${INVITE_TTL_DAYS} days')`,
    [hashToken(token), normalise(email), normalise(createdBy)]
  )

  return { token, expiresInDays: INVITE_TTL_DAYS }
}

/*-------- This is critical --------*/

/*
 Accepts an invite, and the checks below are the whole security of the flow.

 The token proves the invite is real. Google proves who is holding it. Both
 have to name the same address, or anyone the email was forwarded to walks in.

 Consumed is checked before expiry so a replayed link reads as used rather
 than as expired, which is the more useful thing to tell somebody.
*/
export async function acceptInvite(token, profile) {
  if (!databaseConfigured()) return { ok: false, reason: 'no-database' }

  const invite = await queryOne(
    `SELECT email, expires_at, consumed_at FROM admin_invites WHERE token_hash = ?`,
    [hashToken(String(token || ''))]
  )

  if (!invite) return { ok: false, reason: 'unknown' }
  if (invite.consumed_at) return { ok: false, reason: 'used' }
  if (new Date(invite.expires_at) <= new Date()) return { ok: false, reason: 'expired' }

  const email = normalise(profile?.email)
  if (!email || profile?.email_verified === false) return { ok: false, reason: 'unverified' }
  if (email !== invite.email) return { ok: false, reason: 'wrong-account', invited: invite.email }

  await execute(
    `UPDATE admin_users
        SET status = ?, google_sub = ?, full_name = ?, activated_at = now()
      WHERE email = ?`,
    [ACTIVE, profile?.sub ?? null, profile?.name ?? null, email]
  )

  await execute('UPDATE admin_invites SET consumed_at = now() WHERE token_hash = ?', [
    hashToken(String(token || '')),
  ])

  return { ok: true, email }
}

// Best effort. A failure here must never interrupt a request.
export async function touchLastSeen(email) {
  if (!databaseConfigured()) return

  try {
    await execute('UPDATE admin_users SET last_seen_at = now() WHERE email = ?', [normalise(email)])
  } catch {
    // Not worth failing a page load over
  }
}
