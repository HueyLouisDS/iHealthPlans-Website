// Writes for the leads table and its consent records.
// Called by /api/lead and /api/leads/inbound, so a lead the site produced and
// a lead a vendor sent land in the same shape.

import 'server-only'

import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'

import { query, transaction, databaseConfigured } from '@/lib/db/client'

/*=======================================================
        A LEAD WITHOUT A CONSENT ROW IS POSSIBLE
========================================================*/

/*
 The foreign key runs from lead_consents to leads, not the other way, so the
 database does not require a lead to have consent. Only the route does, and
 only /api/leads/inbound currently enforces it.

 The site's own form does not capture consent yet, so leads written here can
 land without a row in lead_consents. Until the form sends it, do not read
 "row in leads" as "consent on file".

 TODO capture consent on the site form and make it mandatory here too. Until
 that lands the agency is holding a vendor to a standard its own form does
 not meet.
*/

export async function insertLead(lead, leadId) {
  if (!databaseConfigured()) return false

  await transaction(async (connection) => {
    await connection.query(
      `INSERT INTO leads (
         lead_id, received_at, session_id, visitor_id, origin, source,
         vendor_id, external_id, phone, first_name, last_name, email, zip,
         on_behalf_of, best_time
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leadId,
        toMysqlDateTime(lead.receivedAt),
        lead.sessionId,
        lead.visitorId,
        lead.origin,
        lead.source,
        lead.vendorId,
        lead.externalId,
        lead.phone,
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.zip,
        lead.onBehalfOf,
        lead.bestTime,
      ]
    )

    if (lead.consent) {
      await connection.query(
        `INSERT INTO lead_consents (
           consent_id, lead_id, captured_at, consent_text, consent_hash,
           consent_version, source_url, ip_address, user_agent, agent_name
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          leadId,
          toMysqlDateTime(lead.consent.capturedAt),
          lead.consent.text,
          createHash('sha256').update(lead.consent.text).digest('hex'),
          lead.consent.version || null,
          lead.consent.url,
          lead.consent.ipAddress,
          lead.consent.userAgent || null,
          lead.consent.agent || null,
        ]
      )
    }
  })

  return true
}

export async function recordPushOutcome(leadId, result) {
  if (!databaseConfigured() || !leadId) return

  const delivered = result.outcome === 'accepted'

  await query(
    `UPDATE leads
        SET pushed_at = ?, push_error = ?
      WHERE lead_id = ?`,
    [
      delivered ? toMysqlDateTime(new Date().toISOString()) : null,
      // Capped to the column width rather than trusting the message length
      delivered ? null : String(result.error || result.outcome).slice(0, 500),
      leadId,
    ]
  )
}

function toMysqlDateTime(iso) {
  return String(iso).replace('T', ' ').replace('Z', '')
}
