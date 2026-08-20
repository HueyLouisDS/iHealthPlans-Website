/**
 * Call log, /admin/calls.
 * The matched column is the one that matters. It says whether a call was tied
 * back to a web session, and the share that are unmatched is the best single
 * health metric for the whole attribution system.
 */

import Link from 'next/link'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import { DataTable, DataSourceNotice, MatchPill, StatTile } from '@/components/admin/AdminUi'
import { getCalls, usingFixtures } from '@/lib/admin/data'

const COLUMNS = [
  { key: 'startedAtLabel', label: 'Started' },
  { key: 'fromNumber', label: 'From' },
  { key: 'leadName', label: 'Lead' },
  { key: 'agent', label: 'Agent' },
  { key: 'durationLabel', label: 'Duration', align: 'right' },
  { key: 'disposition', label: 'Outcome' },
  { key: 'matched', label: 'Session', render: (row) => <MatchPill matched={row.matched} /> },
  { key: 'hasRecording', label: 'Recording', render: (row) => (row.hasRecording ? 'Available' : '-') },
]

const MATCH_FILTERS = [
  { label: 'All', value: null },
  { label: 'Matched', value: 'yes' },
  { label: 'Unmatched', value: 'no' },
]

export default async function AdminCallsPage({ searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const result = await getCalls({ page: Number.parseInt(params?.page, 10) || 1, matched: params?.matched })

  return (
    <AdminShell user={session.user} currentPath="/admin/calls" title="Calls" description={`${result.total} calls`}>
      <DataSourceNotice
        isFixtures={isFixtures}
        needs="a phone system webhook posting to /api/call/webhook with the callId minted at click time, plus the recording url and duration"
      />

      {!result.isEmpty && (
        <>
          {/* Unmatched is given its own tile because it is the number that
              says whether the click to call binding is actually working */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatTile label="Calls" value={result.total.toLocaleString()} />
            <StatTile label="Matched to a session" value={result.matchedRate} />
            <StatTile label="Unmatched" value={result.unmatchedCount.toLocaleString()} />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {MATCH_FILTERS.map((filter) => (
              <Link
                key={filter.label}
                href={filter.value ? `/admin/calls?matched=${filter.value}` : '/admin/calls'}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
                  (params?.matched || null) === filter.value
                    ? 'bg-ihealthBlue text-white'
                    : 'bg-white border text-[#505258]'
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </>
      )}

      <DataTable
        columns={COLUMNS}
        rows={result.calls}
        getRowHref={(row) => `/admin/calls/${row.id}`}
        emptyMessage="No calls yet. The phone system has not been identified, so nothing is posting call records."
      />
    </AdminShell>
  )
}
