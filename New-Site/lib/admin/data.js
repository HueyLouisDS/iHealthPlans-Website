/**
 * Data access for the admin area, and the definition of what the reporting
 * layer actually needs.
 *
 * NOTHING HERE READS A DATABASE YET, because there is not one. Every function
 * returns an empty result of the correct shape, so the admin pages render
 * their empty states rather than crashing, and so the contracts are settled
 * before the schema is written.
 *
 * That order is deliberate. The dashboard defines the schema, not the other
 * way round. Everything below is a statement of what has to be captured for
 * the client's reporting ask, traffic to clicks to calls to leads to
 * conversions, to be answerable.
 *
 * TODO replace each function body with a query once lib/db/client.js and the
 * migrations in db/migrations exist. The signatures should not need to change.
 */

/**
 * THE IDENTITY CHAIN, which is the whole problem in one place.
 *
 *   visitor    visitorId      first party cookie, survives sessions
 *     |
 *   session    sessionId      one visit, carries the attribution that won it
 *     |
 *   callClick  callClickId    a tel: click, bound to sessionId at click time
 *     |
 *   call       callId         the phone system's call, joined on callClickId
 *     |
 *   lead       leadId         the person, joined to visitorId and sessionId
 *     |
 *   conversion                the enrollment, joined to leadId
 *
 * Every report in the admin area is a traversal of that chain. If any link is
 * missing the reports below cannot be produced, no matter how the UI is built.
 *
 * The fragile link is callClick to call. A tel: link leaves no trace, so the
 * binding has to be created at click time by /api/call/click before the dialer
 * opens, either by serving a pooled number unique to that session or by
 * bridging the call through a tracked number. Nothing else recovers it later.
 */

/**
 * Funnel totals for the dashboard, for a date range.
 * Each stage is a count plus its conversion rate from the stage above, which
 * is what makes a funnel readable rather than 5 unrelated numbers.
 */
export async function getFunnelSummary({ from, to } = {}) {
  return {
    range: { from: from || null, to: to || null },
    stages: [
      { key: 'sessions', label: 'Sessions', count: 0, rateFromPrevious: null },
      { key: 'callClicks', label: 'Call clicks', count: 0, rateFromPrevious: null },
      { key: 'calls', label: 'Calls connected', count: 0, rateFromPrevious: null },
      { key: 'leads', label: 'Leads', count: 0, rateFromPrevious: null },
      { key: 'conversions', label: 'Conversions', count: 0, rateFromPrevious: null },
    ],
    isEmpty: true,
  }
}

/**
 * Daily counts for the dashboard trend chart.
 * Returns one row per day in the range so gaps render as zero rather than
 * disappearing, which is what makes a drop off visible.
 */
export async function getFunnelTrend({ from, to } = {}) {
  return { range: { from: from || null, to: to || null }, days: [], isEmpty: true }
}

/**
 * Paginated lead list for /admin/leads.
 * Filters are the ones a manager actually asks for, a date range, where the
 * lead came from, what state it is in, and free text on name or phone.
 */
export async function getLeads({ page = 1, perPage = 50, from, to, source, status, query } = {}) {
  return {
    leads: [],
    total: 0,
    page,
    perPage,
    totalPages: 1,
    filters: { from: from || null, to: to || null, source: source || null, status: status || null, query: query || null },
    isEmpty: true,
  }
}

/**
 * One lead with its complete journey, for /admin/leads/[id].
 *
 * This is the page that proves the whole engagement works. It has to show the
 * ad click, the landing page, the pages read, the phone click, the call, the
 * recording, and the CRM record, all resolved to one person. If this renders
 * correctly the identity problem is solved. If it cannot, none of the
 * aggregate reporting above is trustworthy either.
 */
export async function getLead(leadId) {
  return null
}

/**
 * Call log for /admin/calls.
 * `matched` is the column that matters. It says whether the call was tied back
 * to a web session, and the proportion of calls that are unmatched is the
 * single best health metric for the attribution system.
 */
export async function getCalls({ page = 1, perPage = 50, from, to, agentId, matched } = {}) {
  return {
    calls: [],
    total: 0,
    page,
    perPage,
    totalPages: 1,
    filters: { from: from || null, to: to || null, agentId: agentId || null, matched: matched ?? null },
    isEmpty: true,
  }
}

/**
 * One call with its recording, transcript, and matched lead, for
 * /admin/calls/[id].
 *
 * TODO recordings contain personal health information. Serving one must go
 * through a short lived signed url rather than a public path, and every access
 * must be written to an audit log recording who listened and when. Do not wire
 * a recording player before that exists.
 */
export async function getCall(callId) {
  return null
}

/**
 * Attribution breakdown for /admin/attribution.
 * Grouped by whichever dimension is asked for, and reported all the way down
 * the funnel rather than stopping at sessions. Knowing a campaign drove
 * traffic is not useful. Knowing it drove calls that became enrollments is.
 */
export async function getAttribution({ from, to, groupBy = 'source' } = {}) {
  return {
    groupBy,
    // Valid dimensions. Each must be captured on the session at first touch,
    // because none of them can be recovered afterwards.
    availableDimensions: ['source', 'medium', 'campaign', 'landingPage', 'device', 'clickId'],
    rows: [],
    isEmpty: true,
  }
}

/**
 * Agent performance for /admin/agents.
 *
 * TODO agents are people and this page ranks them. Before it is shown to
 * anyone other than the management team, decide what an agent may see about
 * themselves and about others. The straightforward answer is that an agent
 * sees only their own row.
 */
export async function getAgentPerformance({ from, to } = {}) {
  return { agents: [], isEmpty: true }
}

/**
 * Lead statuses, for filter dropdowns.
 * TODO these must mirror the CRM's own statuses once the CRM is identified.
 * Inventing a parallel vocabulary here guarantees the two drift apart and
 * makes every report an argument about definitions.
 */
export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'lost', label: 'Lost' },
]
