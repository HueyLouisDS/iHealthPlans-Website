/**
 * One lead and their complete journey, /admin/leads/[id].
 *
 * This is the page that proves the engagement works. It has to resolve the ad
 * click, the landing page, the pages read, the phone click, the call, the
 * recording, and the CRM record to a single person. If it renders correctly
 * the identity problem is solved, and if it cannot, none of the aggregate
 * reporting elsewhere in this area is trustworthy either.
 */

import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import AdminShell from '@/components/admin/AdminShell'
import { NoDataYetNotice, EmptyState } from '@/components/admin/AdminUi'
import { getLead } from '@/lib/admin/data'

export default async function AdminLeadDetailPage({ params }) {
  const session = await auth()
  if (!session?.user?.isAuthorised) return null

  const { id } = await params
  const lead = await getLead(id)

  // Once the data layer is real, an unknown id must 404 rather than render an
  // empty shell, or the page becomes a way to probe which ids exist
  if (lead) {
    // TODO render identity, attribution, timeline, calls, and crm record
  }

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/leads"
      title="Lead"
      description={`Reference ${id}`}
    >
      <NoDataYetNotice needs="the full identity chain, visitor to session to call click to call to lead, joined on the ids minted at click time" />
      <EmptyState message="No lead record found. Nothing is being captured yet." />
    </AdminShell>
  )
}
