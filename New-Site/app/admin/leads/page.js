/**
 * Lead list, /admin/leads.
 * Each row links to the full journey for that person, which is the page that
 * makes the attribution work visible.
 */

import Link from 'next/link'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import { DataTable, DataSourceNotice, StatusPill } from '@/components/admin/AdminUi'
import { getLeads, usingFixtures, LEAD_STATUSES } from '@/lib/admin/data'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'source', label: 'Source' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'onBehalfOf', label: 'For' },
  { key: 'status', label: 'Status', render: (row) => <StatusPill status={row.status} /> },
  { key: 'createdAtLabel', label: 'Received' },
  { key: 'callCount', label: 'Calls', align: 'right' },
]

export default async function AdminLeadsPage({ searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const result = await getLeads({
    page: Number.parseInt(params?.page, 10) || 1,
    source: params?.source,
    status: params?.status,
    query: params?.q,
  })

  const hrefFor = (page) => {
    const next = new URLSearchParams()
    if (params?.source) next.set('source', params.source)
    if (params?.status) next.set('status', params.status)
    if (params?.q) next.set('q', params.q)
    if (page > 1) next.set('page', String(page))
    const query = next.toString()
    return query ? `/admin/leads?${query}` : '/admin/leads'
  }

  return (
    <AdminShell user={session.user} currentPath="/admin/leads" title="Leads" description={`${result.total} leads`}>
      {/* TODO export. It must be an audited server action rather than a client
          side csv build, because a lead export is a bulk extract of personal
          information and needs a record of who took it and when. */}
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="a leads table, written by /api/lead, carrying the visitorId and sessionId that produced each lead"
      />

      {!result.isEmpty && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/admin/leads"
            className={`px-3 py-1.5 rounded-md text-sm font-semibold ${!params?.status ? 'bg-ihealthBlue text-white' : 'bg-white border text-[#505258]'}`}
          >
            All
          </Link>
          {LEAD_STATUSES.map((status) => (
            <Link
              key={status.value}
              href={`/admin/leads?status=${status.value}`}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold ${params?.status === status.value ? 'bg-ihealthBlue text-white' : 'bg-white border text-[#505258]'}`}
            >
              {status.label}
            </Link>
          ))}
        </div>
      )}

      <DataTable columns={COLUMNS} rows={result.leads} getRowHref={(row) => `/admin/leads/${row.id}`} emptyMessage="No leads yet." />

      {result.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3">
          {result.page > 1 && (
            <Link href={hrefFor(result.page - 1)} className="px-4 py-2 bg-white border rounded-md text-sm font-semibold hover:bg-[#f7f7f7]">
              Previous
            </Link>
          )}
          <span className="text-sm text-[#505258]">
            Page {result.page} of {result.totalPages}
          </span>
          {result.page < result.totalPages && (
            <Link href={hrefFor(result.page + 1)} className="px-4 py-2 bg-white border rounded-md text-sm font-semibold hover:bg-[#f7f7f7]">
              Next
            </Link>
          )}
        </div>
      )}
    </AdminShell>
  )
}
