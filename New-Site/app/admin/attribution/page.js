/**
 * Attribution, /admin/attribution.
 *
 * Source, campaign, and landing page reported all the way down the funnel
 * rather than stopping at sessions. Knowing a campaign drove traffic is not
 * useful on its own. Knowing it drove calls that became enrollments is.
 *
 * The grouping control stays outside the collapsible panel, unlike every other
 * filter on this page. Choosing the dimension is not a refinement here, it is
 * the question being asked, and burying the question inside a panel that
 * starts closed would be a step backwards from the plain version this replaced.
 */

import Link from 'next/link'
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
  parseDimension,
  PERIODS,
  ATTRIBUTION_DIMENSIONS,
  ATTRIBUTION_SORTS,
  LOW_VOLUME_LEADS,
} from '@/lib/admin/data'

const BASE = '/admin/attribution'
const PARAM_KEYS = ['period', 'groupBy', 'device', 'audience', 'sort']

export default async function AdminAttributionPage({ searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const days = parsePeriod(params?.period)
  const groupBy = parseDimension(params?.groupBy)

  const filters = {
    period: params?.period,
    groupBy: params?.groupBy,
    device: params?.device,
    audience: params?.audience,
    sort: params?.sort,
  }

  const result = await getAttribution({
    groupBy,
    days,
    device: params?.device,
    onBehalfOf: params?.audience,
    sort: params?.sort,
  })

  // The first column has to be labelled with whatever is being grouped, or
  // every view reads as an unnamed list of strings
  const columns = [
    { key: 'value', label: result.dimension.column },
    { key: 'leads', label: 'Leads', align: 'right' },
    { key: 'leadShare', label: 'Share', align: 'right' },
    { key: 'calls', label: 'Calls', align: 'right' },
    { key: 'callsPerLead', label: 'Calls / lead', align: 'right' },
    { key: 'conversions', label: 'Enrollments', align: 'right' },
    { key: 'conversionRate', label: 'Rate', align: 'right', format: 'thinRate' },
  ]

  const applied = [
    params?.device && { key: 'device', label: `Device: ${params.device}` },
    params?.audience && { key: 'audience', label: `Enquiring for: ${params.audience}` },
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
    groupBy !== 'device' && {
      key: 'device',
      label: 'Device',
      paramKey: 'device',
      activeValue: params?.device,
      isApplied: Boolean(params?.device),
      options: [
        { value: undefined, label: 'All' },
        ...result.devices.map((value) => ({ value, label: value })),
      ],
    },
    groupBy !== 'onBehalfOf' && {
      key: 'audience',
      label: 'Enquiring for',
      paramKey: 'audience',
      activeValue: params?.audience,
      isApplied: Boolean(params?.audience),
      options: [
        { value: undefined, label: 'All' },
        ...result.audiences.map((value) => ({ value, label: value })),
      ],
    },
    {
      key: 'sort',
      label: 'Sort',
      paramKey: 'sort',
      activeValue: params?.sort || 'leads',
      options: ATTRIBUTION_SORTS,
    },
  ].filter(Boolean)

  const exportHref = `${BASE}/export?${new URLSearchParams(
    Object.entries({ ...filters, groupBy }).filter(([, value]) => Boolean(value))
  ).toString()}`

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/attribution"
      title="Attribution"
      description={`${result.summary.leads.toLocaleString()} leads across ${result.summary.groups} ${result.dimension.label.toLowerCase()} groups, last ${days} days`}
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

          {/* Grouping stays out of the collapse. It is the question, not a
              refinement of it. */}
          <div className="mb-4">
            <p className="text-sm font-bold uppercase tracking-[1.2px] text-[#505258] mb-2">Group by</p>
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTION_DIMENSIONS.map((dimension) => {
                const isActive = dimension.value === result.groupBy

                return (
                  <Link
                    key={dimension.value}
                    // The cross filters are deliberately dropped when the
                    // grouping changes. A device filter carried into a device
                    // grouping produces a one row table, and worse, one that
                    // looks like the whole answer.
                    href={buildHref(BASE, PARAM_KEYS, filters, {
                      groupBy: dimension.value,
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
                    {dimension.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <FilterPanel
            basePath={BASE}
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
