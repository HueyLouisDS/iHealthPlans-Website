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

import { getDataset, AGENTS, formatDuration, formatDateTime } from '@/lib/admin/fixtures'

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
