/**
 * Attribution, /admin/attribution.
 * Source, campaign, and landing page, reported all the way down the funnel
 * rather than stopping at sessions. Knowing a campaign drove traffic is not
 * useful on its own. Knowing it drove calls that became enrollments is.
 */

import Link from 'next/link'
import { getAdminSession } from '@/lib/admin/session'
import AdminShell from '@/components/admin/AdminShell'
import { DataTable, DataSourceNotice } from '@/components/admin/AdminUi'
import { getAttribution , usingFixtures } from '@/lib/admin/data'

// TODO sessions and call clicks per group need the session table, which does
// not exist. Showing empty columns would read as zero rather than as unknown,
// so they are left out until they can be populated.
const COLUMNS = [
  { key: 'value', label: 'Value' },
  { key: 'leads', label: 'Leads', align: 'right' },
  { key: 'calls', label: 'Calls', align: 'right' },
  { key: 'conversions', label: 'Conversions', align: 'right' },
  { key: 'conversionRate', label: 'Rate', align: 'right' },
]

export default async function AdminAttributionPage({ searchParams }) {
  const isFixtures = usingFixtures()
  const session = await getAdminSession()
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
      <DataSourceNotice isFixtures={isFixtures} needs="first touch capture of utm parameters, gclid, fbclid, msclkid, referrer, and landing page, stored on the session and carried through to the lead" />

      <div className="mb-4 flex flex-wrap gap-2">
        {result.availableDimensions.map((dimension) => (
          <Link
            key={dimension}
            href={`/admin/attribution?groupBy=${dimension}`}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
              dimension === result.groupBy ? 'bg-ihealthBlue text-white' : 'bg-white border text-[#505258]'
            }`}
          >
            {dimension}
          </Link>
        ))}
      </div>

      <DataTable columns={COLUMNS} rows={result.rows} emptyMessage="No attribution data yet." />
    </AdminShell>
  )
}
