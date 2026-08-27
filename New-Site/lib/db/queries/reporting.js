// The real queries behind the admin area. lib/admin/data.js chooses between
// these and the fixtures, and the shapes here must match the fixture shapes
// exactly or the pages break.
import 'server-only'

import { query, queryOne } from '@/lib/db/client'
import { formatDuration, formatDateTime } from '@/lib/admin/format'

/*=======================================================
        LEAD STATUS IS DERIVED, NOT STORED
========================================================*/

/*
 The leads table has no status column. The fixtures carry 5 values and only 3
 of them exist as facts anywhere in the schema.

   enrolled    a row in policies for this lead
   contacted   at least 1 connected call
   new         no connected call yet

 qualified and lost have no source. They live in TLD as dialer_status, in the
 client's own vocabulary, and mapping that set onto these needs their list.
 Until then a lead that was worked and lost reads as contacted, which
 understates nothing and invents nothing.

 TODO map dialer_leads.dialer_status once the client supplies the code list.
*/
const STATUS_SQL = `
  CASE
    WHEN p.policy_id IS NOT NULL THEN 'enrolled'
    WHEN COALESCE(c.connected, 0) > 0 THEN 'contacted'
    ELSE 'new'
  END`

/*
 One connected call per lead, and the total, as a joinable subquery. Written
 once because the funnel, the lead list, and attribution all need it, and 3
 copies of a count join is 3 places to get the disposition test wrong.
*/
const CALL_COUNTS = `
  LEFT JOIN (
    SELECT lead_id,
           count(*)                                            AS total,
           count(*) FILTER (WHERE d.category <> 'no_contact')  AS connected
      FROM calls
      LEFT JOIN dispositions d ON d.disposition_code = calls.disposition_code
     WHERE lead_id IS NOT NULL
     GROUP BY lead_id
  ) c ON c.lead_id = l.lead_id`

/*
 The earliest surviving policy for a lead. A lead can hold more than one over
 time, a rejected application followed by a good one, and the funnel counts
 people rather than paperwork.

 missing_since is excluded. A policy TLD has stopped returning is one it
 deleted, and counting it would report business that no longer exists.
*/
const POLICY_JOIN = `
  LEFT JOIN LATERAL (
    SELECT policy_id, effective_date, disenrolled_at, policy_status, carrier, plan_name
      FROM policies
     WHERE policies.lead_id = l.lead_id
       AND policies.missing_since IS NULL
     ORDER BY policies.submitted_at NULLS LAST
     LIMIT 1
  ) p ON true`

// The session that produced the lead, for source, campaign, and device
const SESSION_JOIN = `LEFT JOIN sessions s ON s.session_id = l.session_id`

/*
 The label the whole admin area groups by. source / medium, matching what the
 fixtures produce, so a row reads google / cpc rather than google.
*/
const SOURCE_LABEL = `
  COALESCE(
    NULLIF(TRIM(COALESCE(s.source, l.source) || ' / ' || COALESCE(s.medium, '')), '/'),
    COALESCE(s.source, l.source),
    '(direct)'
  )`

const NAME = `TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, ''))`

function windowStart(days) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)
}

// Hours and minutes, for a total. A call duration uses formatDuration instead.
function formatTalkTime(seconds) {
  const totalMinutes = Math.round(Number(seconds || 0) / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

// Below this an agent's conversion rate is built on too few leads to rank on
const LOW_VOLUME_AGENT_LEADS = 25

function percent(count, of) {
  return of ? `${((count / of) * 100).toFixed(1)}%` : '0.0%'
}

function delta(current, previous) {
  if (!previous) return null
  const change = ((current - previous) / previous) * 100
  const rounded = Math.abs(change) < 0.05 ? 0 : change
  return {
    value: `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`,
    direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat',
  }
}

/*
 Counts for 1 window. Run twice, once for the period and once for the one
 before it, which is what the deltas on the dashboard compare.
*/
async function funnelCounts(from, to) {
  const row = await queryOne(
    `SELECT
       (SELECT count(*) FROM sessions
         WHERE started_at >= ? AND started_at < ?)                       AS sessions,
       (SELECT count(*) FROM call_clicks
         WHERE clicked_at >= ? AND clicked_at < ?)                       AS call_clicks,
       (SELECT count(*) FROM calls c
          LEFT JOIN dispositions d ON d.disposition_code = c.disposition_code
         WHERE c.started_at >= ? AND c.started_at < ?
           AND COALESCE(d.category, 'other') <> 'no_contact')            AS calls,
       (SELECT count(*) FROM leads
         WHERE received_at >= ? AND received_at < ?)                     AS leads,
       (SELECT count(DISTINCT p.lead_id) FROM policies p
          JOIN leads l ON l.lead_id = p.lead_id
         WHERE l.received_at >= ? AND l.received_at < ?
           AND p.missing_since IS NULL)                                  AS submitted,
       (SELECT count(DISTINCT p.lead_id) FROM policies p
          JOIN leads l ON l.lead_id = p.lead_id
         WHERE l.received_at >= ? AND l.received_at < ?
           AND p.missing_since IS NULL
           AND p.effective_date IS NOT NULL
           AND p.effective_date <= current_date)                         AS effectuated,
       (SELECT count(DISTINCT p.lead_id) FROM policies p
          JOIN leads l ON l.lead_id = p.lead_id
         WHERE l.received_at >= ? AND l.received_at < ?
           AND p.missing_since IS NULL
           AND p.effective_date IS NOT NULL
           AND p.effective_date + 90 <= current_date
           AND p.disenrolled_at IS NULL)                                 AS retained`,
    [from, to, from, to, from, to, from, to, from, to, from, to, from, to]
  )

  return {
    sessions: Number(row?.sessions ?? 0),
    callClicks: Number(row?.call_clicks ?? 0),
    calls: Number(row?.calls ?? 0),
    leads: Number(row?.leads ?? 0),
    submitted: Number(row?.submitted ?? 0),
    effectuated: Number(row?.effectuated ?? 0),
    retained: Number(row?.retained ?? 0),
  }
}

/*
 What each lagging stage is still waiting on, meaning rows that reached the
 stage above but cannot have resolved yet. Same definition the fixtures use,
 computed from the dates rather than from an assumed lag.
*/
async function pending(from, to) {
  const row = await queryOne(
    `SELECT
       (SELECT count(DISTINCT p.lead_id) FROM policies p
          JOIN leads l ON l.lead_id = p.lead_id
         WHERE l.received_at >= ? AND l.received_at < ?
           AND p.missing_since IS NULL
           AND (p.effective_date IS NULL OR p.effective_date > current_date)) AS effectuated,
       (SELECT count(DISTINCT p.lead_id) FROM policies p
          JOIN leads l ON l.lead_id = p.lead_id
         WHERE l.received_at >= ? AND l.received_at < ?
           AND p.missing_since IS NULL
           AND p.effective_date IS NOT NULL
           AND p.effective_date <= current_date
           AND p.effective_date + 90 > current_date)                         AS retained`,
    [from, to, from, to]
  )

  return {
    effectuated: Number(row?.effectuated ?? 0),
    retained: Number(row?.retained ?? 0),
  }
}

export async function funnelSummary({ days, stages }) {
  const now = new Date()
  const from = windowStart(days)
  const before = windowStart(days * 2)

  const [current, previous, waiting] = await Promise.all([
    funnelCounts(from, now),
    funnelCounts(before, from),
    pending(from, now),
  ])

  const previousKey = {
    callClicks: 'sessions',
    calls: 'callClicks',
    leads: 'calls',
    submitted: 'leads',
    effectuated: 'submitted',
    retained: 'effectuated',
  }

  return {
    days,
    stages: stages.map((stage) => {
      const from_ = previousKey[stage.key] || null

      return {
        key: stage.key,
        label: stage.label,
        count: current[stage.key],
        rateFromPrevious: from_ ? percent(current[stage.key], current[from_]) : null,
        shareOfTop: current.sessions ? current[stage.key] / current.sessions : 0,
        dropFromPrevious: from_ && current[from_] ? current[from_] - current[stage.key] : null,
        delta: delta(current[stage.key], previous[stage.key]),
        unresolved: waiting[stage.key] ?? 0,
      }
    }),
    isEmpty: current.sessions === 0 && current.leads === 0,
  }
}

export async function funnelTrend({ days }) {
  const from = windowStart(days)

  /*
   generate_series rather than grouping what exists, so a day with no traffic
   is a zero rather than a gap. A line chart that silently skips quiet days
   compresses the axis and makes a bad week look normal.
  */
  const rows = await query(
    `WITH span AS (
       SELECT generate_series(?::date, current_date, interval '1 day')::date AS day
     )
     SELECT span.day,
       (SELECT count(*) FROM sessions
         WHERE started_at::date = span.day)                              AS sessions,
       (SELECT count(*) FROM call_clicks
         WHERE clicked_at::date = span.day)                              AS call_clicks,
       (SELECT count(*) FROM calls c
          LEFT JOIN dispositions d ON d.disposition_code = c.disposition_code
         WHERE c.started_at::date = span.day
           AND COALESCE(d.category, 'other') <> 'no_contact')            AS calls,
       (SELECT count(*) FROM leads WHERE received_at::date = span.day)   AS leads,
       (SELECT count(DISTINCT p.lead_id) FROM policies p
          JOIN leads l ON l.lead_id = p.lead_id
         WHERE l.received_at::date = span.day
           AND p.missing_since IS NULL)                                  AS submitted,
       (SELECT count(DISTINCT p.lead_id) FROM policies p
          JOIN leads l ON l.lead_id = p.lead_id
         WHERE l.received_at::date = span.day
           AND p.missing_since IS NULL
           AND p.effective_date IS NOT NULL
           AND p.effective_date <= current_date)                         AS effectuated,
       (SELECT count(DISTINCT p.lead_id) FROM policies p
          JOIN leads l ON l.lead_id = p.lead_id
         WHERE l.received_at::date = span.day
           AND p.missing_since IS NULL
           AND p.effective_date IS NOT NULL
           AND p.effective_date + 90 <= current_date
           AND p.disenrolled_at IS NULL)                                 AS retained
     FROM span ORDER BY span.day`,
    [from]
  )

  const days_ = rows.map((row) => ({
    date: new Date(row.day),
    sessions: Number(row.sessions),
    callClicks: Number(row.call_clicks),
    calls: Number(row.calls),
    leads: Number(row.leads),
    submitted: Number(row.submitted),
    effectuated: Number(row.effectuated),
    retained: Number(row.retained),
  }))

  return {
    days: days_,
    peak: Math.max(1, ...days_.map((row) => Math.max(row.leads, row.calls))),
    isEmpty: days_.every((row) => row.sessions === 0 && row.leads === 0),
  }
}

export async function topSources({ days, limit }) {
  const from = windowStart(days)

  const rows = await query(
    `SELECT ${SOURCE_LABEL} AS source,
            count(*)                                        AS leads,
            count(p.policy_id)                              AS conversions
       FROM leads l
       ${SESSION_JOIN}
       ${POLICY_JOIN}
      WHERE l.received_at >= ?
      GROUP BY 1`,
    [from]
  )

  const all = rows.map((row) => ({
    source: row.source,
    leads: Number(row.leads),
    conversions: Number(row.conversions),
  }))

  const rank = (key) => {
    const top = [...all].sort((a, b) => b[key] - a[key]).slice(0, limit)
    const most = top[0]?.[key] || 1

    return top.map((row) => ({
      ...row,
      share: row[key] / most,
      rate: percent(row.conversions, row.leads),
    }))
  }

  return {
    measures: { leads: rank('leads'), conversions: rank('conversions') },
    isEmpty: all.length === 0,
  }
}

export async function recentLeads({ limit }) {
  const rows = await query(
    `SELECT l.lead_id, ${NAME} AS name, l.phone, l.received_at,
            ${SOURCE_LABEL} AS source, ${STATUS_SQL} AS status
       FROM leads l
       ${SESSION_JOIN}
       ${CALL_COUNTS}
       ${POLICY_JOIN}
      ORDER BY l.received_at DESC
      LIMIT ?`,
    [limit]
  )

  return {
    rows: rows.map((row) => ({
      id: row.lead_id,
      name: row.name || '(no name given)',
      phone: row.phone,
      source: row.source,
      status: row.status,
      createdAt: row.received_at,
    })),
    isEmpty: rows.length === 0,
  }
}

/*=======================================================
        LEADS
========================================================*/

/*
 Filters are built as a list of fragments and a matching list of values, in
 the same order, because the ? to $n translation in lib/db/client.js is
 positional. Push a fragment without pushing its value and every parameter
 after it shifts by 1, which produces a query that runs and returns the wrong
 rows rather than an error.
*/
function leadFilters({ source, status, audience, hasCall, search }, from) {
  const where = ['l.received_at >= ?']
  const values = [from]

  if (source) {
    where.push(`${SOURCE_LABEL} = ?`)
    values.push(source)
  }

  if (search && search.trim()) {
    const needle = `%${search.trim().toLowerCase()}%`
    const digits = search.replace(/[^0-9]/g, '')

    /*
     Phone and zip are matched on digits only, because somebody searching for
     a number types it however it was written down and the stored form has
     brackets and spaces in it.
    */
    if (digits) {
      where.push(
        `(lower(${NAME}) LIKE ? OR regexp_replace(l.phone, '[^0-9]', '', 'g') LIKE ? OR l.zip LIKE ?)`
      )
      values.push(needle, `%${digits}%`, `%${digits}%`)
    } else {
      where.push(`lower(${NAME}) LIKE ?`)
      values.push(needle)
    }
  }

  if (audience === 'other') where.push(`COALESCE(l.on_behalf_of, 'self') <> 'self'`)
  if (audience === 'self') where.push(`COALESCE(l.on_behalf_of, 'self') = 'self'`)

  if (hasCall === 'no') where.push('COALESCE(c.total, 0) = 0')
  if (hasCall === 'yes') where.push('COALESCE(c.total, 0) > 0')

  // Status is derived, so it filters on the expression rather than a column
  if (status) {
    where.push(`${STATUS_SQL} = ?`)
    values.push(status)
  }

  return { where: where.join(' AND '), values }
}

const LEAD_FROM = `
  FROM leads l
  ${SESSION_JOIN}
  ${CALL_COUNTS}
  ${POLICY_JOIN}`

export async function leadList({ days, page, perPage, source, status, audience, hasCall, search, sort }) {
  const from = windowStart(days)

  /*
   The tiles and the status counts describe everything matching the search and
   the source, before the status and audience filters narrow it. Applying
   those first would make every tile show the count of what is already on
   screen, which tells you nothing.
  */
  const wide = leadFilters({ source, audience: null, hasCall: null, search }, from)
  const narrow = leadFilters({ source, status, audience, hasCall, search }, from)

  const sorters = {
    newest: 'l.received_at DESC',
    oldest: 'l.received_at ASC',
    name: `${NAME} ASC`,
  }
  const order = sorters[sort] || sorters.newest

  const [counts, totalRow, rows, sources] = await Promise.all([
    query(`SELECT ${STATUS_SQL} AS status, count(*) AS total ${LEAD_FROM} WHERE ${wide.where} GROUP BY 1`, wide.values),
    queryOne(
      `SELECT count(*) AS total,
              count(p.policy_id) AS enrolled,
              count(*) FILTER (WHERE COALESCE(l.on_behalf_of, 'self') <> 'self') AS other_audience,
              count(*) FILTER (WHERE COALESCE(c.total, 0) = 0) AS without_call
         ${LEAD_FROM} WHERE ${wide.where}`,
      wide.values
    ),
    query(
      `SELECT l.lead_id, ${NAME} AS name, l.phone, l.zip, l.email, l.received_at,
              l.on_behalf_of, ${SOURCE_LABEL} AS source, s.campaign, s.landing_page, s.device,
              ${STATUS_SQL} AS status, COALESCE(c.total, 0) AS call_count
         ${LEAD_FROM} WHERE ${narrow.where}
        ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...narrow.values, perPage, (Math.max(1, page) - 1) * perPage]
    ),
    query(`SELECT DISTINCT ${SOURCE_LABEL} AS source ${LEAD_FROM} WHERE ${wide.where} ORDER BY 1`, wide.values),
  ])

  const filtered = await queryOne(
    `SELECT count(*) AS total ${LEAD_FROM} WHERE ${narrow.where}`,
    narrow.values
  )

  const total = Number(filtered?.total ?? 0)
  const wideTotal = Number(totalRow?.total ?? 0)
  const enrolled = Number(totalRow?.enrolled ?? 0)

  return {
    leads: rows.map((row) => ({
      id: row.lead_id,
      name: row.name || '(no name given)',
      phone: row.phone,
      zip: row.zip,
      email: row.email,
      source: row.source,
      campaign: row.campaign || '(not set)',
      landingPage: row.landing_page,
      device: row.device,
      status: row.status,
      onBehalfOf: row.on_behalf_of === 'self' ? 'Myself' : 'A parent or family member',
      callCount: Number(row.call_count),
      createdAt: row.received_at,
      createdAtLabel: formatDateTime(row.received_at),
    })),
    total,
    page: Math.max(1, page),
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    sources: sources.map((row) => row.source),
    statusCounts: Object.fromEntries(counts.map((row) => [row.status, Number(row.total)])),
    summary: {
      total: wideTotal,
      enrolled,
      conversionRate: percent(enrolled, wideTotal),
      onBehalfOfOther: Number(totalRow?.other_audience ?? 0),
      withoutCall: Number(totalRow?.without_call ?? 0),
    },
    isEmpty: wideTotal === 0,
  }
}

/*
 The timeline on a lead page, assembled from what actually happened rather
 than from a fixed script. A session that was never recorded produces a
 shorter timeline instead of a fabricated one.
*/
export async function leadDetail(leadId) {
  const lead = await queryOne(
    `SELECT l.lead_id, ${NAME} AS name, l.phone, l.zip, l.email, l.received_at,
            l.on_behalf_of, l.best_time, l.origin, l.vendor_id,
            ${SOURCE_LABEL} AS source, s.campaign, s.landing_page, s.device,
            s.started_at AS session_started, l.session_id,
            ${STATUS_SQL} AS status, COALESCE(c.total, 0) AS call_count,
            p.carrier, p.plan_name, p.policy_status, p.effective_date
       ${LEAD_FROM} WHERE l.lead_id = ?`,
    [leadId]
  )

  if (!lead) return null

  const [calls, clicks, consent] = await Promise.all([
    query(
      `SELECT c.call_id, c.started_at, c.talk_seconds, c.disposition_code,
              c.lead_id IS NOT NULL AS matched, a.full_name AS agent,
              COALESCE(d.label, c.disposition_code) AS disposition
         FROM calls c
         LEFT JOIN agents a ON a.agent_id = c.agent_id
         LEFT JOIN dispositions d ON d.disposition_code = c.disposition_code
        WHERE c.lead_id = ? ORDER BY c.started_at`,
      [leadId]
    ),
    query(
      `SELECT clicked_at, location, page_path, matched_call_id
         FROM call_clicks WHERE session_id = ? ORDER BY clicked_at`,
      [lead.session_id]
    ),
    query(
      `SELECT captured_at, consent_version, source_url, withdrawn_at
         FROM lead_consents WHERE lead_id = ? ORDER BY captured_at`,
      [leadId]
    ),
  ])

  const timeline = []

  if (lead.session_started) {
    timeline.push({
      at: lead.session_started,
      kind: 'session',
      title: 'Session started',
      detail: `${lead.source}${lead.campaign ? `, campaign ${lead.campaign}` : ''}${lead.device ? `, on ${lead.device}` : ''}`,
    })
  }

  if (lead.landing_page) {
    timeline.push({
      at: lead.session_started || lead.received_at,
      kind: 'pageview',
      title: `Landed on ${lead.landing_page}`,
      detail: 'First page of the session',
    })
  }

  for (const click of clicks) {
    timeline.push({
      at: click.clicked_at,
      kind: 'callclick',
      title: 'Clicked to call',
      detail: `From ${click.location}${click.matched_call_id ? ', matched to a call' : ', never matched to a call'}`,
    })
  }

  for (const call of calls) {
    timeline.push({
      at: call.started_at,
      kind: 'call',
      title: `Call ${call.disposition || 'logged'}`,
      detail: `${formatDuration(call.talk_seconds || 0)}${call.agent ? ` with ${call.agent}` : ''}`,
      href: `/admin/calls/${call.call_id}`,
    })
  }

  for (const row of consent) {
    timeline.push({
      at: row.captured_at,
      kind: 'consent',
      title: row.withdrawn_at ? 'Consent withdrawn' : 'Consent captured',
      detail: `${row.consent_version || 'unversioned'}, from ${row.source_url}`,
    })
  }

  timeline.push({
    at: lead.received_at,
    kind: 'lead',
    title: 'Lead created',
    detail: lead.vendor_id ? `From vendor ${lead.vendor_id}` : `Submitted through the site`,
  })

  timeline.sort((a, b) => new Date(a.at) - new Date(b.at))

  return {
    id: lead.lead_id,
    name: lead.name || '(no name given)',
    phone: lead.phone,
    zip: lead.zip,
    email: lead.email,
    source: lead.source,
    campaign: lead.campaign || '(not set)',
    landingPage: lead.landing_page,
    device: lead.device,
    status: lead.status,
    onBehalfOf: lead.on_behalf_of === 'self' ? 'Myself' : 'A parent or family member',
    callCount: Number(lead.call_count),
    createdAt: lead.received_at,
    createdAtLabel: formatDateTime(lead.received_at),
    carrier: lead.carrier,
    planName: lead.plan_name,
    policyStatus: lead.policy_status,
    effectiveDate: lead.effective_date,
    timeline,
    calls: calls.map((call) => ({
      id: call.call_id,
      startedAt: call.started_at,
      durationSeconds: Number(call.talk_seconds || 0),
      disposition: call.disposition,
      agent: call.agent,
      matched: call.matched,
    })),
  }
}

/*=======================================================
        CALLS
========================================================*/
const CALL_FROM = `
  FROM calls c
  LEFT JOIN agents a ON a.agent_id = c.agent_id
  LEFT JOIN dispositions d ON d.disposition_code = c.disposition_code
  LEFT JOIN leads l ON l.lead_id = c.lead_id`

function callFilters({ disposition, agent, matched, hasRecording }, from) {
  const where = ['c.started_at >= ?']
  const values = [from]

  if (disposition) {
    where.push('c.disposition_code = ?')
    values.push(disposition)
  }

  if (agent) {
    where.push('c.agent_id = ?')
    values.push(agent)
  }

  // A call with no lead is the unattributed one, which is the metric that matters
  if (matched === 'yes') where.push('c.lead_id IS NOT NULL')
  if (matched === 'no') where.push('c.lead_id IS NULL')

  if (hasRecording === 'yes') where.push('c.recording_url IS NOT NULL')
  if (hasRecording === 'no') where.push('c.recording_url IS NULL')

  return { where: where.join(' AND '), values }
}

export async function callList({ days, page, perPage, disposition, agent, matched, hasRecording, sort }) {
  const from = windowStart(days)
  const filters = callFilters({ disposition, agent, matched, hasRecording }, from)

  const sorters = {
    newest: 'c.started_at DESC',
    oldest: 'c.started_at ASC',
    longest: 'c.talk_seconds DESC NULLS LAST',
    shortest: 'c.talk_seconds ASC NULLS LAST',
  }

  const [rows, totals, dispositions, agents] = await Promise.all([
    query(
      `SELECT c.call_id, c.started_at, c.talk_seconds, c.customer_number, c.did_number,
              c.recording_url, c.recording_expires_at, c.lead_id, c.agent_id,
              a.full_name AS agent, COALESCE(d.label, c.disposition_code) AS disposition,
              c.disposition_code, COALESCE(d.category, 'other') AS category,
              TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')) AS lead_name
         ${CALL_FROM} WHERE ${filters.where}
        ORDER BY ${sorters[sort] || sorters.newest} LIMIT ? OFFSET ?`,
      [...filters.values, perPage, (Math.max(1, page) - 1) * perPage]
    ),
    queryOne(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE c.lead_id IS NULL) AS unmatched,
              count(*) FILTER (WHERE COALESCE(d.category, 'other') <> 'no_contact') AS connected,
              COALESCE(sum(c.talk_seconds), 0) AS talk
         ${CALL_FROM} WHERE ${filters.where}`,
      filters.values
    ),
    query(
      `SELECT c.disposition_code AS value, COALESCE(d.label, c.disposition_code) AS label,
              count(*) AS total
         ${CALL_FROM} WHERE c.started_at >= ? AND c.disposition_code IS NOT NULL
        GROUP BY 1, 2 ORDER BY 3 DESC`,
      [from]
    ),
    query(
      `SELECT c.agent_id AS value, COALESCE(a.full_name, c.agent_id) AS label
         ${CALL_FROM} WHERE c.started_at >= ? AND c.agent_id IS NOT NULL
        GROUP BY 1, 2 ORDER BY 2`,
      [from]
    ),
  ])

  const total = Number(totals?.total ?? 0)

  return {
    calls: rows.map((row) => ({
      id: row.call_id,
      startedAt: row.started_at,
      startedAtLabel: formatDateTime(row.started_at),
      durationSeconds: Number(row.talk_seconds || 0),
      durationLabel: formatDuration(Number(row.talk_seconds || 0)),
      fromNumber: row.customer_number,
      didNumber: row.did_number,
      agentId: row.agent_id,
      agent: row.agent,
      disposition: row.disposition,
      dispositionCode: row.disposition_code,
      category: row.category,
      leadId: row.lead_id,
      leadName: row.lead_name || null,
      matched: Boolean(row.lead_id),
      hasRecording: Boolean(row.recording_url),
    })),
    total,
    page: Math.max(1, page),
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    dispositionCounts: Object.fromEntries(dispositions.map((row) => [row.value, Number(row.total)])),
    agents: agents.map((row) => ({ value: row.value, label: row.label })),
    summary: {
      total,
      connected: Number(totals?.connected ?? 0),
      connectedRate: percent(Number(totals?.connected ?? 0), total),
      matched: total - Number(totals?.unmatched ?? 0),
      matchedRate: percent(total - Number(totals?.unmatched ?? 0), total),
      unmatched: Number(totals?.unmatched ?? 0),
      averageTalk: formatDuration(total ? Math.round(Number(totals?.talk ?? 0) / total) : 0),
    },
    isEmpty: total === 0,
  }
}

export async function callDetail(callId) {
  const call = await queryOne(
    `SELECT c.call_id, c.started_at, c.answered_at, c.ended_at, c.queue_seconds,
            c.talk_seconds, c.wrap_seconds, c.customer_number, c.did_number,
            c.campaign, c.ingroup, c.direction, c.recording_url, c.recording_expires_at,
            c.lead_id, c.tld_lead_id, a.full_name AS agent, a.npn,
            COALESCE(d.label, c.disposition_code) AS disposition,
            COALESCE(d.category, 'other') AS category,
            TRIM(COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '')) AS lead_name
       ${CALL_FROM} WHERE c.call_id = ?`,
    [callId]
  )

  if (!call) return null

  /*
   The click this call was matched to, if the matcher found one. Its absence
   is the interesting case, it means the call arrived with no web session
   behind it and carries no source.
  */
  const click = await queryOne(
    `SELECT click_id, session_id, clicked_at, location, page_path, match_method
       FROM call_clicks WHERE matched_call_id = ? LIMIT 1`,
    [callId]
  )

  return {
    id: call.call_id,
    startedAt: call.started_at,
    startedAtLabel: formatDateTime(call.started_at),
    answeredAt: call.answered_at,
    endedAt: call.ended_at,
    queueSeconds: Number(call.queue_seconds || 0),
    durationSeconds: Number(call.talk_seconds || 0),
    durationLabel: formatDuration(Number(call.talk_seconds || 0)),
    wrapSeconds: Number(call.wrap_seconds || 0),
    fromNumber: call.customer_number,
    didNumber: call.did_number,
    campaign: call.campaign,
    ingroup: call.ingroup,
    direction: call.direction,
    agent: call.agent,
    agentNpn: call.npn,
    disposition: call.disposition,
    category: call.category,
    leadId: call.lead_id,
    leadName: call.lead_name || null,
    matched: Boolean(call.lead_id),
    matchMethod: click?.match_method ?? null,
    sessionId: click?.session_id ?? null,
    clickedAt: click?.clicked_at ?? null,
    clickLocation: click?.location ?? null,
    hasRecording: Boolean(call.recording_url),
    recordingExpiresAt: call.recording_expires_at,
  }
}

/*=======================================================
        ATTRIBUTION
========================================================*/

// What each breakdown groups by. Kept here so the SQL is never interpolated
// from a request value, only chosen from this map.
const DIMENSION_SQL = {
  source: SOURCE_LABEL,
  campaign: `COALESCE(s.campaign, '(not set)')`,
  landingPage: `COALESCE(s.landing_page, '(not set)')`,
  device: `COALESCE(s.device, '(unknown)')`,
  onBehalfOf: `CASE WHEN COALESCE(l.on_behalf_of, 'self') = 'self'
                    THEN 'Myself' ELSE 'A parent or family member' END`,
}

export async function attribution({ groupBy, days, device, onBehalfOf, sort, lowVolume }) {
  const from = windowStart(days)
  const column = DIMENSION_SQL[groupBy] || SOURCE_LABEL

  const where = ['l.received_at >= ?']
  const values = [from]

  if (device) {
    where.push('s.device = ?')
    values.push(device)
  }

  if (onBehalfOf) {
    where.push(`CASE WHEN COALESCE(l.on_behalf_of, 'self') = 'self'
                     THEN 'Myself' ELSE 'A parent or family member' END = ?`)
    values.push(onBehalfOf)
  }

  const clause = where.join(' AND ')

  const [rows, callTotals] = await Promise.all([
    query(
      `SELECT ${column} AS value,
              count(*)                       AS leads,
              COALESCE(sum(c.total), 0)      AS calls,
              count(p.policy_id)             AS conversions
         ${LEAD_FROM} WHERE ${clause} GROUP BY 1`,
      values
    ),
    queryOne(
      `SELECT count(*) AS total, count(*) FILTER (WHERE lead_id IS NULL) AS unattributed
         FROM calls WHERE started_at >= ?`,
      [from]
    ),
  ])

  const groups = rows.map((row, index) => {
    const leads = Number(row.leads)
    const conversions = Number(row.conversions)

    return {
      id: `g${index}`,
      value: row.value,
      leads,
      calls: Number(row.calls),
      conversions,
      callsPerLead: leads ? (Number(row.calls) / leads).toFixed(2) : '0.00',
      conversionRate: percent(conversions, leads),
      lowVolume: leads < lowVolume,
    }
  })

  const totalLeads = groups.reduce((sum, row) => sum + row.leads, 0)
  const totalConversions = groups.reduce((sum, row) => sum + row.conversions, 0)

  for (const row of groups) {
    row.leadShare = percent(row.leads, totalLeads)
  }

  const sorters = {
    leads: (a, b) => b.leads - a.leads,
    conversions: (a, b) => b.conversions - a.conversions,
    calls: (a, b) => b.calls - a.calls,
    rate: (a, b) =>
      Number(a.lowVolume) - Number(b.lowVolume) ||
      Number.parseFloat(b.conversionRate) - Number.parseFloat(a.conversionRate),
  }

  groups.sort(sorters[sort] || sorters.leads)

  const [devices, audiences] = await Promise.all([
    query(`SELECT DISTINCT device AS v FROM sessions WHERE device IS NOT NULL ORDER BY 1`),
    query(
      `SELECT DISTINCT CASE WHEN COALESCE(on_behalf_of, 'self') = 'self'
                            THEN 'Myself' ELSE 'A parent or family member' END AS v
         FROM leads ORDER BY 1`
    ),
  ])

  return {
    groupBy,
    days,
    rows: groups,
    summary: {
      leads: totalLeads,
      calls: groups.reduce((sum, row) => sum + row.calls, 0),
      conversions: totalConversions,
      conversionRate: percent(totalConversions, totalLeads),
      groups: groups.length,
    },
    unattributedCalls: Number(callTotals?.unattributed ?? 0),
    totalCalls: Number(callTotals?.total ?? 0),
    devices: devices.map((row) => row.v),
    audiences: audiences.map((row) => row.v),
    isEmpty: totalLeads === 0,
  }
}

/*=======================================================
        AGENTS
========================================================*/

/*
 Ranked on work that reached a person. A no_contact call is a dialer outcome
 rather than an agent's, and counting it rewards whoever was handed the worst
 list rather than whoever is best on the phone.
*/
export async function agentPerformance({ days, sort }) {
  const from = windowStart(days)

  /*-------- This has fanned out before, do not flatten these joins --------*/

  /*
   Calls and policies are aggregated separately and joined as single rows.
   Joining both onto agents in one GROUP BY multiplies them, every call row
   repeating once per policy that agent wrote, and it reported 4500 calls for
   an agent in a dataset holding 1564 in total.

   count(DISTINCT) fixes the counts and does nothing for sum(talk_seconds),
   which is why this is 2 subqueries rather than a DISTINCT.
  */
  const rows = await query(
    `SELECT a.agent_id, COALESCE(a.full_name, a.dialer_user, a.agent_id) AS name, a.npn,
            COALESCE(c.calls, 0)       AS calls,
            COALESCE(c.connected, 0)   AS connected,
            COALESCE(c.talk, 0)        AS talk,
            COALESCE(c.leads, 0)       AS leads,
            COALESCE(p.conversions, 0) AS conversions
       FROM agents a
       LEFT JOIN (
         SELECT c.agent_id,
                count(*)                                                         AS calls,
                count(*) FILTER (WHERE COALESCE(d.category,'other') <> 'no_contact') AS connected,
                COALESCE(sum(c.talk_seconds), 0)                                 AS talk,
                count(DISTINCT c.lead_id)                                        AS leads
           FROM calls c
           LEFT JOIN dispositions d ON d.disposition_code = c.disposition_code
          WHERE c.started_at >= ? AND c.agent_id IS NOT NULL
          GROUP BY c.agent_id
       ) c ON c.agent_id = a.agent_id
       LEFT JOIN (
         SELECT agent_id, count(*) AS conversions
           FROM policies
          WHERE missing_since IS NULL AND submitted_at >= ? AND agent_id IS NOT NULL
          GROUP BY agent_id
       ) p ON p.agent_id = a.agent_id
      WHERE a.is_active`,
    [from, from]
  )

  const agents = rows.map((row) => {
    const connected = Number(row.connected)
    const conversions = Number(row.conversions)
    const leads = Number(row.leads)
    const talk = Number(row.talk)

    return {
      id: row.agent_id,
      name: row.name,
      npn: row.npn,
      calls: Number(row.calls),
      connected,
      leads,
      conversions,
      conversionRate: percent(conversions, leads),
      talkSeconds: talk,
      talkTime: formatTalkTime(talk),
      averageCall: formatDuration(connected ? Math.round(talk / connected) : 0),
      lowVolume: leads < LOW_VOLUME_AGENT_LEADS,
    }
  })

  const sorters = {
    conversions: (a, b) => b.conversions - a.conversions,
    calls: (a, b) => b.calls - a.calls,
    talk: (a, b) => b.talkSeconds - a.talkSeconds,
    name: (a, b) => a.name.localeCompare(b.name),
    rate: (a, b) =>
      Number(a.lowVolume) - Number(b.lowVolume) ||
      Number.parseFloat(b.conversionRate) - Number.parseFloat(a.conversionRate),
  }

  agents.sort(sorters[sort] || sorters.conversions)

  const totalLeads = agents.reduce((sum, row) => sum + row.leads, 0)
  const totalConversions = agents.reduce((sum, row) => sum + row.conversions, 0)

  return {
    days,
    agents,
    summary: {
      agents: agents.filter((row) => row.calls > 0).length,
      calls: agents.reduce((sum, row) => sum + row.calls, 0),
      talkTime: formatTalkTime(agents.reduce((sum, row) => sum + row.talkSeconds, 0)),
      leads: totalLeads,
      conversions: totalConversions,
      conversionRate: percent(totalConversions, totalLeads),
    },
    isEmpty: agents.length === 0,
  }
}
