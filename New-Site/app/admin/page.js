/**
 * Admin dashboard, /admin.
 * The funnel the client asked for, traffic to clicks to calls to leads to
 * conversions, as 5 tiles plus a daily trend.
 * Every other admin page is a drill down from one of these numbers.
 */

import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import { StatTile, DataSourceNotice, EmptyState } from '@/components/admin/AdminUi'
import { getFunnelSummary, getFunnelTrend, usingFixtures } from '@/lib/admin/data'

/**
 * Daily bars for leads and calls.
 * Plain CSS rather than a charting library. Two series over 30 days does not
 * justify a dependency, and a bar chart built from divs cannot break at build
 * time the way a client only chart can.
 */
function TrendChart({ days, peak }) {
  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="flex items-end gap-1 h-[180px]" role="img" aria-label="Daily leads and calls over the last 30 days">
        {days.map((day) => (
          <div key={day.date.toISOString()} className="flex-1 flex items-end gap-0.5 h-full" title={`${day.date.toDateString()}: ${day.leads} leads, ${day.calls} calls`}>
            <div className="flex-1 bg-ihealthBlue rounded-t" style={{ height: `${(day.leads / peak) * 100}%` }} />
            <div className="flex-1 bg-ihealthGreen rounded-t" style={{ height: `${(day.calls / peak) * 100}%` }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-6 mt-4 text-sm text-[#505258]">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-ihealthBlue" /> Leads
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-ihealthGreen" /> Calls
        </span>
        <span className="ml-auto">Last {days.length} days</span>
      </div>
    </div>
  )
}

export default async function AdminDashboardPage() {
  const isFixtures = usingFixtures()
  // Re-checked here as well as in middleware. One guard that a routing mistake
  // can bypass is how admin areas leak.
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const summary = await getFunnelSummary()
  const trend = await getFunnelTrend()

  return (
    <AdminShell user={session.user} currentPath="/admin" title="Dashboard" description="Traffic through to conversions">
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="a session and page view record for traffic, /api/call/click for call clicks, a phone system webhook for calls, and the lead and conversion tables"
      />

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
      ) : (
        <TrendChart days={trend.days} peak={trend.peak} />
      )}
    </AdminShell>
  )
}
