/**
 * One call, /admin/calls/[id]. Recording, transcript, and the matched lead.
 *
 * IMPORTANT this page will eventually serve call recordings, which contain
 * personal health information. Before a player is wired up, 2 things must
 * exist. Recordings must be served through short lived signed urls rather than
 * a guessable path, and every access must be written to an audit log naming
 * who listened and when. Do not skip either.
 */

import { auth } from '@/auth'
import AdminShell from '@/components/admin/AdminShell'
import { NoDataYetNotice, EmptyState } from '@/components/admin/AdminUi'
import { getCall } from '@/lib/admin/data'

export default async function AdminCallDetailPage({ params }) {
  const session = await auth()
  if (!session?.user?.isAuthorised) return null

  const { id } = await params
  const call = await getCall(id)

  return (
    <AdminShell user={session.user} currentPath="/admin/calls" title="Call" description={`Reference ${id}`}>
      <NoDataYetNotice needs="call records, a recording store with signed url access, and an access audit log before any recording is playable" />
      <EmptyState message="No call record found. Nothing is being captured yet." />
    </AdminShell>
  )
}
