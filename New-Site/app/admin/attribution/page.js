// /admin/attribution, a redirect rather than a page. The breakdowns live at
// /admin/attribution/[dimension]. Carries the query string across so old links
// keep their period and sort, and honours the retired ?groupBy= parameter.

import { redirect, permanentRedirect } from 'next/navigation'
import { ATTRIBUTION_DIMENSIONS, DEFAULT_DIMENSION } from '@/lib/admin/data'

export default async function AdminAttributionIndex({ searchParams }) {
  const query = await searchParams

  // Old style ?groupBy=landingPage, matched on the field name it used to carry
  const legacy = ATTRIBUTION_DIMENSIONS.find((d) => d.value === query?.groupBy)
  const dimension = legacy || DEFAULT_DIMENSION

  const carried = new URLSearchParams()
  for (const key of ['period', 'device', 'audience', 'sort']) {
    if (query?.[key]) carried.set(key, String(query[key]))
  }

  const search = carried.toString()
  const target = `/admin/attribution/${dimension.slug}${search ? `?${search}` : ''}`
  if (legacy) permanentRedirect(target)
  redirect(target)
}
