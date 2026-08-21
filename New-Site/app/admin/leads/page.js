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
import { DataTable, DataSourceNotice, StatTile, StatusPill } from '@/components/admin/AdminUi'
import { getLeads, usingFixtures, parsePeriod, PERIODS, LEAD_STATUSES } from '@/lib/admin/data'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'zip', label: 'Zip' },
  { key: 'source', label: 'Source' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'onBehalfOf', label: 'For' },
  { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
  { key: 'createdAtLabel', label: 'Received' },
  {
    key: 'callCount',
    label: 'Calls',
    align: 'right',
    // A lead with no call is either waiting on a callback or has been missed,
    // so it is worth marking rather than printing a quiet zero
    render: (row) => (row.callCount === 0 ? <span className="text-[#6C7381]">none</span> : row.callCount),
  },
]

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name' },
]

/**
 * Builds a url that keeps the current filters and changes only what is passed.
 * Without this, choosing a status would silently drop the search and the
 * period, which is the usual way filter bars end up untrustworthy.
 */
function buildHref(params, overrides) {
  const next = new URLSearchParams()
  const merged = { ...params, ...overrides }

  for (const key of ['period', 'source', 'status', 'q', 'sort', 'page']) {
    const value = merged[key]
    if (value && !(key === 'page' && String(value) === '1')) next.set(key, String(value))
  }

  const query = next.toString()
  return query ? `/admin/leads?${query}` : '/admin/leads'
}

/**
 * One row of filter chips.
 */
function ChipRow({ label, options, activeValue, params, paramKey }) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <span className="text-sm font-semibold uppercase tracking-[1.2px] text-[#6C7381] w-16 flex-shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = (activeValue || null) === option.value
          // Changing any filter resets to page 1, otherwise a narrower result
          // set lands the reader on a page that no longer exists
          const href = buildHref(params, { [paramKey]: option.value, page: 1 })

          return (
            <Link
              key={option.label}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                isActive ? 'bg-ihealthBlue text-white' : 'bg-white border text-[#505258] hover:border-ihealthBlue'
              }`}
            >
              {option.label}
              {option.count !== undefined && (
                <span className={isActive ? 'text-white/70' : 'text-[#878F99]'}> {option.count}</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default async function AdminLeadsPage({ searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const days = parsePeriod(params?.period)
  const filters = {
    period: params?.period,
    source: params?.source,
    status: params?.status,
    q: params?.q,
    sort: params?.sort,
  }

  const result = await getLeads({
    page: Number.parseInt(params?.page, 10) || 1,
    days,
    source: params?.source,
    status: params?.status,
    query: params?.q,
    sort: params?.sort,
  })

  const exportHref = `/admin/leads/export?${new URLSearchParams(
    Object.entries(filters).filter(([, value]) => Boolean(value))
  ).toString()}`

  const hasFilters = Boolean(params?.source || params?.status || params?.q)

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
            <StatTile label="Leads" value={result.summary.total.toLocaleString()} />
            <StatTile label="Enrolled" value={result.summary.enrolled.toLocaleString()} rate={result.summary.conversionRate} />
            <StatTile label="For a family member" value={result.summary.onBehalfOfOther.toLocaleString()} />
            <StatTile label="No call yet" value={result.summary.withoutCall.toLocaleString()} />
          </div>

          <div className="bg-white border rounded-lg p-5 mb-6 flex flex-col gap-4">
            {/* GET form, so searching needs no JavaScript and the result is a
                real url. The hidden fields carry the other filters through. */}
            <form action="/admin/leads" method="get" className="flex flex-wrap gap-3">
              {['period', 'source', 'status', 'sort'].map((key) =>
                filters[key] ? <input key={key} type="hidden" name={key} value={filters[key]} /> : null
              )}
              <label htmlFor="q" className="sr-only">
                Search by name, phone, or zip
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={params?.q || ''}
                placeholder="Search name, phone, or zip"
                className="flex-1 min-w-[220px] h-11 px-4 border rounded-md text-base focus:outline-none focus:border-ihealthBlue"
              />
              <button
                type="submit"
                className="h-11 px-5 rounded-md bg-ihealthBlue text-white font-semibold hover:brightness-110 transition-[filter]"
              >
                Search
              </button>
              {hasFilters && (
                <Link
                  href="/admin/leads"
                  className="h-11 px-5 rounded-md border bg-white text-[#505258] font-semibold inline-flex items-center hover:border-ihealthBlue"
                >
                  Clear filters
                </Link>
              )}
            </form>

            <ChipRow
              label="Period"
              paramKey="period"
              params={filters}
              activeValue={String(days)}
              options={PERIODS.map((period) => ({ value: period.value, label: period.label }))}
            />

            <ChipRow
              label="Status"
              paramKey="status"
              params={filters}
              activeValue={params?.status}
              options={[
                { value: undefined, label: 'All' },
                ...LEAD_STATUSES.map((status) => ({
                  value: status.value,
                  label: status.label,
                  count: result.statusCounts[status.value] || 0,
                })),
              ]}
            />

            <ChipRow
              label="Source"
              paramKey="source"
              params={filters}
              activeValue={params?.source}
              options={[
                { value: undefined, label: 'All' },
                ...result.sources.map((source) => ({ value: source, label: source })),
              ]}
            />

            <ChipRow
              label="Sort"
              paramKey="sort"
              params={filters}
              activeValue={params?.sort || 'newest'}
              options={SORTS}
            />
          </div>

          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-base text-[#505258]">
              Showing {result.leads.length} of {result.total.toLocaleString()}
            </p>
            {/* Every export is audited. See app/admin/leads/export/route.js */}
            <a
              href={exportHref}
              className="h-11 px-5 rounded-md border bg-white text-ihealthBlue font-semibold inline-flex items-center hover:border-ihealthBlue"
            >
              Export CSV
            </a>
          </div>
        </>
      )}

      <DataTable
        columns={COLUMNS}
        rows={result.leads}
        getRowHref={(row) => `/admin/leads/${row.id}`}
        emptyMessage={hasFilters ? 'No leads match these filters.' : 'No leads yet.'}
      />

      {result.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3">
          {result.page > 1 && (
            <Link
              href={buildHref(filters, { page: result.page - 1 })}
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
              href={buildHref(filters, { page: result.page + 1 })}
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
