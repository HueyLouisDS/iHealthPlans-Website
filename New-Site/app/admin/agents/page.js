/**
 * Agent performance, /admin/agents.
 *
 * TODO this page ranks people. Before it is shown to anyone beyond the
 * management team, decide what an agent may see about themselves and about
 * others. The straightforward answer is that an agent sees only their own row,
 * and that needs a role on the session rather than the single allowlist the
 * admin area uses today.
 */

import { auth } from '@/auth'
import AdminShell from '@/components/admin/AdminShell'
import { DataTable, NoDataYetNotice } from '@/components/admin/AdminUi'
import { getAgentPerformance } from '@/lib/admin/data'

const COLUMNS = [
  { key: 'name', label: 'Agent' },
  { key: 'calls', label: 'Calls', align: 'right' },
  { key: 'talkTime', label: 'Talk time', align: 'right' },
  { key: 'leads', label: 'Leads', align: 'right' },
  { key: 'conversions', label: 'Conversions', align: 'right' },
  { key: 'conversionRate', label: 'Rate', align: 'right' },
]

export default async function AdminAgentsPage({ searchParams }) {
  const session = await auth()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const result = await getAgentPerformance({ from: params?.from, to: params?.to })

  return (
    <AdminShell user={session.user} currentPath="/admin/agents" title="Agents" description="Performance by agent">
      <NoDataYetNotice needs="an agent identifier on every call record, which has to come from the phone system" />
      <DataTable columns={COLUMNS} rows={result.agents} emptyMessage="No agent data yet." />
    </AdminShell>
  )
}
