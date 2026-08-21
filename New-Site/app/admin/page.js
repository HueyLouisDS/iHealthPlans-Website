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
import TopSources from '@/components/admin/TopSources'
import SnapFocus from '@/components/admin/SnapFocus'
import { StatTile, DataSourceNotice, EmptyState, StatusPill } from '@/components/admin/AdminUi'
import {
  getFunnelSummary,
  getFunnelTrend,
  getTopSources,
  getRecentLeads,
  usingFixtures,
  parsePeriod,
  parseStage,
  PERIODS,
  FUNNEL_STAGES,
} from '@/lib/admin/data'

// The id the page snaps to when a stage is selected. Everything the selection
// changes sits below it, so landing here puts the whole focused view on screen
// in one movement.
const FOCUS_ID = 'stage-focus'

/**
 * Builds a dashboard url, keeping the period and setting the stage.
 *
 * Period has to survive selecting a stage, or every click would silently throw
 * the reader back to the default 30 days.
 *
 * Selecting a stage carries a fragment so the browser snaps to the focused
 * view. Clearing does not, since scrolling somebody down the page as they undo
 * a selection is the opposite of what they asked for.
 */
function dashboardHref(days, stageSlug, { snap = true } = {}) {
  const params = new URLSearchParams()
  if (days !== 30) params.set('period', String(days))
  if (stageSlug) params.set('stage', stageSlug)

  const query = params.toString()
  const path = query ? `/admin?${query}` : '/admin'
  return stageSlug && snap ? `${path}#${FOCUS_ID}` : path
}

/**
 * What the selected stage means, sitting between the tiles and the charts.
 *
 * Exists because a green ring on a tile says which one is selected but not
 * what selecting it did. This says what the number is, what it cost to reach
 * it, and where the underlying records are.
 */
function StageContext({ stage, summary, days }) {
  const current = summary.stages.find((entry) => entry.key === stage.key)
  const index = summary.stages.findIndex((entry) => entry.key === stage.key)
  const previous = index > 0 ? summary.stages[index - 1] : null
  const lost = previous ? previous.count - current.count : null

  return (
    <section
      id={FOCUS_ID}
      // Focusable so the snap moves the keyboard caret here too, not only the
      // scroll position. Without this a keyboard user is jumped visually and
      // then tabs from wherever they were, which is the tile they just left.
      tabIndex={-1}
      aria-label={`${stage.label} selected`}
      className="scroll-mt-6 mb-6 bg-white border-2 border-ihealthGreen rounded-lg px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 focus:outline-none"
    >
      <p className="text-base text-[#505258]">
        <span className="font-bold text-ihealthBlue">{current.count.toLocaleString()}</span>{' '}
        {stage.noun} in the last {days} days
        {previous && (
          <>
            {', '}
            <span className="font-bold text-ihealthBlue">{lost.toLocaleString()}</span> lost between{' '}
            {previous.label.toLowerCase()} and here
          </>
        )}
      </p>

      {/* Only where a page actually exists. Sessions and call clicks have no
          table, and a link to an empty page is worse than none. */}
      {stage.onward ? (
        <Link href={stage.onward.href} className="text-sm font-semibold text-[#105fa8] hover:underline">
          {stage.onward.label}
        </Link>
      ) : (
        <span className="text-sm text-[#6C7381]">
          No record level view yet, {stage.noun} are counted rather than stored
        </span>
      )}

      <Link
        href={dashboardHref(days, null)}
        className="text-sm font-semibold text-[#105fa8] hover:underline ml-auto"
      >
        Clear
      </Link>
    </section>
  )
}

/**
 * Period selector. Plain links rather than a control, so each view has its own
 * url that can be bookmarked and shared.
 */
function PeriodPicker({ days, stageSlug = null }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODS.map((period) => {
        const isActive = Number(period.value) === days

        return (
          <Link
            key={period.value}
            // The selected stage rides along, so changing the period does not
            // silently drop the thing the reader is looking at. No snap
            // though, since asking for a different period is not asking to be
            // moved down the page away from the control you just used.
            href={dashboardHref(Number(period.value), stageSlug, { snap: false })}
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
  const stage = parseStage(params?.stage)

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
        <PeriodPicker days={days} stageSlug={stage?.slug || null} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {summary.stages.map((entry) => {
          const definition = FUNNEL_STAGES.find((item) => item.key === entry.key)
          const isSelected = stage?.key === entry.key

          return (
            <StatTile
              key={entry.key}
              label={entry.label}
              value={entry.count.toLocaleString()}
              delta={entry.delta}
              isMuted={summary.isEmpty}
              // Nothing to select while the funnel is empty, and a tile that
              // filters to zero of nothing is a control that only frustrates
              href={
                summary.isEmpty || !definition
                  ? undefined
                  : // Clicking the selected tile clears it, so the way out is
                    // the same control as the way in
                    dashboardHref(days, isSelected ? null : definition.slug)
              }
              isSelected={isSelected}
              selectedLabel={isSelected ? '(selected, click to clear)' : undefined}
            />
          )
        })}
      </div>

      {stage && !summary.isEmpty && (
        <>
          <SnapFocus targetId={FOCUS_ID} value={stage.slug} />
          <StageContext stage={stage} summary={summary} days={days} />
        </>
      )}

      {summary.isEmpty ? (
        <EmptyState message="No funnel to draw yet. This fills in once sessions and calls are being recorded." />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6 mb-6">
          <div>
            <h2 className="text-lg font-bold text-ihealthBlue mb-3">Where the funnel leaks</h2>
            <FunnelChart stages={summary.stages} selectedKey={stage?.key || null} />
          </div>

          <div className="flex flex-col gap-6">
            <TopSources measures={sources.measures} />
            <RecentLeads rows={recent.rows} />
          </div>
        </div>
      )}

      {!trend.isEmpty && <TrendChart days={trend.days} peak={trend.peak} stage={stage} />}
    </AdminShell>
  )
}
