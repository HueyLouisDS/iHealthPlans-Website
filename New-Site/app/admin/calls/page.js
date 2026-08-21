/**
 * Call log, /admin/calls.
 *
 * The matched column is the one that matters. It says whether a call was tied
 * back to a web session, and the unmatched share is the best single health
 * metric for the whole attribution system. A rising unmatched rate means the
 * click to call binding is breaking, and nothing else on the site would show
 * that, which is why it gets its own tile and its own filter.
 */

import Link from 'next/link'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import FilterPanel from '@/components/admin/FilterPanel'
import SelectableTable from '@/components/admin/SelectableTable'
import { buildHref } from '@/lib/admin/urls'
import { DataSourceNotice, StatTile } from '@/components/admin/AdminUi'
import {
  getCalls,
  usingFixtures,
  parsePeriod,
  parsePerPage,
  PERIODS,
  PER_PAGE_OPTIONS,
  PER_PAGE_MIN,
  PER_PAGE_MAX,
} from '@/lib/admin/data'

const BASE = '/admin/calls'
const PARAM_KEYS = ['period', 'matched', 'disposition', 'agent', 'recording', 'sort', 'perPage', 'page']

const DISPOSITIONS = ['connected', 'voicemail', 'no answer', 'abandoned']

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'longest', label: 'Longest call' },
  { value: 'shortest', label: 'Shortest call' },
]

const COLUMNS = [
  { key: 'startedAtLabel', label: 'Started', nowrap: true },
  { key: 'fromNumber', label: 'From', nowrap: true },
  { key: 'leadName', label: 'Lead', format: 'emptyNone', emptyLabel: 'no lead' },
  { key: 'agent', label: 'Agent' },
  { key: 'disposition', label: 'Outcome' },
  { key: 'matched', label: 'Session', format: 'matchPill' },
  { key: 'hasRecording', label: 'Recording', format: 'boolLabel', trueLabel: 'Available' },
  { key: 'durationLabel', label: 'Duration', align: 'right' },
]

export default async function AdminCallsPage({ searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const days = parsePeriod(params?.period)
  const perPage = parsePerPage(params?.perPage)

  const filters = {
    period: params?.period,
    matched: params?.matched,
    disposition: params?.disposition,
    agent: params?.agent,
    recording: params?.recording,
    sort: params?.sort,
    perPage: params?.perPage,
  }

  const result = await getCalls({
    page: Number.parseInt(params?.page, 10) || 1,
    perPage,
    days,
    matched: params?.matched,
    disposition: params?.disposition,
    agentId: params?.agent,
    hasRecording: params?.recording,
    sort: params?.sort,
  })

  const agentName = result.agents.find((agent) => agent.id === params?.agent)?.name

  const applied = [
    params?.matched && { key: 'matched', label: params.matched === 'yes' ? 'Matched' : 'Unmatched' },
    params?.disposition && { key: 'disposition', label: `Outcome: ${params.disposition}` },
    params?.agent && { key: 'agent', label: `Agent: ${agentName || params.agent}` },
    params?.recording && { key: 'recording', label: params.recording === 'yes' ? 'Has recording' : 'No recording' },
  ].filter(Boolean)

  const tabs = [
    {
      key: 'period',
      label: 'Period',
      paramKey: 'period',
      activeValue: String(days),
      options: PERIODS.map((period) => ({ value: period.value, label: period.label })),
    },
    {
      key: 'matched',
      label: 'Session',
      paramKey: 'matched',
      activeValue: params?.matched,
      isApplied: Boolean(params?.matched),
      options: [
        { value: undefined, label: 'All' },
        { value: 'yes', label: 'Matched', count: result.summary.matched },
        { value: 'no', label: 'Unmatched', count: result.summary.unmatched },
      ],
    },
    {
      key: 'disposition',
      label: 'Outcome',
      paramKey: 'disposition',
      activeValue: params?.disposition,
      isApplied: Boolean(params?.disposition),
      options: [
        { value: undefined, label: 'All' },
        ...DISPOSITIONS.map((value) => ({
          value,
          label: value,
          count: result.dispositionCounts[value] || 0,
        })),
      ],
    },
    {
      key: 'agent',
      label: 'Agent',
      paramKey: 'agent',
      activeValue: params?.agent,
      isApplied: Boolean(params?.agent),
      options: [{ value: undefined, label: 'All' }, ...result.agents.map((a) => ({ value: a.id, label: a.name }))],
    },
    {
      key: 'recording',
      label: 'Recording',
      paramKey: 'recording',
      activeValue: params?.recording,
      isApplied: Boolean(params?.recording),
      options: [
        { value: undefined, label: 'All' },
        { value: 'yes', label: 'Has a recording' },
        { value: 'no', label: 'No recording' },
      ],
    },
    {
      key: 'sort',
      label: 'Sort',
      paramKey: 'sort',
      activeValue: params?.sort || 'newest',
      options: SORTS,
    },
  ]

  // perPage is excluded on purpose, an export is never paginated
  const exportHref = `${BASE}/export?${new URLSearchParams(
    Object.entries(filters).filter(([key, value]) => Boolean(value) && key !== 'perPage')
  ).toString()}`

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/calls"
      title="Calls"
      description={`${result.total.toLocaleString()} matching, last ${days} days`}
    >
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="a phone system webhook posting to /api/call/webhook with the callId minted at click time, plus the recording url and duration"
      />

      {!result.isEmpty && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatTile label="Calls" value={result.summary.total.toLocaleString()} />
            <StatTile label="Connected" value={result.summary.connected.toLocaleString()} rate={result.summary.connectedRate} />
            <StatTile label="Matched to a session" value={result.summary.matchedRate} />
            {/* Unmatched gets a count rather than a rate, because it is the
                number somebody has to go and fix */}
            <StatTile label="Unmatched" value={result.summary.unmatched.toLocaleString()} />
          </div>

          <FilterPanel
            basePath={BASE}
            paramKeys={PARAM_KEYS}
            params={filters}
            tabs={tabs}
            applied={applied}
            perPage={perPage}
            perPageOptions={PER_PAGE_OPTIONS}
            perPageMin={PER_PAGE_MIN}
            perPageMax={PER_PAGE_MAX}
            exportHref={exportHref}
            summaryLabel={`Last ${days} days, average talk time ${result.summary.averageTalk}`}
          />

          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-base text-[#505258]">
              Showing {result.calls.length} of {result.total.toLocaleString()}
            </p>
            {/* Every export is audited. See app/admin/calls/export/route.js */}
            <a
              href={exportHref}
              className="h-11 px-5 rounded-md bg-ihealthGreen text-white font-semibold inline-flex items-center hover:brightness-95 transition-[filter] focus:outline-none focus:ring-4 focus:ring-ihealthGreen/40"
            >
              Export
            </a>
          </div>
        </>
      )}

      <SelectableTable
        rows={result.calls}
        columns={COLUMNS}
        rowHrefBase="/admin/calls/"
        rowLabelKey="fromNumber"
        exportBase={exportHref}
        selectionNoun="calls"
        emptyMessage={
          applied.length > 0
            ? 'No calls match these filters.'
            : 'No calls yet. The phone system has not been identified, so nothing is posting call records.'
        }
      />

      {result.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3">
          {result.page > 1 && (
            <Link
              href={buildHref(BASE, PARAM_KEYS, filters, { page: result.page - 1 })}
              className="px-4 py-2 bg-white border rounded-md text-sm font-semibold hover:bg-[#f7f7f7]"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-[#505258]">
            Page {result.page} of {result.totalPages}
          </span>
          {result.page < result.totalPages && (
            <Link
              href={buildHref(BASE, PARAM_KEYS, filters, { page: result.page + 1 })}
              className="px-4 py-2 bg-white border rounded-md text-sm font-semibold hover:bg-[#f7f7f7]"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </AdminShell>
  )
}
