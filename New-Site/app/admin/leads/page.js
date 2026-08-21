/**
 * Lead list, /admin/leads.
 *
 * Every filter lives in the url, so a view can be bookmarked, sent to a
 * colleague, and exported exactly as it appears. That is also what lets the
 * export route reuse the same parameters and guarantee the file matches the
 * screen.
 *
 * Each row links to the full journey for that person, which is the page that
 * makes the attribution work visible.
 */

import Link from 'next/link'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import FilterPanel from '@/components/admin/FilterPanel'
import SelectableTable from '@/components/admin/SelectableTable'
import { buildHref } from '@/lib/admin/urls'
import SnapFocus from '@/components/admin/SnapFocus'
import { DataSourceNotice, StatTile } from '@/components/admin/AdminUi'
import {
  getLeads,
  usingFixtures,
  parsePeriod,
  parsePerPage,
  PERIODS,
  PER_PAGE_OPTIONS,
  PER_PAGE_MIN,
  PER_PAGE_MAX,
  LEAD_STATUSES,
} from '@/lib/admin/data'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name' },
]

const BASE = '/admin/leads'
const PARAM_KEYS = ['period', 'source', 'status', 'audience', 'hasCall', 'q', 'sort', 'perPage', 'page']

/*
 * Where the page snaps to when a tile is clicked. The filter panel and the
 * table below it are what the tile changed, so landing here shows the result.
 */
const FOCUS_ID = 'lead-filters'

/*
 * Each tile is a filter. `params` is what it sets, and clicking a tile that is
 * already on clears it, so the way out is the same control as the way in.
 */
const TILE_FILTERS = {
  all: {},
  enrolled: { status: 'enrolled' },
  family: { audience: 'other' },
  noCall: { hasCall: 'no' },
}

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone', nowrap: true },
  { key: 'zip', label: 'Zip' },
  { key: 'source', label: 'Source' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'onBehalfOf', label: 'For' },
  { key: 'status', label: 'Status', format: 'statusPill' },
  { key: 'createdAtLabel', label: 'Received', nowrap: true },
  /*
   * A lead with no call is either waiting on a callback or has been missed,
   * so it is worth marking rather than printing a quiet zero
   */
  { key: 'callCount', label: 'Calls', align: 'right', format: 'zeroNone' },
]

export default async function AdminLeadsPage({ searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const days = parsePeriod(params?.period)
  const perPage = parsePerPage(params?.perPage)
  const filters = {
    period: params?.period,
    source: params?.source,
    status: params?.status,
    audience: params?.audience,
    hasCall: params?.hasCall,
    q: params?.q,
    sort: params?.sort,
    perPage: params?.perPage,
  }

  const result = await getLeads({
    page: Number.parseInt(params?.page, 10) || 1,
    perPage,
    days,
    source: params?.source,
    status: params?.status,
    audience: params?.audience,
    hasCall: params?.hasCall,
    query: params?.q,
    sort: params?.sort,
  })

  // perPage is excluded on purpose, an export is never paginated
  const exportHref = `/admin/leads/export?${new URLSearchParams(
    Object.entries(filters).filter(([key, value]) => Boolean(value) && key !== 'perPage')
  ).toString()}`

  const hasFilters = Boolean(
    params?.source || params?.status || params?.audience || params?.hasCall || params?.q
  )

  const applied = [
    params?.status && { key: 'status', label: `Status: ${params.status}` },
    params?.source && { key: 'source', label: `Source: ${params.source}` },
    params?.audience && {
      key: 'audience',
      label: params.audience === 'other' ? 'For a family member' : 'For themselves',
    },
    params?.hasCall && { key: 'hasCall', label: params.hasCall === 'no' ? 'No call yet' : 'Has called' },
    params?.q && { key: 'q', label: `Search: ${params.q}` },
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
      key: 'status',
      label: 'Status',
      paramKey: 'status',
      activeValue: params?.status,
      isApplied: Boolean(params?.status),
      options: [
        { value: undefined, label: 'All' },
        ...LEAD_STATUSES.map((status) => ({
          value: status.value,
          label: status.label,
          count: result.statusCounts[status.value] || 0,
        })),
      ],
    },
    {
      key: 'source',
      label: 'Source',
      paramKey: 'source',
      activeValue: params?.source,
      isApplied: Boolean(params?.source),
      options: [{ value: undefined, label: 'All' }, ...result.sources.map((s) => ({ value: s, label: s }))],
    },
    {
      key: 'audience',
      label: 'Enquiring for',
      paramKey: 'audience',
      activeValue: params?.audience,
      isApplied: Boolean(params?.audience),
      options: [
        { value: undefined, label: 'All' },
        { value: 'self', label: 'Themselves' },
        { value: 'other', label: 'A family member', count: result.summary.onBehalfOfOther },
      ],
    },
    {
      key: 'hasCall',
      label: 'Called',
      paramKey: 'hasCall',
      activeValue: params?.hasCall,
      isApplied: Boolean(params?.hasCall),
      options: [
        { value: undefined, label: 'All' },
        { value: 'yes', label: 'Has called' },
        { value: 'no', label: 'No call yet', count: result.summary.withoutCall },
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

  /**
   * The url a tile points at.
   *
   * Every tile clears the other tiles' filters as well as setting its own, so
   * the 4 behave as one control with 4 positions rather than as 3 checkboxes
   * and a reset. Search, source, period, and sort are all kept, since those
   * say which population is being looked at rather than which slice of it.
   */
  const tileHref = (name) => {
    const isOn = Object.entries(TILE_FILTERS[name]).every(([key, value]) => filters[key] === value)
    const isClearing = isOn || name === 'all'
    const next = isClearing ? {} : TILE_FILTERS[name]

    const href = buildHref(BASE, PARAM_KEYS, filters, {
      status: undefined,
      audience: undefined,
      hasCall: undefined,
      page: 1,
      ...next,
    })

    /*
     * The fragment snaps the page to the results. Not when clearing, since
     * scrolling somebody down the page as they undo a filter is the opposite
     * of what they asked for.
     */
    return isClearing ? href : `${href}#${FOCUS_ID}`
  }

  /*
   * "All" is selected when none of the others are, which is what makes it read
   * as the neutral position rather than as a 4th filter
   */
  const activeTile =
    (params?.status === 'enrolled' && !params?.audience && !params?.hasCall && 'enrolled') ||
    (params?.audience === 'other' && !params?.status && !params?.hasCall && 'family') ||
    (params?.hasCall === 'no' && !params?.status && !params?.audience && 'noCall') ||
    (!params?.status && !params?.audience && !params?.hasCall && 'all') ||
    null

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/leads"
      title="Leads"
      description={`${result.total.toLocaleString()} matching, last ${days} days`}
    >
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="a leads table, written by /api/lead, carrying the visitorId and sessionId that produced each lead"
      />

      {!result.isEmpty && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatTile
              label="Leads"
              value={result.summary.total.toLocaleString()}
              href={tileHref('all')}
              isSelected={activeTile === 'all'}
            />
            <StatTile
              label="Enrolled"
              value={result.summary.enrolled.toLocaleString()}
              rate={result.summary.conversionRate}
              href={tileHref('enrolled')}
              isSelected={activeTile === 'enrolled'}
              selectedLabel={activeTile === 'enrolled' ? '(selected, click to clear)' : undefined}
            />
            <StatTile
              label="For a family member"
              value={result.summary.onBehalfOfOther.toLocaleString()}
              href={tileHref('family')}
              isSelected={activeTile === 'family'}
              selectedLabel={activeTile === 'family' ? '(selected, click to clear)' : undefined}
            />
            <StatTile
              label="No call yet"
              value={result.summary.withoutCall.toLocaleString()}
              href={tileHref('noCall')}
              isSelected={activeTile === 'noCall'}
              selectedLabel={activeTile === 'noCall' ? '(selected, click to clear)' : undefined}
            />
          </div>

          {/* Everything a tile changes lives inside here, so the snap puts
              the whole result on screen in one movement */}
          <SnapFocus targetId={FOCUS_ID} value={`${params?.status || ''}|${params?.audience || ''}|${params?.hasCall || ''}`} />

          <section
            id={FOCUS_ID}
            /*
             * Focusable so the snap moves the keyboard caret here too, not
             * only the scroll position
             */
            tabIndex={-1}
            aria-label="Filtered leads"
            className="scroll-mt-6 focus:outline-none"
          >
          <FilterPanel
            basePath={BASE}
            paramKeys={PARAM_KEYS}
            params={filters}
            tabs={tabs}
            applied={applied}
            search={{ name: 'q', placeholder: 'Search name, phone, or zip' }}
            perPage={perPage}
            perPageOptions={PER_PAGE_OPTIONS}
            perPageMin={PER_PAGE_MIN}
            perPageMax={PER_PAGE_MAX}
            exportHref={exportHref}
            summaryLabel={`Last ${days} days`}
          />

          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-base text-[#505258]">
              Showing {result.leads.length} of {result.total.toLocaleString()}
            </p>
            {/* Every export is audited. See app/admin/leads/export/route.js */}
            <a
              href={exportHref}
              className="h-11 px-5 rounded-md bg-ihealthGreen text-white font-semibold inline-flex items-center hover:brightness-95 transition-[filter] focus:outline-none focus:ring-4 focus:ring-ihealthGreen/40"
            >
              Export
            </a>
          </div>
          </section>
        </>
      )}

      <SelectableTable
        rows={result.leads}
        columns={COLUMNS}
        rowHrefBase="/admin/leads/"
        rowLabelKey="name"
        exportBase={exportHref}
        selectionNoun="leads"
        emptyMessage={hasFilters ? 'No leads match these filters.' : 'No leads yet.'}
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
