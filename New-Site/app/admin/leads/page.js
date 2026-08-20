/**
 * Lead list, /admin/leads.
 * Filterable and exportable. Each row links to the full journey for that
 * person, which is the page that makes the attribution work visible.
 */

import { auth } from '@/auth'
import AdminShell from '@/components/admin/AdminShell'
import { DataTable, NoDataYetNotice } from '@/components/admin/AdminUi'
import { getLeads } from '@/lib/admin/data'

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'source', label: 'Source' },
  { key: 'campaign', label: 'Campaign' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Received' },
  { key: 'calls', label: 'Calls', align: 'right' },
]

export default async function AdminLeadsPage({ searchParams }) {
  const session = await auth()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const result = await getLeads({
    page: Number.parseInt(params?.page, 10) || 1,
    from: params?.from,
    to: params?.to,
    source: params?.source,
    status: params?.status,
    query: params?.q,
  })

  return (
    <AdminShell user={session.user} currentPath="/admin/leads" title="Leads" description={`${result.total} leads`}>
      {/* TODO export. It must be an audited server action rather than a client
          side csv build, because a lead export is a bulk extract of personal
          information and needs a record of who took it and when. */}
      <NoDataYetNotice needs="a leads table, written by /api/lead, carrying the visitorId and sessionId that produced each lead" />

      <DataTable
        columns={COLUMNS}
        rows={result.leads}
        getRowHref={(row) => `/admin/leads/${row.id}`}
        emptyMessage="No leads yet."
      />
    </AdminShell>
  )
}
