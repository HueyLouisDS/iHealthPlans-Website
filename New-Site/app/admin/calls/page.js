/**
 * Call log, /admin/calls.
 * The "matched" column is the one that matters. It says whether a call was
 * tied back to a web session, and the share of calls that are unmatched is the
 * best single health metric for the whole attribution system.
 */

import { auth } from '@/auth'
import AdminShell from '@/components/admin/AdminShell'
import { DataTable, NoDataYetNotice } from '@/components/admin/AdminUi'
import { getCalls } from '@/lib/admin/data'

const COLUMNS = [
  { key: 'startedAt', label: 'Started' },
  { key: 'fromNumber', label: 'From' },
  { key: 'agent', label: 'Agent' },
  { key: 'duration', label: 'Duration', align: 'right' },
  { key: 'disposition', label: 'Outcome' },
  { key: 'matched', label: 'Matched to session' },
  { key: 'recording', label: 'Recording' },
]

export default async function AdminCallsPage({ searchParams }) {
  const session = await auth()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const result = await getCalls({
    page: Number.parseInt(params?.page, 10) || 1,
    from: params?.from,
    to: params?.to,
    agentId: params?.agent,
    matched: params?.matched,
  })

  return (
    <AdminShell user={session.user} currentPath="/admin/calls" title="Calls" description={`${result.total} calls`}>
      <NoDataYetNotice needs="a phone system webhook posting to /api/call/webhook with the callId minted at click time, plus the recording url and duration" />

      <DataTable
        columns={COLUMNS}
        rows={result.calls}
        getRowHref={(row) => `/admin/calls/${row.id}`}
        emptyMessage="No calls yet. The phone system has not been identified, so nothing is posting call records."
      />
    </AdminShell>
  )
}
