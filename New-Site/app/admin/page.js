/**
 * Admin dashboard, /admin.
 * The funnel the client asked for, traffic to clicks to calls to leads to
 * conversions, as 5 tiles and a trend.
 * Every other admin page is a drill down from one of these numbers.
 */

import { auth } from '@/auth'
import AdminShell from '@/components/admin/AdminShell'
import { StatTile, NoDataYetNotice, EmptyState } from '@/components/admin/AdminUi'
import { getFunnelSummary, getFunnelTrend } from '@/lib/admin/data'

export default async function AdminDashboardPage() {
  // Re-checked here as well as in middleware. One guard that a routing mistake
  // can bypass is how admin areas leak.
  const session = await auth()
  if (!session?.user?.isAuthorised) return null

  const summary = await getFunnelSummary()
  const trend = await getFunnelTrend()

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin"
      title="Dashboard"
      description="Traffic through to conversions"
    >
      <NoDataYetNotice needs="a session and page view record for traffic, /api/call/click for call clicks, a phone system webhook for calls, and the lead and conversion tables" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {summary.stages.map((stage) => (
          <StatTile
            key={stage.key}
            label={stage.label}
            value={stage.count.toLocaleString()}
            rate={stage.rateFromPrevious}
            isMuted={summary.isEmpty}
          />
        ))}
      </div>

      <h2 className="text-lg font-bold text-ihealthBlue mb-3">Daily trend</h2>
      {trend.isEmpty ? (
        <EmptyState message="No days to plot yet. This fills in once sessions are being recorded." />
      ) : null}
    </AdminShell>
  )
}
