// Writes for the identity chain, visitors, sessions and call clicks.
// Called by /api/track and /api/call/click. Everything here is an upsert, so a
// beacon that fires twice for one page produces one row rather than an error.

import 'server-only'

import { query, transaction, databaseConfigured } from '@/lib/db/client'

/*=======================================================
        DATES GO IN AS DATES, NOT AS STRINGS
========================================================*/

/*
 pg serialises a Date with its offset, so the instant lands correctly whatever
 the session timezone is set to.

 Do not pre-format these into a naive string. The session is pinned to
 America/New_York in lib/db/dsn.js, so a UTC string with the Z stripped is
 read as Eastern and stored 4 or 5 hours late depending on the month.
*/

/*
 First touch is written on insert and never on conflict. That is the whole
 rule for the visitors table, since the source that first found somebody is
 what earned the eventual enrollment and a later visit must not overwrite it.
*/
async function upsertVisitor(connection, identity, touch, now) {
  await connection.execute(
    `INSERT INTO visitors (
       visitor_id, first_seen_at, last_seen_at,
       first_source, first_medium, first_campaign, first_content, first_term,
       first_landing_page, first_referrer, first_gclid, first_fbclid, first_msclkid
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (visitor_id) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`,
    [
      identity.visitorId,
      now,
      now,
      touch.source,
      touch.medium,
      touch.campaign,
      touch.content,
      touch.term,
      touch.landingPage,
      touch.referrer,
      touch.gclid,
      touch.fbclid,
      touch.msclkid,
    ]
  )
}

/*
 Last touch, written on insert only for the same reason. A session keeps the
 campaign it arrived on for its whole length, so a page to page move inside
 the visit cannot replace it with an internal referrer.
*/
async function upsertSession(connection, identity, touch, facts, now) {
  await connection.execute(
    `INSERT INTO sessions (
       session_id, visitor_id, started_at, last_active_at,
       source, medium, campaign, content, term, landing_page, referrer,
       gclid, fbclid, msclkid, device, ip_prefix, user_agent
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (session_id) DO UPDATE SET last_active_at = EXCLUDED.last_active_at`,
    [
      identity.sessionId,
      identity.visitorId,
      now,
      now,
      touch.source,
      touch.medium,
      touch.campaign,
      touch.content,
      touch.term,
      touch.landingPage,
      touch.referrer,
      touch.gclid,
      touch.fbclid,
      touch.msclkid,
      facts.device,
      facts.ipPrefix,
      facts.userAgent,
    ]
  )
}

/*-------- This is critical --------*/
/*
 Order matters and is enforced by foreign keys. sessions references visitors
 and call_clicks references sessions, so a session written before its visitor
 fails the insert and loses the visit.

 One transaction, so a half written chain never reaches the reporting queries
 as a session belonging to a visitor that does not exist.
*/
export async function recordVisit({ identity, touch, facts }) {
  if (!databaseConfigured()) return false

  const now = new Date()               // one instant for both rows, so they agree

  await transaction(async (connection) => {
    await upsertVisitor(connection, identity, touch, now)
    await upsertSession(connection, identity, touch, facts, now)
  })

  return true
}

/*
 The visitor and session are upserted here too rather than assumed. A click
 can be the first thing somebody does, arriving before the page view beacon
 has landed, and it can arrive with a cookie whose row was never written.
 Either way the foreign key needs the parents to exist first.
*/
export async function recordCallClick({ clickId, identity, touch, facts, click }) {
  if (!databaseConfigured()) return false

  const now = new Date()

  await transaction(async (connection) => {
    await upsertVisitor(connection, identity, touch, now)
    await upsertSession(connection, identity, touch, facts, now)

    await connection.execute(
      `INSERT INTO call_clicks (
         click_id, session_id, visitor_id, clicked_at,
         location, page_path, presented_number
       ) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (click_id) DO NOTHING`,
      [
        clickId,
        identity.sessionId,
        identity.visitorId,
        now,
        click.location,
        click.pagePath,
        click.presentedNumber,
      ]
    )
  })

  return true
}

// Unmatched click count, the measure that says whether any of this is working
export async function countUnmatchedClicks({ since }) {
  if (!databaseConfigured()) return 0

  const rows = await query(
    `SELECT COUNT(*)::int AS unmatched
       FROM call_clicks
      WHERE matched_call_id IS NULL
        AND clicked_at >= ?`,
    [since]
  )

  return rows[0]?.unmatched ?? 0
}
