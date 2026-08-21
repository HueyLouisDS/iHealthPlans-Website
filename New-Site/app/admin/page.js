/**
 * Admin dashboard, /admin.
 * The funnel the client asked for, traffic through to conversions, plus where
 * the leads came from and what has just come in.
 *
 * Laid out so the page answers 3 questions in order. Is the business up or
 * down, where is the funnel leaking, and what happened today. Everything else
 * in the admin area is a drill down from one of those.
 */

import Link from 'next/link'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import FunnelChart from '@/components/admin/FunnelChart'
import TrendChart from '@/components/admin/TrendChart'
import { StatTile, DataSourceNotice, EmptyState, StatusPill } from '@/components/admin/AdminUi'
import {
  getFunnelSummary,
  getFunnelTrend,
  getTopSources,
  getRecentLeads,
  usingFixtures,
  parsePeriod,
  PERIODS,
} from '@/lib/admin/data'

/**
 * Period selector. Plain links rather than a control, so each view has its own
 * url that can be bookmarked and shared.
 */
function PeriodPicker({ days }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((period) => {
        const isActive = Number(period.value) === days

        return (
          <Link
            key={period.value}
            href={`/admin?period=${period.value}`}
            aria-current={isActive ? 'page' : undefined}
            className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
              isActive ? 'bg-ihealthBlue text-white' : 'bg-white border text-[#505258] hover:border-ihealthBlue'
            }`}
          >
            {period.label}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * Sources ranked by leads produced rather than by traffic sent.
 * A source with high traffic and no leads is a cost, not a top source.
 */
function TopSources({ rows }) {
  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold text-ihealthBlue">Top sources</h2>
        <Link href="/admin/attribution" className="text-sm font-semibold text-[#105fa8] hover:underline">
          All attribution
        </Link>
      </div>

      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <li key={row.source} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold text-ihealthBlue truncate">{row.source}</span>
              <span className="text-sm text-[#505258] tabular-nums flex-shrink-0">
                {row.leads} leads, {row.conversionRate}
              </span>
            </div>
            <div className="w-full h-2 bg-[#eef0f4] rounded-full overflow-hidden">
              <div className="h-full bg-ihealthGreen rounded-full" style={{ width: `${row.share * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The most recent arrivals, so the page shows activity and not only totals.
 */
function RecentLeads({ rows }) {
  return (
    <div className="bg-white border rounded-lg p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold text-ihealthBlue">Latest leads</h2>
        <Link href="/admin/leads" className="text-sm font-semibold text-[#105fa8] hover:underline">
          All leads
        </Link>
      </div>

      <ul className="flex flex-col divide-y">
        {rows.map((lead) => (
          <li key={lead.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/admin/leads/${lead.id}`} className="text-[#105fa8] font-semibold hover:underline">
                {lead.name}
              </Link>
              <p className="text-sm text-[#505258] truncate">
                {lead.source} · {lead.createdAtLabel}
              </p>
            </div>
            <StatusPill status={lead.status} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function AdminDashboardPage({ searchParams }) {
  const isFixtures = usingFixtures()
  // Re-checked here as well as in middleware. One guard that a routing mistake
  // can bypass is how admin areas leak.
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const days = parsePeriod(params?.period)

  const [summary, trend, sources, recent] = await Promise.all([
    getFunnelSummary({ days }),
    getFunnelTrend({ days }),
    getTopSources({ days }),
    getRecentLeads(),
  ])

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin"
      title="Dashboard"
      description="Traffic through to conversions"
    >
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="a session and page view record for traffic, /api/call/click for call clicks, a phone system webhook for calls, and the lead and conversion tables"
      />

      <div className="mb-6">
        <PeriodPicker days={days} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {summary.stages.map((stage) => (
          <StatTile
            key={stage.key}
            label={stage.label}
            value={stage.count.toLocaleString()}
            delta={stage.delta}
            isMuted={summary.isEmpty}
          />
        ))}
      </div>

      {summary.isEmpty ? (
        <EmptyState message="No funnel to draw yet. This fills in once sessions and calls are being recorded." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6 mb-6">
          <div>
            <h2 className="text-lg font-bold text-ihealthBlue mb-3">Where the funnel leaks</h2>
            <FunnelChart stages={summary.stages} />
          </div>

          <div className="flex flex-col gap-6">
            <TopSources rows={sources.rows} />
            <RecentLeads rows={recent.rows} />
          </div>
        </div>
      )}

      {!trend.isEmpty && <TrendChart days={trend.days} peak={trend.peak} />}
    </AdminShell>
  )
}
