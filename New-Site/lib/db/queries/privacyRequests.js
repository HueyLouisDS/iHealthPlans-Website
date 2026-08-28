// Writes and reads for the privacy_requests table.
// Called by /api/privacy-request, and by the admin area once there is a screen
// for working through them.

import 'server-only'

import { query, execute, databaseConfigured } from '@/lib/db/client'

/*-------- This is critical --------*/
/*
 A privacy request that fails to store is a legal deadline nobody knows about.
 Unlike a lead, there is no vendor holding a second copy, so this write is the
 only record that the request was ever made.

 The route must treat false as a failure and tell the person to use another
 contact method, never accept silently.
*/
export async function insertRequest(request, requestId) {
  if (!databaseConfigured()) return false

  await execute(
    `INSERT INTO privacy_requests (
       request_id, received_at, due_at, request_type, phone, email,
       first_name, last_name, state, on_behalf_of, relationship,
       details, attestation_text, source_url, ip_address, user_agent
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      requestId,
      request.receivedAt,
      request.dueAt,
      request.requestType,
      request.phone,
      request.email,
      request.firstName,
      request.lastName,
      request.state,
      request.onBehalfOf,
      request.relationship,
      request.details,
      request.attestationText,
      request.sourceUrl,
      request.ipAddress,
      request.userAgent,
    ]
  )

  return true
}

// Requests still open, oldest deadline first, which is the working order
export async function openRequests(limit = 100) {
  if (!databaseConfigured()) return []

  return query(
    `SELECT request_id, received_at, due_at, request_type, status,
            first_name, last_name, phone, email, state, on_behalf_of
       FROM privacy_requests
      WHERE status NOT IN ('completed', 'refused')
      ORDER BY due_at ASC
      LIMIT ?`,
    [limit]
  )
}

// How many open requests are already past the published deadline
export async function overdueCount() {
  if (!databaseConfigured()) return 0

  const rows = await query(
    `SELECT count(*) AS overdue
       FROM privacy_requests
      WHERE status NOT IN ('completed', 'refused')
        AND due_at < now()`
  )

  return Number(rows[0]?.overdue || 0)
}
