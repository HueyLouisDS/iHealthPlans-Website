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


// Shortcuts on the Show tab. Any number between the bounds below can also be
// typed, these are just the sizes people actually pick.
export const PER_PAGE_OPTIONS = [25, 50, 100, 200]

// Bounds for a typed value. The ceiling exists because this parameter comes off
// a query string, so without it anyone could ask for every record in a single
// request, which is both a slow page and a trivial way to load the server.
export const PER_PAGE_MIN = 5
export const PER_PAGE_MAX = 500
export const PER_PAGE_DEFAULT = 25

/**
 * Turns a perPage parameter into a row count.
 * Clamped rather than rejected, so typing 5000 gives the largest allowed page
 * instead of an error, and anything that is not a number falls back to the
 * default. Never trust this value, it is user supplied.
 */
export function parsePerPage(value) {
  const size = Number.parseInt(value, 10)
  if (!Number.isFinite(size)) return PER_PAGE_DEFAULT
  return Math.min(Math.max(size, PER_PAGE_MIN), PER_PAGE_MAX)
}

// Periods the dashboard offers. 90 is the limit because that is how much
// history the fixtures hold, and because a Medicare business thinks in
// enrollment seasons rather than in years.
export const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

/**
 * Turns a period parameter into a day count, clamped to what exists.
 * Anything unrecognised falls back to 30 rather than erroring, since this
 * comes off a query string.
 */
export function parsePeriod(value) {
  const days = Number.parseInt(value, 10)
  return PERIODS.some((p) => Number(p.value) === days) ? days : 30
}

/**
 * Start of the day N days ago, so a range includes whole days.
 */
function startOfDaysAgo(days) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)
}

/**
 * Splits the dataset into the selected period and the one immediately before
 * it, which is what makes a percentage change possible.
 * Without a comparison a number like 268 leads is unreadable. Nobody knows
 * whether that is good.
 */
function splitByPeriod(items, dateKey, days) {
  const currentFrom = startOfDaysAgo(days)
  const previousFrom = startOfDaysAgo(days * 2)

  return {
    current: items.filter((item) => item[dateKey] >= currentFrom),
    previous: items.filter((item) => item[dateKey] >= previousFrom && item[dateKey] < currentFrom),
  }
}

/**
 * Percentage change between two counts, as a signed display string.
 * Returns null when there is no previous figure to compare against, because
 * "up 100%" from zero is meaningless and reads as a real result.
 */
function delta(current, previous) {
  if (!previous) return null
  const change = ((current - previous) / previous) * 100
  const rounded = Math.abs(change) < 0.05 ? 0 : change
  return { value: `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`, direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat' }
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
 * Funnel totals for the dashboard, over a period, with the previous period of
 * the same length for comparison.
 * Each stage carries its conversion rate from the stage above and its change
 * against the previous period. Without the comparison a bare count tells a
 * manager nothing about whether it is good.
 */
export async function getFunnelSummary({ days = 30 } = {}) {
  const blank = ['Sessions', 'Call clicks', 'Calls connected', 'Leads', 'Conversions']
  if (!usingFixtures()) {
    return {
      days,
      stages: blank.map((label) => ({ key: label, label, count: 0, rateFromPrevious: null, delta: null })),
      isEmpty: true,
    }
  }

  const data = getDataset()
  const daily = splitByPeriod(data.daily, 'date', days)
  const leads = splitByPeriod(data.leads, 'createdAt', days)
  const calls = splitByPeriod(data.calls, 'startedAt', days)

  const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0)
  const connected = (rows) => rows.filter((call) => call.disposition === 'connected').length
  const enrolled = (rows) => rows.filter((lead) => lead.status === 'enrolled').length

  const now = {
    sessions: sum(daily.current, 'sessions'),
    callClicks: sum(daily.current, 'callClicks'),
    calls: connected(calls.current),
    leads: leads.current.length,
    conversions: enrolled(leads.current),
  }
  const before = {
    sessions: sum(daily.previous, 'sessions'),
    callClicks: sum(daily.previous, 'callClicks'),
    calls: connected(calls.previous),
    leads: leads.previous.length,
    conversions: enrolled(leads.previous),
  }

  const order = [
    ['sessions', 'Sessions', null],
    ['callClicks', 'Call clicks', 'sessions'],
    ['calls', 'Calls connected', 'callClicks'],
    ['leads', 'Leads', 'calls'],
    ['conversions', 'Conversions', 'leads'],
  ]

  return {
    days,
    stages: order.map(([key, label, from]) => ({
      key,
      label,
      count: now[key],
      rateFromPrevious: from ? rate(now[key], now[from]) : null,
      // Share of the first stage, which is what gives the funnel its shape
      shareOfTop: now.sessions ? now[key] / now.sessions : 0,
      dropFromPrevious: from && now[from] ? now[from] - now[key] : null,
      delta: delta(now[key], before[key]),
    })),
    isEmpty: false,
  }
}

/**
 * Daily leads and calls for the trend chart, over the selected period.
 * One row per day so a gap renders as zero rather than vanishing, which is
 * what makes a drop off visible.
 */
export async function getFunnelTrend({ days = 30 } = {}) {
  if (!usingFixtures()) return { days: [], isEmpty: true }

  const data = getDataset()
  const buckets = new Map()

  for (let day = days - 1; day >= 0; day -= 1) {
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

  const rows = [...buckets.values()]
  return { days: rows, peak: Math.max(1, ...rows.map((d) => Math.max(d.leads, d.calls))), isEmpty: false }
}

/**
 * Top traffic sources by leads produced, for the dashboard.
 * Ranked by leads rather than by sessions on purpose. A source that sends a
 * lot of traffic and no leads is not a top source, it is a cost.
 */
export async function getTopSources({ days = 30, limit = 5 } = {}) {
  if (!usingFixtures()) return { rows: [], isEmpty: true }

  const { current } = splitByPeriod(getDataset().leads, 'createdAt', days)
  const groups = new Map()

  for (const lead of current) {
    if (!groups.has(lead.source)) groups.set(lead.source, { source: lead.source, leads: 0, conversions: 0 })
    const group = groups.get(lead.source)
    group.leads += 1
    if (lead.status === 'enrolled') group.conversions += 1
  }

  const rows = [...groups.values()].sort((a, b) => b.leads - a.leads).slice(0, limit)
  const top = Math.max(1, ...rows.map((row) => row.leads))

  return {
    rows: rows.map((row) => ({
      ...row,
      share: row.leads / top,
      conversionRate: `${((row.conversions / row.leads) * 100).toFixed(1)}%`,
    })),
    isEmpty: rows.length === 0,
  }
}

/**
 * The most recent leads, so the dashboard shows activity rather than only
 * aggregates. Somebody opening this page usually wants to know what happened
 * today before they want a 90 day total.
 */
export async function getRecentLeads({ limit = 6 } = {}) {
  if (!usingFixtures()) return { rows: [], isEmpty: true }

  const rows = getDataset().leads.slice(0, limit).map((lead) => ({
    ...lead,
    createdAtLabel: formatDateTime(lead.createdAt),
  }))

  return { rows, isEmpty: rows.length === 0 }
}

/**
 * Paginated, filtered lead list, plus the facets needed to build the filter
 * controls and the summary tiles above it.
 *
 * Facet counts are computed before the status filter is applied but after
 * everything else, so the status pills keep showing how many leads are in each
 * status rather than collapsing to the one that is selected. A filter control
 * that hides its own options is unusable.
 */
export async function getLeads({ page = 1, perPage = 25, days = 30, source, status, query, sort = 'newest' } = {}) {
  const empty = {
    leads: [],
    total: 0,
    page,
    perPage,
    totalPages: 1,
    sources: [],
    statusCounts: {},
    summary: { total: 0, enrolled: 0, conversionRate: '0.0%', onBehalfOfOther: 0, withoutCall: 0 },
    isEmpty: true,
  }
  if (!usingFixtures()) return empty

  const { current } = splitByPeriod(getDataset().leads, 'createdAt', days)

  let rows = current
  if (source) rows = rows.filter((lead) => lead.source === source)
  if (query && query.trim()) {
    const needle = query.trim().toLowerCase()
    const digits = needle.replace(/[^0-9]/g, '')

    rows = rows.filter((lead) => {
      if (lead.name.toLowerCase().includes(needle)) return true

      // Only compare against the phone and zip when the term actually contains
      // digits. Stripping non digits from a text search leaves an empty
      // string, and "5550110".includes("") is true for every record, so a
      // search for a name silently matched the entire table.
      if (!digits) return false

      return lead.phone.replace(/[^0-9]/g, '').includes(digits) || lead.zip.includes(digits)
    })
  }

  // Everything above this line also feeds the tiles and the status counts
  const beforeStatus = rows

  const statusCounts = {}
  for (const lead of beforeStatus) {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1
  }

  const enrolled = beforeStatus.filter((lead) => lead.status === 'enrolled').length
  const summary = {
    total: beforeStatus.length,
    enrolled,
    conversionRate: beforeStatus.length ? `${((enrolled / beforeStatus.length) * 100).toFixed(1)}%` : '0.0%',
    // How many enquiries come from somebody acting for a relative. Worth its
    // own tile because those calls need a different opening and the split is
    // not visible anywhere else.
    onBehalfOfOther: beforeStatus.filter((lead) => lead.onBehalfOf !== 'Myself').length,
    // Leads that never produced a call. Either they are waiting for a callback
    // or somebody has not picked them up, and both are worth knowing.
    withoutCall: beforeStatus.filter((lead) => lead.callCount === 0).length,
  }

  if (status) rows = rows.filter((lead) => lead.status === status)

  const sorters = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
    name: (a, b) => a.name.localeCompare(b.name),
  }
  rows = [...rows].sort(sorters[sort] || sorters.newest)

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * perPage

  return {
    leads: rows.slice(start, start + perPage).map((lead) => ({
      ...lead,
      createdAtLabel: formatDateTime(lead.createdAt),
    })),
    total: rows.length,
    page: currentPage,
    perPage,
    totalPages,
    sources: [...new Set(current.map((lead) => lead.source))].sort(),
    statusCounts,
    summary,
    isEmpty: false,
  }
}

/**
 * Every lead matching the filters, unpaginated, for export.
 * Separate from getLeads on purpose. An export must not silently return only
 * the page the user happened to be looking at, and it must not be reachable
 * without going through the audit in the route handler.
 */
export async function getLeadsForExport(filters = {}, ids = null) {
  const first = await getLeads({ ...filters, page: 1, perPage: 1 })
  if (first.isEmpty) return []

  const all = await getLeads({ ...filters, page: 1, perPage: Math.max(first.total, 1) })

  // A selection still runs through the filters first, so a stale id from
  // another view cannot pull back a record the current filters exclude
  if (!ids || ids.length === 0) return all.leads
  const wanted = new Set(ids)
  return all.leads.filter((lead) => wanted.has(lead.id))
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
 * Call log, filtered, with the facets needed for the filter panel and the
 * tiles above it.
 *
 * The matched share is the number that matters here. It says what proportion
 * of calls were tied back to a web session, and it is the single best health
 * metric for the whole attribution system. A falling matched rate means the
 * click to call binding is breaking, and nothing else on the site would show
 * that.
 */
export async function getCalls({
  page = 1,
  perPage = 25,
  days = 30,
  matched,
  disposition,
  agentId,
  hasRecording,
  sort = 'newest',
} = {}) {
  const empty = {
    calls: [],
    total: 0,
    page,
    perPage,
    totalPages: 1,
    dispositionCounts: {},
    agents: [],
    summary: { total: 0, connected: 0, connectedRate: '0.0%', matched: 0, matchedRate: '0.0%', unmatched: 0, averageTalk: '0:00' },
    isEmpty: true,
  }
  if (!usingFixtures()) return empty

  const { current } = splitByPeriod(getDataset().calls, 'startedAt', days)

  // Tiles describe the period, not the filtered subset, so narrowing to
  // unmatched calls does not make the matched rate read as 0%
  const connected = current.filter((call) => call.disposition === 'connected')
  const matchedCalls = current.filter((call) => call.matched)
  const talkSeconds = connected.reduce((total, call) => total + call.durationSeconds, 0)

  const summary = {
    total: current.length,
    connected: connected.length,
    connectedRate: current.length ? `${((connected.length / current.length) * 100).toFixed(1)}%` : '0.0%',
    matched: matchedCalls.length,
    matchedRate: current.length ? `${((matchedCalls.length / current.length) * 100).toFixed(1)}%` : '0.0%',
    unmatched: current.length - matchedCalls.length,
    averageTalk: formatDuration(connected.length ? Math.round(talkSeconds / connected.length) : 0),
  }

  const dispositionCounts = {}
  for (const call of current) {
    dispositionCounts[call.disposition] = (dispositionCounts[call.disposition] || 0) + 1
  }

  let rows = current
  if (matched === 'yes') rows = rows.filter((call) => call.matched)
  if (matched === 'no') rows = rows.filter((call) => !call.matched)
  if (disposition) rows = rows.filter((call) => call.disposition === disposition)
  if (agentId) rows = rows.filter((call) => call.agentId === agentId)
  if (hasRecording === 'yes') rows = rows.filter((call) => call.hasRecording)
  if (hasRecording === 'no') rows = rows.filter((call) => !call.hasRecording)

  const sorters = {
    newest: (a, b) => b.startedAt - a.startedAt,
    oldest: (a, b) => a.startedAt - b.startedAt,
    longest: (a, b) => b.durationSeconds - a.durationSeconds,
    shortest: (a, b) => a.durationSeconds - b.durationSeconds,
  }
  rows = [...rows].sort(sorters[sort] || sorters.newest)

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * perPage

  return {
    calls: rows.slice(start, start + perPage).map((call) => ({
      ...call,
      startedAtLabel: formatDateTime(call.startedAt),
      durationLabel: formatDuration(call.durationSeconds),
    })),
    total: rows.length,
    page: currentPage,
    perPage,
    totalPages,
    dispositionCounts,
    agents: AGENTS,
    summary,
    isEmpty: false,
  }
}

/**
 * Every call matching the filters, unpaginated, for export.
 * Separate from getCalls for the same reason as the lead version. An export
 * must not silently return only the page on screen, and a selection must still
 * pass through the filters so a stale id cannot reach outside the view.
 */
export async function getCallsForExport(filters = {}, ids = null) {
  const first = await getCalls({ ...filters, page: 1, perPage: 1 })
  if (first.isEmpty) return []

  const all = await getCalls({ ...filters, page: 1, perPage: Math.max(first.total, 1) })
  if (!ids || ids.length === 0) return all.calls

  const wanted = new Set(ids)
  return all.calls.filter((call) => wanted.has(call.id))
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
