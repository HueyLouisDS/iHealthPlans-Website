/**
 * Campaign spend, /admin/spend/[channel].
 *
 * Attribution says which channel produced the leads. This says what they cost.
 * The all view ranks channels against each other, and each channel is its own
 * page listing the campaigns inside it.
 *
 * Every cost here is media spend only. It is not a full cost per acquisition,
 * because agent time, dialer minutes, and the vendor lead bill are not in this
 * table. The page says so rather than letting the number be read as one.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import FilterPanel from '@/components/admin/FilterPanel'
import { buildHref } from '@/lib/admin/urls'
import { DataSourceNotice, StatTile, DataTable } from '@/components/admin/AdminUi'
import {
  getCampaignSpend,
  usingFixtures,
  parsePeriod,
  findChannel,
  PERIODS,
  CAMPAIGN_CHANNELS,
  CAMPAIGN_SORTS,
  TARGET_COST_PER_LEAD,
  LOW_VOLUME_LEADS,
} from '@/lib/admin/data'

const PARAM_KEYS = ['period', 'sort']   // filters only, the channel is in the path

export async function generateMetadata({ params }) {
  const { channel: slug } = await params
  const channel = findChannel(slug)
  return { title: channel ? `Spend, ${channel.label.toLowerCase()}` : 'Spend' }
}

/* green under target, red over, plain when there is nothing to compare */
function TargetPill({ target }) {
  const styles = {
    good: 'bg-green-100 text-green-900',
    bad: 'bg-red-100 text-red-900',
    neutral: 'text-[#6C7381]',
  }

  return (
    <span className={`px-2 py-1 rounded text-sm font-semibold ${styles[target.tone]}`}>
      {target.label}
    </span>
  )
}

export default async function AdminSpendPage({ params, searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const { channel: slug } = await params
  const channel = findChannel(slug)
  if (!channel) notFound()

  const base = `/admin/spend/${channel.slug}`

  const query = await searchParams
  const days = parsePeriod(query?.period)
  const filters = { period: query?.period, sort: query?.sort }

  const result = await getCampaignSpend({
    channel: channel.slug,
    days,
    sort: query?.sort,
  })

  const isAll = channel.slug === 'all'

  const columns = [
    { key: 'value', label: isAll ? 'Channel' : 'Campaign' },
    { key: 'spendLabel', label: 'Spend', align: 'right' },
    { key: 'leads', label: 'Leads', align: 'right', render: (row) => row.leads.toLocaleString() },
    { key: 'costPerLeadLabel', label: 'Cost / lead', align: 'right' },
    // Only when a target exists. Next to the figure it judges, or the reader
    // has to hold a number across four columns to know what it is measured on.
    TARGET_COST_PER_LEAD !== null && {
      key: 'target',
      label: `vs $${TARGET_COST_PER_LEAD}`,
      align: 'right',
      render: (row) => <TargetPill target={row.target} />,
    },
    {
      key: 'conversions',
      label: 'Enrollments',
      align: 'right',
      render: (row) => row.conversions.toLocaleString(),
    },
    { key: 'conversionRate', label: 'Rate', align: 'right' },
    { key: 'costPerEnrollmentLabel', label: 'Cost / enrollment', align: 'right' },
  ].filter(Boolean)

  const tabs = [
    {
      key: 'period',
      label: 'Period',
      paramKey: 'period',
      activeValue: String(days),
      options: PERIODS.map((period) => ({ value: period.value, label: period.label })),
    },
    {
      key: 'sort',
      label: 'Sort',
      paramKey: 'sort',
      activeValue: query?.sort || 'spend',
      options: CAMPAIGN_SORTS,
    },
  ]

  /*
   Only the all view drills down. Clicking a campaign row would land on a page
   grouping campaigns by campaign, which is the same row on its own.
  */
  const rowHref = isAll
    ? (row) => {
        const target = CAMPAIGN_CHANNELS.find((one) => one.label === row.value)
        return target ? buildHref(`/admin/spend/${target.slug}`, PARAM_KEYS, filters) : null
      }
    : undefined

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/spend"
      title="Spend"
      description={`${result.summary.spendLabel} spent, ${result.summary.leads.toLocaleString()} leads, last ${days} days`}
    >
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="spend pulled from the Google Ads and Meta Marketing APIs, keyed on the same source, medium, and campaign the session already carries"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatTile label="Media spend" value={result.summary.spendLabel} />
        <StatTile label="Leads" value={result.summary.leads.toLocaleString()} />
        <StatTile
          label="Cost per lead"
          value={result.summary.costPerLeadLabel}
          rate={result.summary.target?.label}
        />
        <StatTile label="Cost per enrollment" value={result.summary.costPerEnrollmentLabel} />
      </div>

      {/* Stated on the page, because a reader who works any of this out for
          themselves stops trusting the rest of it */}
      <p className="mb-6 text-sm text-[#505258] bg-[#f7f7f7] border rounded-lg px-4 py-3">
        {TARGET_COST_PER_LEAD === null ? (
          <>
            No cost per lead target is set, so nothing here passes or fails. A target is worked out
            from what an enrollment pays and what share of leads reach one, not from what other
            people pay for ads, and the second half of that only becomes real once the enrollment
            column has live data behind it.
          </>
        ) : (
          <>
            The ${TARGET_COST_PER_LEAD} target is on cost per lead, which is what this site
            produces. Cost per enrollment carries no target, it is the quality check that catches a
            channel sending leads that never convert.
          </>
        )}{' '}
        Media spend either way. Agent time, dialer minutes, and purchased vendor leads are not in
        these figures, and on a short period the enrollment columns read low simply because those
        leads have not been worked yet.
      </p>

      {/* Real navigation, not a filter. Each channel is its own page. */}
      <nav aria-label="Channel" className="mb-4">
        <p className="text-sm font-bold uppercase tracking-[1.2px] text-[#505258] mb-2">Channel</p>
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_CHANNELS.map((entry) => {
            const isActive = entry.slug === channel.slug

            return (
              <Link
                key={entry.slug}
                href={buildHref(`/admin/spend/${entry.slug}`, PARAM_KEYS, filters)}
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
        summaryLabel={`${result.rows.length} ${isAll ? 'channels' : 'campaigns'}`}
      />

      <DataTable
        columns={columns}
        rows={result.rows}
        getRowHref={rowHref}
        emptyMessage={
          isFixtures
            ? 'No spend or leads in this period.'
            : 'No spend recorded yet. This fills in once the ad platform connections are configured.'
        }
      />

      {result.rows.some((row) => row.lowVolume) && (
        <p className="mt-4 text-sm text-[#6C7381]">
          Rows under {LOW_VOLUME_LEADS} leads carry a cost per enrollment built on very few
          conversions. Treat those figures as a direction rather than a number.
        </p>
      )}
    </AdminShell>
  )
}
