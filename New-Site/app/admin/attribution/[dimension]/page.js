/**
 * Attribution, /admin/attribution/[dimension].
 *
 * Source, campaign, and landing page reported all the way down the funnel
 * rather than stopping at sessions. Knowing a campaign drove traffic is not
 * useful on its own. Knowing it drove calls that became enrollments is.
 *
 * The grouping is a route segment rather than a query parameter, because it is
 * the question the page answers rather than a refinement of it. That makes each
 * breakdown a real page, so it can be linked to, bookmarked, and sent to
 * somebody without a query string that a mail client might mangle. It also
 * means an unknown grouping is a 404 rather than a silent fallback.
 *
 * Everything that narrows the question, period, device, enquiring for, and
 * sort, stays in the query string where it belongs.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import FilterPanel from '@/components/admin/FilterPanel'
import SelectableTable from '@/components/admin/SelectableTable'
import { buildHref } from '@/lib/admin/urls'
import { DataSourceNotice, StatTile } from '@/components/admin/AdminUi'
import {
  getAttribution,
  usingFixtures,
  parsePeriod,
  findDimension,
  PERIODS,
  ATTRIBUTION_DIMENSIONS,
  ATTRIBUTION_SORTS,
  LOW_VOLUME_LEADS,
} from '@/lib/admin/data'

// Only the filters live in the query string now. The grouping is in the path.
const PARAM_KEYS = ['period', 'device', 'audience', 'sort']

/**
 * Names the tab after the breakdown being shown, since these are separate pages
 * now and several are likely to be open at once.
 */
export async function generateMetadata({ params }) {
  const { dimension: slug } = await params
  const dimension = findDimension(slug)
  return { title: dimension ? `Attribution by ${dimension.label.toLowerCase()}` : 'Attribution' }
}

export default async function AdminAttributionPage({ params, searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const { dimension: slug } = await params
  const dimension = findDimension(slug)
  if (!dimension) notFound()

  const base = `/admin/attribution/${dimension.slug}`

  const query = await searchParams
  const days = parsePeriod(query?.period)

  const filters = {
    period: query?.period,
    device: query?.device,
    audience: query?.audience,
    sort: query?.sort,
  }

  const result = await getAttribution({
    groupBy: dimension.value,
    days,
    device: query?.device,
    onBehalfOf: query?.audience,
    sort: query?.sort,
  })

  // The first column has to be labelled with whatever is being grouped, or
  // every view reads as an unnamed list of strings
  const columns = [
    { key: 'value', label: dimension.column },
    { key: 'leads', label: 'Leads', align: 'right' },
    { key: 'leadShare', label: 'Share', align: 'right' },
    { key: 'calls', label: 'Calls', align: 'right' },
    { key: 'callsPerLead', label: 'Calls / lead', align: 'right' },
    { key: 'conversions', label: 'Enrollments', align: 'right' },
    { key: 'conversionRate', label: 'Rate', align: 'right', format: 'thinRate' },
  ]

  const applied = [
    query?.device && { key: 'device', label: `Device: ${query.device}` },
    query?.audience && { key: 'audience', label: `Enquiring for: ${query.audience}` },
  ].filter(Boolean)

  // The cross filter matching the current grouping is dropped. Grouping by
  // device and then filtering to mobile leaves a single row, which is a
  // control that only ever makes the page less useful.
  const tabs = [
    {
      key: 'period',
      label: 'Period',
      paramKey: 'period',
      activeValue: String(days),
      options: PERIODS.map((period) => ({ value: period.value, label: period.label })),
    },
    dimension.value !== 'device' && {
      key: 'device',
      label: 'Device',
      paramKey: 'device',
      activeValue: query?.device,
      isApplied: Boolean(query?.device),
      options: [
        { value: undefined, label: 'All' },
        ...result.devices.map((value) => ({ value, label: value })),
      ],
    },
    dimension.value !== 'onBehalfOf' && {
      key: 'audience',
      label: 'Enquiring for',
      paramKey: 'audience',
      activeValue: query?.audience,
      isApplied: Boolean(query?.audience),
      options: [
        { value: undefined, label: 'All' },
        ...result.audiences.map((value) => ({ value, label: value })),
      ],
    },
    {
      key: 'sort',
      label: 'Sort',
      paramKey: 'sort',
      activeValue: query?.sort || 'leads',
      options: ATTRIBUTION_SORTS,
    },
  ].filter(Boolean)

  // The export sits under this dimension's path too, so the file and the page
  // can never disagree about what was grouped
  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => Boolean(value))
  ).toString()
  const exportHref = exportQuery ? `${base}/export?${exportQuery}` : `${base}/export`

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/attribution"
      title="Attribution"
      description={`${result.summary.leads.toLocaleString()} leads across ${result.summary.groups} ${dimension.label.toLowerCase()} groups, last ${days} days`}
    >
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="first touch capture of utm parameters, gclid, fbclid, msclkid, referrer, and landing page, stored on the session and carried through to the lead"
      />

      {!result.isEmpty && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatTile label="Leads" value={result.summary.leads.toLocaleString()} />
            <StatTile label="Calls from those leads" value={result.summary.calls.toLocaleString()} />
            <StatTile
              label="Enrollments"
              value={result.summary.conversions.toLocaleString()}
              rate={result.summary.conversionRate}
            />
            {/* Muted on purpose. It is a gap in the data rather than a result,
                and it should not sit next to the others looking like one. */}
            <StatTile
              label="Calls with no lead"
              value={result.unattributedCalls.toLocaleString()}
              isMuted
            />
          </div>

          {/* Stated plainly rather than left for someone to work out from the
              fact that two numbers do not reconcile */}
          <p className="mb-6 text-sm text-[#505258] bg-[#f7f7f7] border rounded-lg px-4 py-3">
            The Calls column counts only calls tied to a lead. Of{' '}
            {result.totalCalls.toLocaleString()} calls in this period,{' '}
            {result.unattributedCalls.toLocaleString()} never became a lead and carry no source, so
            they are missing from every row below. Attributing them needs the session table, which
            does not exist yet.
          </p>

          {/* Real navigation, not a filter. Each of these is its own page. */}
          <nav aria-label="Group by" className="mb-4">
            <p className="text-sm font-bold uppercase tracking-[1.2px] text-[#505258] mb-2">Group by</p>
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTION_DIMENSIONS.map((entry) => {
                const isActive = entry.slug === dimension.slug

                return (
                  <Link
                    key={entry.slug}
                    // Period and sort carry across, the cross filters do not.
                    // A device filter carried into the device breakdown leaves
                    // a one row table that looks like the whole answer.
                    href={buildHref(`/admin/attribution/${entry.slug}`, PARAM_KEYS, filters, {
                      device: undefined,
                      audience: undefined,
                    })}
                    aria-current={isActive ? 'page' : undefined}
                    className={`h-11 px-4 rounded-md text-sm font-semibold inline-flex items-center transition-colors ${
                      isActive
                        ? 'bg-ihealthBlue text-white'
                        : 'bg-white border text-[#505258] hover:border-ihealthBlue'
                    }`}
                  >
                    {entry.label}
                  </Link>
                )
              })}
            </div>
          </nav>

          <FilterPanel
            basePath={base}
            paramKeys={PARAM_KEYS}
            params={filters}
            tabs={tabs}
            applied={applied}
            exportHref={exportHref}
            summaryLabel={`Last ${days} days, ${result.summary.groups} groups`}
          />

          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-base text-[#505258]">
              Rates over fewer than {LOW_VOLUME_LEADS} leads are marked thin
            </p>
            {/* Aggregates rather than people, so this export carries no
                personal data. Still audited, see the export route. */}
            <a
              href={exportHref}
              className="h-11 px-5 rounded-md bg-ihealthGreen text-white font-semibold inline-flex items-center hover:brightness-95 transition-[filter] focus:outline-none focus:ring-4 focus:ring-ihealthGreen/40"
            >
              Export
            </a>
          </div>
        </>
      )}

      <SelectableTable
        rows={result.rows}
        columns={columns}
        // No rowHrefBase. There is no per group detail page, and a link that
        // goes nowhere is worse than no link.
        rowLabelKey="value"
        exportBase={exportHref}
        selectionNoun="groups"
        emptyMessage={
          applied.length > 0
            ? 'No leads match these filters in this period.'
            : 'No attribution data yet. Nothing is capturing where visitors come from.'
        }
      />
    </AdminShell>
  )
}
