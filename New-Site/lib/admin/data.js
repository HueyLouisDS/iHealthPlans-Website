/**
 * Data access for the admin area, and the definition of what the reporting
 * layer actually needs.
 *
 * There is no database yet. Every function below has 2 paths.
 *
 *   LH_ADMIN_USE_FIXTURES=true   returns fabricated demo data from fixtures.js,
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
  return process.env.LH_ADMIN_USE_FIXTURES === 'true'
}


/*
 Shortcuts on the Show tab. Any number between the bounds below can also be
 typed, these are just the sizes people actually pick.
*/
export const PER_PAGE_OPTIONS = [25, 50, 100, 200]

/*
 Bounds for a typed value. The ceiling exists because this parameter comes off
 a query string, so without it anyone could ask for every record in a single
 request, which is both a slow page and a trivial way to load the server.
*/
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

/*
 Periods the dashboard offers. 90 is the limit because that is how much
 history the fixtures hold, and because a Medicare business thinks in
 enrollment seasons rather than in years.
*/
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
/**
 * The 5 funnel stages, in order, as the one definition the dashboard reads.
 *
 * `slug` is what appears in ?stage=, kebab case because a url is read by
 * people. It is a query parameter rather than a path segment because
 * /admin/leads is already the lead list, so /admin/<stage> would collide with
 * a real page the moment anyone selected the leads tile.
 *
 * `onward` is where to go for the records behind the number, and null where no
 * such page exists yet. Sessions and call clicks have no table, and inventing
 * a link to an empty page would be worse than admitting the gap.
 */
export const FUNNEL_STAGES = [
  { key: 'sessions', slug: 'sessions', label: 'Sessions', noun: 'sessions', onward: null },
  { key: 'callClicks', slug: 'call-clicks', label: 'Call clicks', noun: 'call clicks', onward: null },
  {
    key: 'calls',
    slug: 'calls-connected',
    label: 'Calls connected',
    noun: 'connected calls',
    onward: { href: '/admin/calls?disposition=connected', label: 'Open the call log' },
  },
  {
    key: 'leads',
    slug: 'leads',
    label: 'Leads',
    noun: 'leads',
    onward: { href: '/admin/leads', label: 'Open the lead list' },
  },
  {
    key: 'conversions',
    slug: 'conversions',
    label: 'Conversions',
    noun: 'enrollments',
    onward: { href: '/admin/leads?status=enrolled', label: 'Open the enrolled leads' },
  },
]

/**
 * Turns a stage parameter into a stage, or null when none is selected.
 * Null for anything unrecognised too, so a hand typed ?stage=banana shows the
 * unfiltered dashboard rather than erroring.
 */
export function parseStage(slug) {
  return FUNNEL_STAGES.find((stage) => stage.slug === slug) || null
}

/**
 * Daily figures for the trend chart, over the selected period.
 *
 * One row per day so a gap renders as zero rather than vanishing, which is
 * what makes a drop off visible. Every funnel stage is returned rather than
 * only leads and calls, because selecting a tile focuses the chart on that
 * stage and the data has to be there for all 5.
 */
export async function getFunnelTrend({ days = 30 } = {}) {
  if (!usingFixtures()) return { days: [], isEmpty: true }

  const data = getDataset()
  const buckets = new Map()

  for (let day = days - 1; day >= 0; day -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - day)
    buckets.set(date.toDateString(), {
      date,
      sessions: 0,
      callClicks: 0,
      calls: 0,
      leads: 0,
      conversions: 0,
    })
  }

  /*
   Sessions and call clicks are a daily series in the fixtures rather than
   individual records, since neither has a table yet
  */
  for (const row of data.daily) {
    const bucket = buckets.get(row.date.toDateString())
    if (!bucket) continue
    bucket.sessions += row.sessions
    bucket.callClicks += row.callClicks
  }

  for (const lead of data.leads) {
    const bucket = buckets.get(lead.createdAt.toDateString())
    if (!bucket) continue
    bucket.leads += 1
    if (lead.status === 'enrolled') bucket.conversions += 1
  }

  /*
   Connected only, matching the funnel stage. Counting every call here would
   put a bigger number on the chart than the tile it is meant to explain.
  */
  for (const call of data.calls) {
    if (call.disposition !== 'connected') continue
    const bucket = buckets.get(call.startedAt.toDateString())
    if (bucket) bucket.calls += 1
  }

  const rows = [...buckets.values()]
  return {
    days: rows,
    peak: Math.max(1, ...rows.map((row) => Math.max(row.leads, row.calls))),
    isEmpty: false,
  }
}

/**
 * Top traffic sources by leads produced, for the dashboard.
 * Ranked by leads rather than by sessions on purpose. A source that sends a
 * lot of traffic and no leads is not a top source, it is a cost.
 */
export async function getTopSources({ days = 30, limit = 5 } = {}) {
  const empty = { measures: { leads: [], conversions: [] }, isEmpty: true }
  if (!usingFixtures()) return empty

  const { current } = splitByPeriod(getDataset().leads, 'createdAt', days)
  const groups = new Map()

  for (const lead of current) {
    if (!groups.has(lead.source)) groups.set(lead.source, { source: lead.source, leads: 0, conversions: 0 })
    const group = groups.get(lead.source)
    group.leads += 1
    if (lead.status === 'enrolled') group.conversions += 1
  }

  const all = [...groups.values()]

  /**
   * Top `limit` sources by one measure, each bar scaled against the leader.
   *
   * Ranked independently per measure rather than re-sorting one list. Taking
   * the top 5 by leads and then re-ordering those by enrollments would hide a
   * source that converts well on modest volume, which is exactly the source
   * worth finding.
   */
  const rank = (key) => {
    const rows = [...all].sort((a, b) => b[key] - a[key]).slice(0, limit)
    const top = Math.max(1, ...rows.map((row) => row[key]))

    return rows.map((row) => ({
      ...row,
      /*
       Against the leader rather than against the total, so the best row
       always fills its bar and the rest are read relative to it
      */
      share: row[key] / top,
      conversionRate: row.leads ? `${((row.conversions / row.leads) * 100).toFixed(1)}%` : '0.0%',
    }))
  }

  return {
    measures: { leads: rank('leads'), conversions: rank('conversions') },
    isEmpty: all.length === 0,
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
export async function getLeads({
  page = 1,
  perPage = 25,
  days = 30,
  source,
  status,
  // Who the enquiry is for. "other" means somebody acting for a relative.
  audience,
  // "no" for leads that never produced a call, "yes" for those that did.
  hasCall,
  query,
  sort = 'newest',
} = {}) {
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

      /*
       Only compare against the phone and zip when the term actually contains
       digits. Stripping non digits from a text search leaves an empty
       string, and "5550110".includes("") is true for every record, so a
       search for a name silently matched the entire table.
      */
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
    /*
     How many enquiries come from somebody acting for a relative. Worth its
     own tile because those calls need a different opening and the split is
     not visible anywhere else.
    */
    onBehalfOfOther: beforeStatus.filter((lead) => lead.onBehalfOf !== 'Myself').length,
    /*
     Leads that never produced a call. Either they are waiting for a callback
     or somebody has not picked them up, and both are worth knowing.
    */
    withoutCall: beforeStatus.filter((lead) => lead.callCount === 0).length,
  }

  /*
   Applied after the summary on purpose, along with status. The tiles
   describe the period so they can be clicked to filter, and a tile whose own
   number changes the moment you click it is a control that argues with
   itself.
  */
  if (status) rows = rows.filter((lead) => lead.status === status)
  if (audience === 'other') rows = rows.filter((lead) => lead.onBehalfOf !== 'Myself')
  if (audience === 'self') rows = rows.filter((lead) => lead.onBehalfOf === 'Myself')
  if (hasCall === 'no') rows = rows.filter((lead) => lead.callCount === 0)
  if (hasCall === 'yes') rows = rows.filter((lead) => lead.callCount > 0)

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

  /*
   A selection still runs through the filters first, so a stale id from
   another view cannot pull back a record the current filters exclude
  */
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

  /*
   A plausible page path for this lead, built from where they landed. The
   real version reads the pageView table.
  */
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

  /*
   Tiles describe the period, not the filtered subset, so narrowing to
   unmatched calls does not make the matched rate read as 0%
  */
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
    /*
     Deliberately not a real transcript. Enough to lay out the UI, obviously
     placeholder so nobody mistakes it for a recorded conversation.
    */
    transcript: call.disposition === 'connected'
      ? [
          { at: '0:00', speaker: 'Agent', text: 'Placeholder transcript line. Real transcripts arrive from the phone system.' },
          { at: '0:14', speaker: 'Caller', text: 'Placeholder transcript line.' },
          { at: '0:41', speaker: 'Agent', text: 'Placeholder transcript line.' },
        ]
      : [],
  }
}

/*
 The dimensions a lead can be grouped by.

 `value` is the field on the lead, `slug` is the url segment, `label` is the
 button, and `column` is the heading of the first table column, which has to
 change with the grouping or every view reads as an unlabelled list of
 strings.

 The slug is kebab case and deliberately not the field name. A url is read by
 people, and /admin/attribution/enquiring-for says what the page shows in a
 way /admin/attribution/onBehalfOf does not.
*/
export const ATTRIBUTION_DIMENSIONS = [
  { value: 'source', slug: 'source', label: 'Source', column: 'Source / medium' },
  { value: 'campaign', slug: 'campaign', label: 'Campaign', column: 'Campaign' },
  { value: 'landingPage', slug: 'landing-page', label: 'Landing page', column: 'Landing page' },
  { value: 'device', slug: 'device', label: 'Device', column: 'Device' },
  /*
   What the enquiry form calls "who are you enquiring for". Worth its own
   dimension because a daughter researching for a parent behaves nothing like
   a beneficiary shopping for themselves, and the 2 convert differently.
  */
  { value: 'onBehalfOf', slug: 'enquiring-for', label: 'Enquiring for', column: 'Enquiring for' },
]

// The dimension every attribution link lands on when none is named
export const DEFAULT_DIMENSION = ATTRIBUTION_DIMENSIONS[0]

export const ATTRIBUTION_SORTS = [
  { value: 'leads', label: 'Most leads' },
  { value: 'conversions', label: 'Most enrollments' },
  { value: 'rate', label: 'Best rate' },
  { value: 'calls', label: 'Most calls' },
]

/*
 Under this many leads, a conversion rate is noise rather than a measurement.
 2 enrollments out of 3 leads is 66.7%, which will out rank every real source
 on the page and send somebody off to move budget onto luck. Rows below the
 threshold still show their rate, but marked, so it cannot be read straight.
*/
export const LOW_VOLUME_LEADS = 25

/**
 * Looks up a dimension by its url segment.
 *
 * Returns null rather than falling back to source, because the caller is a
 * route segment and not a query parameter. A bad filter in a query string
 * should degrade to something sensible, but /admin/attribution/banana is a
 * page that does not exist and has to say so. Quietly serving the source
 * breakdown under that url would mean somebody bookmarks it, shares it, and
 * gets a different report than the one they think they are looking at.
 */
export function findDimension(slug) {
  return ATTRIBUTION_DIMENSIONS.find((d) => d.slug === slug) || null
}

/**
 * A url and selection safe id for a group.
 *
 * Group values are arbitrary text, and the table's selection export passes ids
 * as a comma separated list. A value containing a comma would silently split
 * into 2 ids and export the wrong rows, so the id is a slug rather than the
 * value itself.
 *
 * Anything with no usable characters becomes "group" rather than "unknown",
 * because "(unknown)" is a real group value here and the 2 must not land on
 * the same slug.
 */
function slugify(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'group'
  )
}

/**
 * Assigns each group a unique id, in place.
 *
 * Two different values can slug to the same string, and the landing page "/"
 * proved it, slugging to nothing at all. Two rows sharing an id means selecting
 * one and exporting gives you both, silently.
 *
 * The suffix is assigned in the order the groups were built, which comes from
 * the dataset and not from the sort parameter. That matters, because the page
 * and its export must agree on ids, and the export is free to be sorted
 * differently.
 */
function assignGroupIds(groups) {
  const used = new Map()

  for (const group of groups) {
    const base = slugify(group.value)
    const count = (used.get(base) || 0) + 1
    used.set(base, count)
    group.id = count === 1 ? base : `${base}-${count}`
  }

  return groups
}

/**
 * Attribution breakdown, grouped by a dimension.
 *
 * Reported all the way down the funnel rather than stopping at sessions.
 * Knowing a campaign drove traffic is not useful on its own. Knowing it drove
 * calls that became enrollments is.
 *
 * The device and onBehalfOf filters narrow the leads before grouping, so you
 * can ask a real question like "which campaigns work on mobile" rather than
 * only ever seeing one dimension at a time.
 *
 * TODO calls that never became a lead carry no source, because that lives on
 * the session and there is no session table. They are counted and reported
 * separately rather than dropped, since a report that quietly omits two thirds
 * of the call volume is worse than one that admits the gap.
 */
export async function getAttribution({ groupBy = 'source', days = 30, device, onBehalfOf, sort = 'leads' } = {}) {
  const dimension = ATTRIBUTION_DIMENSIONS.find((d) => d.value === groupBy) || ATTRIBUTION_DIMENSIONS[0]

  const empty = {
    groupBy: dimension.value,
    dimension,
    days,
    rows: [],
    summary: { leads: 0, calls: 0, conversions: 0, conversionRate: '0.0%', groups: 0 },
    unattributedCalls: 0,
    totalCalls: 0,
    devices: [],
    audiences: [],
    isEmpty: true,
  }
  if (!usingFixtures()) return empty

  const data = getDataset()
  const from = startOfDaysAgo(days)

  let leads = data.leads.filter((lead) => lead.createdAt >= from)
  if (device) leads = leads.filter((lead) => lead.device === device)
  if (onBehalfOf) leads = leads.filter((lead) => lead.onBehalfOf === onBehalfOf)

  const periodCalls = data.calls.filter((call) => call.startedAt >= from)

  const groups = new Map()
  for (const lead of leads) {
    const key = lead[dimension.value] || '(unknown)'
    if (!groups.has(key)) {
      /*
       The id is assigned after the loop, once every group is known, so
       collisions can be seen and broken
      */
      groups.set(key, { value: key, leads: 0, calls: 0, conversions: 0 })
    }
    const group = groups.get(key)
    group.leads += 1
    group.calls += lead.callCount
    if (lead.status === 'enrolled') group.conversions += 1
  }

  const totalLeads = leads.length
  const totalConversions = leads.filter((lead) => lead.status === 'enrolled').length

  const rows = assignGroupIds([...groups.values()]).map((group) => ({
    ...group,
    /*
     Share of the filtered leads, not of everything, so the column always
     adds up to 100 against the table it is sitting in
    */
    leadShare: totalLeads ? `${((group.leads / totalLeads) * 100).toFixed(1)}%` : '0.0%',
    callsPerLead: group.leads ? (group.calls / group.leads).toFixed(2) : '0.00',
    conversionRate: group.leads ? `${((group.conversions / group.leads) * 100).toFixed(1)}%` : '0.0%',
    lowVolume: group.leads < LOW_VOLUME_LEADS,
  }))

  const sorters = {
    leads: (a, b) => b.leads - a.leads,
    conversions: (a, b) => b.conversions - a.conversions,
    calls: (a, b) => b.calls - a.calls,
    /*
     Thin rows sink to the bottom of a rate sort rather than winning it,
     which is the whole reason the flag exists
    */
    rate: (a, b) =>
      Number(a.lowVolume) - Number(b.lowVolume) ||
      Number.parseFloat(b.conversionRate) - Number.parseFloat(a.conversionRate),
  }
  rows.sort(sorters[sort] || sorters.leads)

  return {
    groupBy: dimension.value,
    dimension,
    days,
    rows,
    summary: {
      leads: totalLeads,
      calls: leads.reduce((sum, lead) => sum + lead.callCount, 0),
      conversions: totalConversions,
      conversionRate: totalLeads ? `${((totalConversions / totalLeads) * 100).toFixed(1)}%` : '0.0%',
      groups: rows.length,
    },
    /*
     Calls in the period that never became a lead, so no source can be put
     against them yet. Surfaced on the page rather than hidden.
    */
    unattributedCalls: periodCalls.filter((call) => !call.leadId).length,
    totalCalls: periodCalls.length,
    devices: [...new Set(data.leads.map((lead) => lead.device))].sort(),
    audiences: [...new Set(data.leads.map((lead) => lead.onBehalfOf))].sort(),
    isEmpty: totalLeads === 0,
  }
}

/**
 * The same breakdown, unpaginated, for the csv export.
 * `ids` narrows to an explicit selection from the table, and can only ever
 * narrow what the filters already permit.
 */
export async function getAttributionForExport(filters = {}, ids = null) {
  const result = await getAttribution(filters)
  if (!ids || ids.length === 0) return result.rows

  const wanted = new Set(ids)
  return result.rows.filter((row) => wanted.has(row.id))
}

export const AGENT_SORTS = [
  { value: 'conversions', label: 'Most enrollments' },
  { value: 'rate', label: 'Best rate' },
  { value: 'calls', label: 'Most calls' },
  { value: 'talk', label: 'Most talk time' },
  { value: 'name', label: 'Name' },
]

/**
 * Formats a large duration as hours and minutes.
 * formatDuration gives m:ss, which is right for one call and useless for a
 * quarter's worth of them. Nobody can read 1543:20.
 */
function formatTalkTime(seconds) {
  /*
   Rounded to whole minutes first, then split. Rounding the remainder instead
   produces "14h 60m", which is what this did until 53,999 seconds turned up.
  */
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

/**
 * Agent performance.
 *
 * Every agent is returned, including one who did nothing in the period. An
 * absence is a fact about the period, and dropping the row makes it look like
 * the person is not on the team.
 *
 * TODO this page ranks people. Before it is shown beyond the management team,
 * decide what an agent may see about themselves and about others. The
 * straightforward answer is that an agent sees only their own row, which needs
 * a role on the session rather than the single allowlist used today.
 *
 * TODO the conversion rate here is not a like for like comparison. Lead quality
 * varies by source, by hour, and by how the lead arrived, and none of that is
 * held constant. Comparing agents properly means comparing them within a
 * source, which needs the session table.
 */
export async function getAgentPerformance({ days = 30, sort = 'conversions' } = {}) {
  const empty = {
    agents: [],
    days,
    summary: { agents: 0, calls: 0, talkTime: '0m', leads: 0, conversions: 0, conversionRate: '0.0%' },
    isEmpty: true,
  }
  if (!usingFixtures()) return empty

  const data = getDataset()
  const from = startOfDaysAgo(days)

  const periodCalls = data.calls.filter((call) => call.startedAt >= from)
  const periodLeads = data.leads.filter((lead) => lead.createdAt >= from)

  const agents = AGENTS.map((agent) => {
    const calls = periodCalls.filter((call) => call.agentId === agent.id)
    const leads = periodLeads.filter((lead) => lead.agentId === agent.id)
    const conversions = leads.filter((lead) => lead.status === 'enrolled').length
    const connected = calls.filter((call) => call.disposition === 'connected').length
    const talkSeconds = calls.reduce((sum, call) => sum + call.durationSeconds, 0)

    return {
      id: agent.id,
      name: agent.name,
      calls: calls.length,
      connected,
      connectedRate: calls.length ? `${((connected / calls.length) * 100).toFixed(1)}%` : '0.0%',
      talkSeconds,
      talkTime: formatTalkTime(talkSeconds),
      /*
       Averaged over connected calls only. Including the ones nobody picked
       up drags every agent towards zero and measures the dialler, not them.
      */
      averageCall: connected ? formatDuration(Math.round(talkSeconds / connected)) : '-',
      leads: leads.length,
      conversions,
      conversionRate: leads.length ? `${((conversions / leads.length) * 100).toFixed(1)}%` : '0.0%',
      lowVolume: leads.length < LOW_VOLUME_LEADS,
    }
  })

  const sorters = {
    conversions: (a, b) => b.conversions - a.conversions,
    calls: (a, b) => b.calls - a.calls,
    talk: (a, b) => b.talkSeconds - a.talkSeconds,
    name: (a, b) => a.name.localeCompare(b.name),
    /*
     Thin rows sink rather than win, same as attribution. An agent handed 8
     leads who closed 3 is not outperforming one handed 60 who closed 14.
    */
    rate: (a, b) =>
      Number(a.lowVolume) - Number(b.lowVolume) ||
      Number.parseFloat(b.conversionRate) - Number.parseFloat(a.conversionRate),
  }
  const sorted = [...agents].sort(sorters[sort] || sorters.conversions)

  const totalLeads = agents.reduce((sum, agent) => sum + agent.leads, 0)
  const totalConversions = agents.reduce((sum, agent) => sum + agent.conversions, 0)
  const totalTalk = agents.reduce((sum, agent) => sum + agent.talkSeconds, 0)

  return {
    agents: sorted,
    days,
    summary: {
      // Counted by who actually handled a call, not by how many rows exist
      agents: agents.filter((agent) => agent.calls > 0).length,
      calls: agents.reduce((sum, agent) => sum + agent.calls, 0),
      talkTime: formatTalkTime(totalTalk),
      leads: totalLeads,
      conversions: totalConversions,
      conversionRate: totalLeads ? `${((totalConversions / totalLeads) * 100).toFixed(1)}%` : '0.0%',
    },
    isEmpty: false,
  }
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
