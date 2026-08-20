/**
 * Data access for the admin area, and the definition of what the reporting
 * layer actually needs.
 *
 * There is no database yet. Every function below has 2 paths.
 *
 *   ADMIN_USE_FIXTURES=true   returns fabricated demo data from fixtures.js,
 *                             so the UI can be built and reviewed. Local only.
 *   otherwise                 returns an empty result of the correct shape,
 *                             which is the truth until tracking exists.
 *
 * The contracts are the same either way, so swapping in real queries later
 * should not change a single signature.
 *
 * TODO replace each body with a query once lib/db/client.js and the migrations
 * in db/migrations exist, and delete the fixtures branch.
 */

import { getDataset, AGENTS, formatDuration, formatDateTime } from '@/lib/admin/fixtures'

/**
 * Whether to serve demo data.
 * Explicit opt in, and it must be the exact string "true". Anything else,
 * including the variable being absent, means real data. Fabricated numbers
 * must never appear because of a typo or a default.
 */
export function usingFixtures() {
  return process.env.ADMIN_USE_FIXTURES === 'true'
}

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
 * Every report here is a traversal of that chain. If any link is missing these
 * reports cannot be produced, no matter how the UI is built.
 *
 * The fragile link is callClick to call. A tel: link leaves no trace, so the
 * binding must be created at click time by /api/call/click before the dialer
 * opens, either by serving a pooled number unique to that session or by
 * bridging through a tracked number. Nothing recovers it afterwards.
 */

/**
 * Turns a stage count into a percentage of the stage above it.
 * Returns null for the first stage, which has nothing to convert from.
 */
function rate(count, previous) {
  if (previous === null || previous === undefined || previous === 0) return null
  return `${((count / previous) * 100).toFixed(1)}%`
}

/**
 * Funnel totals for the dashboard.
 * Each stage carries its conversion rate from the stage above, which is what
 * makes a funnel readable rather than 5 unrelated numbers.
 */
export async function getFunnelSummary() {
  if (!usingFixtures()) {
    return {
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

  const data = getDataset()
  const connected = data.calls.filter((call) => call.disposition === 'connected').length

  return {
    stages: [
      { key: 'sessions', label: 'Sessions', count: data.sessions, rateFromPrevious: null },
      { key: 'callClicks', label: 'Call clicks', count: data.callClicks, rateFromPrevious: rate(data.callClicks, data.sessions) },
      { key: 'calls', label: 'Calls connected', count: connected, rateFromPrevious: rate(connected, data.callClicks) },
      { key: 'leads', label: 'Leads', count: data.leads.length, rateFromPrevious: rate(data.leads.length, connected) },
      { key: 'conversions', label: 'Conversions', count: data.conversions, rateFromPrevious: rate(data.conversions, data.leads.length) },
    ],
    isEmpty: false,
  }
}

/**
 * Daily lead and call counts for the dashboard trend.
 * One row per day so a gap renders as zero rather than disappearing, which is
 * what makes a drop off visible.
 */
export async function getFunnelTrend() {
  if (!usingFixtures()) return { days: [], isEmpty: true }

  const data = getDataset()
  const buckets = new Map()

  for (let day = data.days - 1; day >= 0; day -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - day)
    buckets.set(date.toDateString(), { date, leads: 0, calls: 0 })
  }

  for (const lead of data.leads) {
    const bucket = buckets.get(lead.createdAt.toDateString())
    if (bucket) bucket.leads += 1
  }
  for (const call of data.calls) {
    const bucket = buckets.get(call.startedAt.toDateString())
    if (bucket) bucket.calls += 1
  }

  const days = [...buckets.values()]
  const peak = Math.max(1, ...days.map((day) => Math.max(day.leads, day.calls)))

  return { days, peak, isEmpty: false }
}

/**
 * Paginated lead list.
 * Filters are the ones a manager actually asks for, a date range, where the
 * lead came from, what state it is in, and free text on name or phone.
 */
export async function getLeads({ page = 1, perPage = 25, source, status, query } = {}) {
  const empty = { leads: [], total: 0, page, perPage, totalPages: 1, isEmpty: true }
  if (!usingFixtures()) return empty

  const data = getDataset()
  let rows = data.leads

  if (source) rows = rows.filter((lead) => lead.source === source)
  if (status) rows = rows.filter((lead) => lead.status === status)
  if (query) {
    const needle = query.toLowerCase()
    rows = rows.filter((lead) => lead.name.toLowerCase().includes(needle) || lead.phone.includes(needle))
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * perPage

  return {
    leads: rows.slice(start, start + perPage).map((lead) => ({
      ...lead,
      createdAtLabel: formatDateTime(lead.createdAt),
    })),
    total: rows.length,
    page: current,
    perPage,
    totalPages,
    sources: [...new Set(data.leads.map((lead) => lead.source))].sort(),
    isEmpty: false,
  }
}

/**
 * One lead with their complete journey.
 *
 * This is the page that proves the engagement works. It resolves the ad click,
 * the landing page, the pages read, the phone click, the call, the recording,
 * and the CRM record to a single person. If it renders correctly the identity
 * problem is solved, and if it cannot, none of the aggregate reporting is
 * trustworthy either.
 */
export async function getLead(leadId) {
  if (!usingFixtures()) return null

  const data = getDataset()
  const lead = data.leads.find((entry) => entry.id === leadId)
  if (!lead) return null

  const calls = data.calls.filter((call) => call.leadId === leadId)

  // A plausible page path for this lead, built from where they landed. The
  // real version reads the pageView table.
  const at = (minutes) => new Date(lead.createdAt.getTime() - minutes * 60000)
  const timeline = [
    {
      at: at(23),
      kind: 'session',
      title: 'Session started',
      detail: `${lead.source}${lead.campaign !== '(not set)' ? `, campaign ${lead.campaign}` : ''}, on ${lead.device}`,
    },
    { at: at(23), kind: 'pageview', title: `Landed on ${lead.landingPage}`, detail: 'First page of the session' },
    { at: at(19), kind: 'pageview', title: 'Viewed /medicare-advantage', detail: 'Read 71% of the page' },
    { at: at(14), kind: 'pageview', title: 'Viewed /annual-enrollment-period', detail: 'Read 92% of the page' },
    { at: at(9), kind: 'callclick', title: 'Clicked to call', detail: 'From heroCallNow, callClickId bound to this session' },
    ...calls.map((call) => ({
      at: call.startedAt,
      kind: 'call',
      title: `Call ${call.disposition}`,
      detail: `${formatDuration(call.durationSeconds)} with ${call.agent}${call.matched ? ', matched to this session' : ', NOT matched to a session'}`,
      href: `/admin/calls/${call.id}`,
    })),
    { at: lead.createdAt, kind: 'lead', title: 'Lead created', detail: `Submitted for ${lead.onBehalfOf.toLowerCase()}` },
  ].sort((a, b) => a.at - b.at)

  return {
    ...lead,
    createdAtLabel: formatDateTime(lead.createdAt),
    calls: calls.map((call) => ({ ...call, startedAtLabel: formatDateTime(call.startedAt), durationLabel: formatDuration(call.durationSeconds) })),
    timeline: timeline.map((event) => ({ ...event, atLabel: formatDateTime(event.at) })),
    // TODO the real version reads this from the CRM once the CRM is identified
    crmId: null,
  }
}

/**
 * Call log.
 * `matched` is the column that matters. It says whether the call was tied back
 * to a web session, and the share that are unmatched is the single best health
 * metric for the whole attribution system.
 */
export async function getCalls({ page = 1, perPage = 25, matched } = {}) {
  const empty = { calls: [], total: 0, page, perPage, totalPages: 1, matchedRate: null, isEmpty: true }
  if (!usingFixtures()) return empty

  const data = getDataset()
  let rows = data.calls
  if (matched === 'yes') rows = rows.filter((call) => call.matched)
  if (matched === 'no') rows = rows.filter((call) => !call.matched)

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * perPage
  const matchedCount = data.calls.filter((call) => call.matched).length

  return {
    calls: rows.slice(start, start + perPage).map((call) => ({
      ...call,
      startedAtLabel: formatDateTime(call.startedAt),
      durationLabel: formatDuration(call.durationSeconds),
    })),
    total: rows.length,
    page: current,
    perPage,
    totalPages,
    matchedRate: `${((matchedCount / data.calls.length) * 100).toFixed(1)}%`,
    unmatchedCount: data.calls.length - matchedCount,
    isEmpty: false,
  }
}

/**
 * One call with its recording, transcript, and matched lead.
 *
 * TODO recordings contain personal health information. Serving one must go
 * through a short lived signed url rather than a guessable path, and every
 * access must be written to an audit log naming who listened and when. Do not
 * wire a real player before that exists.
 */
export async function getCall(callId) {
  if (!usingFixtures()) return null

  const data = getDataset()
  const call = data.calls.find((entry) => entry.id === callId)
  if (!call) return null

  const lead = data.leads.find((entry) => entry.id === call.leadId) || null

  return {
    ...call,
    startedAtLabel: formatDateTime(call.startedAt),
    durationLabel: formatDuration(call.durationSeconds),
    lead,
    // Deliberately not a real transcript. Enough to lay out the UI, obviously
    // placeholder so nobody mistakes it for a recorded conversation.
    transcript: call.disposition === 'connected'
      ? [
          { at: '0:00', speaker: 'Agent', text: 'Placeholder transcript line. Real transcripts arrive from the phone system.' },
          { at: '0:14', speaker: 'Caller', text: 'Placeholder transcript line.' },
          { at: '0:41', speaker: 'Agent', text: 'Placeholder transcript line.' },
        ]
      : [],
  }
}

/**
 * Attribution breakdown, grouped by a dimension.
 * Reported all the way down the funnel rather than stopping at sessions.
 * Knowing a campaign drove traffic is not useful on its own. Knowing it drove
 * calls that became enrollments is.
 */
export async function getAttribution({ groupBy = 'source' } = {}) {
  const dimensions = ['source', 'campaign', 'landingPage', 'device', 'onBehalfOf']
  if (!usingFixtures()) return { groupBy, availableDimensions: dimensions, rows: [], isEmpty: true }

  const data = getDataset()
  const keyFor = (lead) =>
    ({ source: lead.source, campaign: lead.campaign, landingPage: lead.landingPage, device: lead.device, onBehalfOf: lead.onBehalfOf })[groupBy] ||
    '(unknown)'

  const groups = new Map()
  for (const lead of data.leads) {
    const key = keyFor(lead)
    if (!groups.has(key)) groups.set(key, { value: key, leads: 0, calls: 0, conversions: 0 })
    const group = groups.get(key)
    group.leads += 1
    group.calls += lead.callCount
    if (lead.status === 'enrolled') group.conversions += 1
  }

  const rows = [...groups.values()]
    .map((group) => ({ ...group, conversionRate: `${((group.conversions / group.leads) * 100).toFixed(1)}%` }))
    .sort((a, b) => b.leads - a.leads)

  return { groupBy, availableDimensions: dimensions, rows, isEmpty: false }
}

/**
 * Agent performance.
 *
 * TODO this page ranks people. Before it is shown beyond the management team,
 * decide what an agent may see about themselves and about others. The
 * straightforward answer is that an agent sees only their own row, which needs
 * a role on the session rather than the single allowlist used today.
 */
export async function getAgentPerformance() {
  if (!usingFixtures()) return { agents: [], isEmpty: true }

  const data = getDataset()

  const agents = AGENTS.map((agent) => {
    const calls = data.calls.filter((call) => call.agentId === agent.id)
    const leads = data.leads.filter((lead) => lead.agentId === agent.id)
    const conversions = leads.filter((lead) => lead.status === 'enrolled').length
    const talkSeconds = calls.reduce((sum, call) => sum + call.durationSeconds, 0)

    return {
      id: agent.id,
      name: agent.name,
      calls: calls.length,
      talkTime: formatDuration(talkSeconds),
      leads: leads.length,
      conversions,
      conversionRate: leads.length ? `${((conversions / leads.length) * 100).toFixed(1)}%` : '-',
    }
  }).sort((a, b) => b.conversions - a.conversions)

  return { agents, isEmpty: false }
}

/**
 * Lead statuses, for filter dropdowns.
 * TODO these must mirror the CRM's own statuses once the CRM is identified.
 * Inventing a parallel vocabulary guarantees the two drift apart and makes
 * every report an argument about definitions.
 */
export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'lost', label: 'Lost' },
]
