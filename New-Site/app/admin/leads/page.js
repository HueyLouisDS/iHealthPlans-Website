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
import LeadFilters from '@/components/admin/LeadFilters'
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
 * Builds a pagination url that preserves the active filters.
 * A trimmed copy of the one in LeadFilters. Paging is the only link this page
 * still builds itself, everything else moved into the filter panel.
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

          <LeadFilters
            params={filters}
            days={days}
            periods={PERIODS}
            statuses={LEAD_STATUSES}
            statusCounts={result.statusCounts}
            sources={result.sources}
            sorts={SORTS}
          />

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
