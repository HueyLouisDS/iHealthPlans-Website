// Data access for the admin area, and the definition of what the reporting
// layer actually needs.
//
// There is no database yet. Every function below has 2 paths.
//
//   LH_ADMIN_USE_FIXTURES=true   returns fabricated demo data from fixtures.js,
//                             so the UI can be built and reviewed. Local only.
//   otherwise                 returns an empty result of the correct shape,
//                             which is the truth until tracking exists.
//
// The contracts are the same either way, so swapping in real queries later
// should not change a single signature.
//
// TODO replace each body with a query once lib/db/client.js and the migrations
// in db/migrations exist, and delete the fixtures branch.

import {
  getDataset,
  AGENTS,
  CAMPAIGNS,
  SOURCES,
  formatDuration,
  formatDateTime,
} from '@/lib/admin/fixtures'

export function usingFixtures() {
  return process.env.LH_ADMIN_USE_FIXTURES === 'true'
}

export const PER_PAGE_OPTIONS = [25, 50, 100, 200]
export const PER_PAGE_MIN = 5
export const PER_PAGE_MAX = 500
export const PER_PAGE_DEFAULT = 25

export function parsePerPage(value) {
  const size = Number.parseInt(value, 10)
  if (!Number.isFinite(size)) return PER_PAGE_DEFAULT
  return Math.min(Math.max(size, PER_PAGE_MIN), PER_PAGE_MAX)
}

export const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
]

export function parsePeriod(value) {
  const days = Number.parseInt(value, 10)
  return PERIODS.some((p) => Number(p.value) === days) ? days : 30
}

function startOfDaysAgo(days) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)
}

function splitByPeriod(items, dateKey, days) {
  const currentFrom = startOfDaysAgo(days)
  const previousFrom = startOfDaysAgo(days * 2)

  return {
    current: items.filter((item) => item[dateKey] >= currentFrom),
    previous: items.filter((item) => item[dateKey] >= previousFrom && item[dateKey] < currentFrom),
  }
}

function delta(current, previous) {
  if (!previous) return null
  const change = ((current - previous) / previous) * 100
  const rounded = Math.abs(change) < 0.05 ? 0 : change
  return { value: `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}%`, direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat' }
}

function rate(count, previous) {
  if (previous === null || previous === undefined || previous === 0) return null
  return `${((count / previous) * 100).toFixed(1)}%`
}

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

export function parseStage(slug) {
  return FUNNEL_STAGES.find((stage) => stage.slug === slug) || null
}

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
  const rank = (key) => {
    const rows = [...all].sort((a, b) => b[key] - a[key]).slice(0, limit)
    const top = Math.max(1, ...rows.map((row) => row[key]))

    return rows.map((row) => ({
      ...row,
      share: row[key] / top,
      conversionRate: row.leads ? `${((row.conversions / row.leads) * 100).toFixed(1)}%` : '0.0%',
    }))
  }

  return {
    measures: { leads: rank('leads'), conversions: rank('conversions') },
    isEmpty: all.length === 0,
  }
}

export async function getRecentLeads({ limit = 6 } = {}) {
  if (!usingFixtures()) return { rows: [], isEmpty: true }

  const rows = getDataset().leads.slice(0, limit).map((lead) => ({
    ...lead,
    createdAtLabel: formatDateTime(lead.createdAt),
  }))

  return { rows, isEmpty: rows.length === 0 }
}

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
      if (!digits) return false

      return lead.phone.replace(/[^0-9]/g, '').includes(digits) || lead.zip.includes(digits)
    })
  }

  const beforeStatus = rows             // also feeds the tiles and status counts

  const statusCounts = {}
  for (const lead of beforeStatus) {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1
  }

  const enrolled = beforeStatus.filter((lead) => lead.status === 'enrolled').length
  const summary = {
    total: beforeStatus.length,
    enrolled,
    conversionRate: beforeStatus.length ? `${((enrolled / beforeStatus.length) * 100).toFixed(1)}%` : '0.0%',
    onBehalfOfOther: beforeStatus.filter((lead) => lead.onBehalfOf !== 'Myself').length,
    withoutCall: beforeStatus.filter((lead) => lead.callCount === 0).length,
  }

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

export async function getLeadsForExport(filters = {}, ids = null) {
  const first = await getLeads({ ...filters, page: 1, perPage: 1 })
  if (first.isEmpty) return []

  const all = await getLeads({ ...filters, page: 1, perPage: Math.max(first.total, 1) })
  if (!ids || ids.length === 0) return all.leads
  const wanted = new Set(ids)
  return all.leads.filter((lead) => wanted.has(lead.id))
}

export async function getLead(leadId) {
  if (!usingFixtures()) return null

  const data = getDataset()
  const lead = data.leads.find((entry) => entry.id === leadId)
  if (!lead) return null

  const calls = data.calls.filter((call) => call.leadId === leadId)
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

export async function getCallsForExport(filters = {}, ids = null) {
  const first = await getCalls({ ...filters, page: 1, perPage: 1 })
  if (first.isEmpty) return []

  const all = await getCalls({ ...filters, page: 1, perPage: Math.max(first.total, 1) })
  if (!ids || ids.length === 0) return all.calls

  const wanted = new Set(ids)
  return all.calls.filter((call) => wanted.has(call.id))
}

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
    transcript: call.disposition === 'connected'
      ? [
          { at: '0:00', speaker: 'Agent', text: 'Placeholder transcript line. Real transcripts arrive from the phone system.' },
          { at: '0:14', speaker: 'Caller', text: 'Placeholder transcript line.' },
          { at: '0:41', speaker: 'Agent', text: 'Placeholder transcript line.' },
        ]
      : [],
  }
}

export const ATTRIBUTION_DIMENSIONS = [
  { value: 'source', slug: 'source', label: 'Source', column: 'Source / medium' },
  { value: 'campaign', slug: 'campaign', label: 'Campaign', column: 'Campaign' },
  { value: 'landingPage', slug: 'landing-page', label: 'Landing page', column: 'Landing page' },
  { value: 'device', slug: 'device', label: 'Device', column: 'Device' },
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

export const LOW_VOLUME_LEADS = 25

export function findDimension(slug) {
  return ATTRIBUTION_DIMENSIONS.find((d) => d.slug === slug) || null
}

function slugify(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'group'
  )
}

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
    leadShare: totalLeads ? `${((group.leads / totalLeads) * 100).toFixed(1)}%` : '0.0%',
    callsPerLead: group.leads ? (group.calls / group.leads).toFixed(2) : '0.00',
    conversionRate: group.leads ? `${((group.conversions / group.leads) * 100).toFixed(1)}%` : '0.0%',
    lowVolume: group.leads < LOW_VOLUME_LEADS,
  }))

  const sorters = {
    leads: (a, b) => b.leads - a.leads,
    conversions: (a, b) => b.conversions - a.conversions,
    calls: (a, b) => b.calls - a.calls,
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
    unattributedCalls: periodCalls.filter((call) => !call.leadId).length,
    totalCalls: periodCalls.length,
    devices: [...new Set(data.leads.map((lead) => lead.device))].sort(),
    audiences: [...new Set(data.leads.map((lead) => lead.onBehalfOf))].sort(),
    isEmpty: totalLeads === 0,
  }
}

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

function formatTalkTime(seconds) {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

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

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'lost', label: 'Lost' },
]

/*=======================================================
        CAMPAIGN SPEND
========================================================*/

/*
 Attribution answers which channel produced the leads. This answers what they
 cost. Same funnel, the only difference is that this one has a denominator.
*/

/*
 What a lead is allowed to cost. Deliberately unset.

 A target is a claim about what is acceptable, and nobody here yet knows what
 a Medicare lead costs on Facebook against organic search, so any number put
 here would make every row on the page pass or fail against a guess.

 It is not a benchmark to look up, it is derived from this business:

   lead value  =  commission per enrollment  x  share of leads that enrol
   target      =  lead value  x  the margin worth keeping

 Commission is known. The conversion rate is the missing half, and it is
 exactly what this site is being built to measure, so the number arrives on
 its own once there is real data behind the enrollment column.

 Set it to a number and the target column appears everywhere at once.
*/
export const TARGET_COST_PER_LEAD = null

/*
 A channel is a grouping over source and medium, not a column. Google appears
 twice in the data, once paid and once organic, and reporting them as a single
 row called google would hide the only comparison on the page that matters.

 match is checked field by field, so an entry naming only medium matches on
 medium alone.
*/
export const CAMPAIGN_CHANNELS = [
  { slug: 'all', label: 'All channels', match: null, isPaid: true },
  { slug: 'google-ads', label: 'Google Ads', match: { source: 'google', medium: 'cpc' }, isPaid: true },
  { slug: 'facebook', label: 'Facebook', match: { source: 'facebook', medium: 'paid_social' }, isPaid: true },
  { slug: 'bing-ads', label: 'Bing Ads', match: { source: 'bing', medium: 'cpc' }, isPaid: true },
  { slug: 'seo', label: 'SEO', match: { source: 'google', medium: 'organic' }, isPaid: true },
  { slug: 'direct', label: 'Direct', match: { source: '(direct)' }, isPaid: false },
  { slug: 'referral', label: 'Referral', match: { medium: 'referral' }, isPaid: false },
]

export const DEFAULT_CHANNEL = CAMPAIGN_CHANNELS[0]

export const CAMPAIGN_SORTS = [
  { value: 'spend', label: 'Most spend' },
  { value: 'leads', label: 'Most leads' },
  { value: 'cpa', label: 'Best cost per enrollment' },
  { value: 'cpl', label: 'Best cost per lead' },
]

// Spend rows carry the source label, the channel test needs the parts
const SOURCE_BY_LABEL = new Map(SOURCES.map((source) => [source.label, source]))

export function findChannel(slug) {
  return CAMPAIGN_CHANNELS.find((channel) => channel.slug === slug) || null
}

function matchesChannel(channel, sourceRaw) {
  if (!channel?.match) return true
  return Object.entries(channel.match).every(([field, value]) => sourceRaw?.[field] === value)
}

// Whole dollars. Cents on an ad spend total are noise nobody acts on.
function money(amount) {
  return `$${Math.round(amount).toLocaleString('en-US')}`
}

/*
 A dash rather than $0.00 when nothing was spent. Direct and referral produce
 leads at no media cost, and printing a zero there reads as free leads worth
 chasing rather than as a channel with no dial on it.
*/
function costPer(spend, count) {
  if (spend <= 0) return { value: null, label: 'n/a' }
  if (count <= 0) return { value: null, label: 'no result' }

  const value = spend / count
  return { value, label: `$${value.toFixed(value < 100 ? 2 : 0)}` }
}

/* how a cost per lead reads against the target, and which way it leans */
function againstTarget(costPerLead) {
  // No target set, so there is nothing to be under or over
  if (TARGET_COST_PER_LEAD === null) return null
  if (costPerLead === null) return { label: 'n/a', tone: 'neutral' }

  const difference = costPerLead - TARGET_COST_PER_LEAD
  const percent = Math.round((difference / TARGET_COST_PER_LEAD) * 100)

  if (Math.abs(percent) < 1) return { label: 'on target', tone: 'neutral' }
  if (difference < 0) return { label: `${Math.abs(percent)}% under`, tone: 'good' }

  return { label: `${percent}% over`, tone: 'bad' }
}

/* one aggregated row, whether it groups a channel or a campaign inside one */
function buildSpendRow(value, spend, leads, calls, conversions) {
  const perLead = costPer(spend, leads)
  const perEnrollment = costPer(spend, conversions)

  return {
    value,
    spend,
    spendLabel: spend > 0 ? money(spend) : 'n/a',
    leads,
    calls,
    conversions,
    costPerLead: perLead.value,
    costPerLeadLabel: perLead.label,
    costPerEnrollment: perEnrollment.value,
    costPerEnrollmentLabel: perEnrollment.label,
    target: againstTarget(perLead.value),
    conversionRate: leads ? `${((conversions / leads) * 100).toFixed(1)}%` : '0.0%',
    lowVolume: leads < LOW_VOLUME_LEADS,
  }
}

/*
 Spend against the funnel, grouped by channel on the all view and by campaign
 inside a single channel.

 Campaign level spend is apportioned from the channel total by spendWeight
 rather than by lead count. Splitting it by leads would give every campaign an
 identical cost per lead, which is a table that cannot be wrong and cannot be
 useful either.
*/
export async function getCampaignSpend({ channel: slug = 'all', days = 30, sort = 'spend' } = {}) {
  const channel = findChannel(slug) || DEFAULT_CHANNEL

  const empty = {
    channel,
    days,
    rows: [],
    summary: {
      spend: 0,
      spendLabel: 'n/a',
      leads: 0,
      conversions: 0,
      costPerLeadLabel: 'n/a',
      costPerEnrollmentLabel: 'n/a',
      target: { label: 'n/a', tone: 'neutral' },
    },
    isEmpty: true,
  }

  if (!usingFixtures()) return empty

  const data = getDataset()
  const from = startOfDaysAgo(days)

  const leads = data.leads.filter(
    (lead) => lead.createdAt >= from && matchesChannel(channel, lead.sourceRaw)
  )

  const spendRows = data.spend.filter(
    (row) => row.date >= from && matchesChannel(channel, SOURCE_BY_LABEL.get(row.source))
  )

  const groups = new Map()

  /*
   The all view groups by channel, so every lead has to be placed into one.
   Anything matching no channel falls into (other) rather than being dropped,
   since a silently missing row is how a reporting page starts lying.
  */
  const groupKey = (lead) =>
    channel.slug === 'all'
      ? CAMPAIGN_CHANNELS.find(
          (one) => one.slug !== 'all' && matchesChannel(one, lead.sourceRaw)
        )?.label || '(other)'
      : lead.campaign || '(not set)'

  for (const lead of leads) {
    const key = groupKey(lead)
    if (!groups.has(key)) groups.set(key, { leads: 0, calls: 0, conversions: 0, spend: 0 })

    const group = groups.get(key)
    group.leads += 1
    group.calls += lead.callCount
    if (lead.status === 'enrolled') group.conversions += 1
  }

  const totalSpend = spendRows.reduce((sum, row) => sum + row.amount, 0)

  if (channel.slug === 'all') {
    // Spend already belongs to a source, so it lands on that source's channel
    for (const row of spendRows) {
      const source = SOURCE_BY_LABEL.get(row.source)
      const key =
        CAMPAIGN_CHANNELS.find((one) => one.slug !== 'all' && matchesChannel(one, source))?.label ||
        '(other)'

      if (!groups.has(key)) groups.set(key, { leads: 0, calls: 0, conversions: 0, spend: 0 })
      groups.get(key).spend += row.amount
    }
  } else {
    const weights = new Map(CAMPAIGNS.map((one) => [one.name, one.spendWeight]))
    const totalWeight = [...groups.keys()].reduce((sum, key) => sum + (weights.get(key) || 0), 0)

    for (const [key, group] of groups) {
      group.spend = totalWeight > 0 ? (totalSpend * (weights.get(key) || 0)) / totalWeight : 0
    }
  }

  const rows = assignGroupIds(
    [...groups.entries()].map(([value, group]) =>
      buildSpendRow(value, group.spend, group.leads, group.calls, group.conversions)
    )
  )

  /*
   Cost sorts put the rows with no cost last rather than first. A null cost
   per lead is not the cheapest row on the page, it is a row the question does
   not apply to.
  */
  const byCost = (key) => (a, b) => {
    if (a[key] === null && b[key] === null) return b.leads - a.leads
    if (a[key] === null) return 1
    if (b[key] === null) return -1
    return a[key] - b[key]
  }

  const sorters = {
    spend: (a, b) => b.spend - a.spend,
    leads: (a, b) => b.leads - a.leads,
    cpa: byCost('costPerEnrollment'),
    cpl: byCost('costPerLead'),
  }

  rows.sort(sorters[sort] || sorters.spend)

  const totalLeads = leads.length
  const totalConversions = leads.filter((lead) => lead.status === 'enrolled').length
  const summaryPerLead = costPer(totalSpend, totalLeads)

  return {
    channel,
    days,
    rows,
    summary: {
      spend: totalSpend,
      spendLabel: totalSpend > 0 ? money(totalSpend) : 'n/a',
      leads: totalLeads,
      conversions: totalConversions,
      costPerLeadLabel: summaryPerLead.label,
      costPerEnrollmentLabel: costPer(totalSpend, totalConversions).label,
      target: againstTarget(summaryPerLead.value),
    },
    isEmpty: totalLeads === 0 && totalSpend === 0,
  }
}
