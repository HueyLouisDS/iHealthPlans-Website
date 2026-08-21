/**
 * Agent performance, /admin/agents.
 *
 * The only page in the admin area whose rows are named colleagues rather than
 * records, which changes what it owes the reader. Two things are stated on the
 * page rather than left in a comment, because whoever opens this will act on
 * it: who can currently see it, and what the rate column does not control for.
 *
 * TODO this page ranks people. Before it is shown beyond the management team,
 * decide what an agent may see about themselves and about others. The
 * straightforward answer is that an agent sees only their own row, and that
 * needs a role on the session rather than the single allowlist used today.
 */

import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import FilterPanel from '@/components/admin/FilterPanel'
import SelectableTable from '@/components/admin/SelectableTable'
import SnapFocus from '@/components/admin/SnapFocus'
import { buildHref } from '@/lib/admin/urls'
import { DataSourceNotice, StatTile } from '@/components/admin/AdminUi'
import {
  getAgentPerformance,
  usingFixtures,
  parsePeriod,
  PERIODS,
  AGENT_SORTS,
  LOW_VOLUME_LEADS,
} from '@/lib/admin/data'

const BASE = '/admin/agents'
const PARAM_KEYS = ['period', 'sort']

/*
 * Where the page snaps to when a tile is clicked. The filter panel and the
 * table below it are what the tile changed, so landing here shows the result.
 */
const FOCUS_ID = 'agent-table'

/*
 * The tiles rank the table rather than filter it. Filtering to one agent is
 * what clicking their name already does, and it goes somewhere more useful,
 * their call log. What a tile is good for here is asking to see the table
 * ordered by that column.
 */
const TILE_SORTS = {
  agents: 'name',
  calls: 'calls',
  talk: 'talk',
  conversions: 'conversions',
}

const COLUMNS = [
  { key: 'name', label: 'Agent', nowrap: true },
  { key: 'calls', label: 'Calls', align: 'right' },
  { key: 'connected', label: 'Connected', align: 'right' },
  { key: 'talkTime', label: 'Talk time', align: 'right', nowrap: true },
  { key: 'averageCall', label: 'Avg call', align: 'right' },
  { key: 'leads', label: 'Leads', align: 'right' },
  { key: 'conversions', label: 'Enrollments', align: 'right' },
  { key: 'conversionRate', label: 'Rate', align: 'right', format: 'thinRate' },
]

export default async function AdminAgentsPage({ searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const days = parsePeriod(params?.period)
  const sort = params?.sort || 'conversions'

  const filters = { period: params?.period, sort: params?.sort }
  const result = await getAgentPerformance({ days, sort })

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
      activeValue: sort,
      options: AGENT_SORTS,
    },
  ]

  /**
   * The url a tile points at.
   *
   * Clicking the ranked tile again returns to the default, so the way out is
   * the same control as the way in. The period is kept, since it says which
   * window is being looked at rather than how to order it.
   */
  const tileHref = (name) => {
    const next = TILE_SORTS[name]
    const isOn = sort === next
    const href = buildHref(BASE, PARAM_KEYS, filters, { sort: isOn ? undefined : next })

    /*
     * The fragment snaps to the table. Not when clearing, since scrolling
     * somebody down the page as they undo a choice is the opposite of what
     * they asked for.
     */
    return isOn ? href : `${href}#${FOCUS_ID}`
  }

  const exportHref = `${BASE}/export?${new URLSearchParams(
    Object.entries(filters).filter(([, value]) => Boolean(value))
  ).toString()}`

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/agents"
      title="Agents"
      description={`${result.summary.agents} agents handled calls, last ${days} days`}
    >
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="an agent identifier on every call record, which has to come from the phone system"
      />

      {!result.isEmpty && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <StatTile
              label="Agents on calls"
              value={String(result.summary.agents)}
              href={tileHref('agents')}
              isSelected={sort === 'name'}
              selectedLabel={sort === 'name' ? '(table ranked by this, click to clear)' : undefined}
            />
            <StatTile
              label="Calls handled"
              value={result.summary.calls.toLocaleString()}
              href={tileHref('calls')}
              isSelected={sort === 'calls'}
              selectedLabel={sort === 'calls' ? '(table ranked by this, click to clear)' : undefined}
            />
            <StatTile
              label="Talk time"
              value={result.summary.talkTime}
              href={tileHref('talk')}
              isSelected={sort === 'talk'}
              selectedLabel={sort === 'talk' ? '(table ranked by this, click to clear)' : undefined}
            />
            <StatTile
              label="Enrollments"
              value={result.summary.conversions.toLocaleString()}
              rate={result.summary.conversionRate}
              href={tileHref('conversions')}
              isSelected={sort === 'conversions'}
              selectedLabel={sort === 'conversions' ? '(table ranked by this)' : undefined}
            />
          </div>

          {/* Said out loud, on the page, because this one gets acted on. A
              ranking that looks objective and is not is worse than no ranking. */}
          <div className="mb-6 bg-[#f7f7f7] border rounded-lg px-4 py-3 flex flex-col gap-2">
            <p className="text-sm text-[#505258]">
              <strong className="text-ihealthBlue">The rate column is not a like for like
              comparison.</strong>{' '}
              Lead quality varies by source, by hour, and by how the lead arrived, and none of that
              is held constant here. An agent working mostly paid search leads is not doing the same
              job as one working referrals. Comparing agents fairly means comparing them within a
              source, which needs the session table.
            </p>
            <p className="text-sm text-[#505258]">
              <strong className="text-ihealthBlue">Everyone with admin access sees every row.</strong>{' '}
              There is no agent role yet, so this page cannot currently be shown to the people it
              ranks.
            </p>
          </div>

          {/* Everything a tile changes lives inside here, so the snap puts
              the whole result on screen in one movement */}
          <SnapFocus targetId={FOCUS_ID} value={sort} />

          <section
            id={FOCUS_ID}
            /*
             * Focusable so the snap moves the keyboard caret here too, not
             * only the scroll position
             */
            tabIndex={-1}
            aria-label="Agent performance"
            className="scroll-mt-6 focus:outline-none"
          >
          <FilterPanel
            basePath={BASE}
            paramKeys={PARAM_KEYS}
            params={filters}
            tabs={tabs}
            applied={[]}
            exportHref={exportHref}
            summaryLabel={`Last ${days} days, ${result.summary.leads.toLocaleString()} leads assigned`}
          />

          <div className="flex items-center justify-between gap-4 mb-3">
            <p className="text-base text-[#505258]">
              Rates over fewer than {LOW_VOLUME_LEADS} leads are marked thin
            </p>
            {/* Names and performance figures for identifiable people. No health
                information, but the most forwardable file in the admin area,
                so it is audited like the rest. */}
            <a
              href={exportHref}
              className="h-11 px-5 rounded-md bg-ihealthGreen text-white font-semibold inline-flex items-center hover:brightness-95 transition-[filter] focus:outline-none focus:ring-4 focus:ring-ihealthGreen/40"
            >
              Export
            </a>
          </div>
          </section>
        </>
      )}

      <SelectableTable
        rows={result.agents}
        columns={COLUMNS}
        /*
         * The agent name links to that agent's calls for the same period, which
         * is the question anyone asks next after reading a row
         */
        rowHrefBase={`/admin/calls?period=${days}&agent=`}
        rowLabelKey="name"
        exportBase={exportHref}
        selectionNoun="agents"
        emptyMessage="No agent data yet. Nothing is putting an agent identifier on a call record."
      />
    </AdminShell>
  )
}
