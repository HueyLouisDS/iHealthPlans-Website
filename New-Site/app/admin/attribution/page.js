/**
 * Attribution, /admin/attribution.
 * Source, campaign, and landing page, reported all the way down the funnel
 * rather than stopping at sessions. Knowing a campaign drove traffic is not
 * useful on its own. Knowing it drove calls that became enrollments is.
 */

import { auth } from '@/auth'
import AdminShell from '@/components/admin/AdminShell'
import { DataTable, NoDataYetNotice } from '@/components/admin/AdminUi'
import { getAttribution } from '@/lib/admin/data'

const COLUMNS = [
  { key: 'value', label: 'Value' },
  { key: 'sessions', label: 'Sessions', align: 'right' },
  { key: 'callClicks', label: 'Call clicks', align: 'right' },
  { key: 'calls', label: 'Calls', align: 'right' },
  { key: 'leads', label: 'Leads', align: 'right' },
  { key: 'conversions', label: 'Conversions', align: 'right' },
  { key: 'conversionRate', label: 'Rate', align: 'right' },
]

export default async function AdminAttributionPage({ searchParams }) {
  const session = await auth()
  if (!session?.user?.isAuthorised) return null

  const params = await searchParams
  const result = await getAttribution({ from: params?.from, to: params?.to, groupBy: params?.groupBy || 'source' })

  return (
    <AdminShell
      user={session.user}
      currentPath="/admin/attribution"
      title="Attribution"
      description={`Grouped by ${result.groupBy}`}
    >
      <NoDataYetNotice needs="first touch capture of utm parameters, gclid, fbclid, msclkid, referrer, and landing page, stored on the session and carried through to the lead" />

      <div className="mb-4 flex flex-wrap gap-2">
        {result.availableDimensions.map((dimension) => (
          <span
            key={dimension}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
              dimension === result.groupBy ? 'bg-ihealthBlue text-white' : 'bg-white border text-[#505258]'
            }`}
          >
            {dimension}
          </span>
        ))}
      </div>

      <DataTable columns={COLUMNS} rows={result.rows} emptyMessage="No attribution data yet." />
    </AdminShell>
  )
}
