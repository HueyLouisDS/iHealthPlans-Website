/**
 * /admin/attribution, which is not a page.
 *
 * The breakdowns live at /admin/attribution/[dimension]. This exists so the
 * bare path, the sidebar link, and every url written before the grouping moved
 * into the route still land somewhere useful instead of a 404.
 *
 * The query string is carried across, so an old link that named a period or a
 * sort keeps them. An old ?groupBy= is honoured too rather than dropped, since
 * that parameter was live long enough to end up in somebody's bookmarks.
 */

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

  // 308 only for the old parameter form, which is genuinely gone. The bare
  // path stays a temporary redirect, because it is the sidebar's href and
  // teaching a browser to permanently rewrite it would be hard to undo.
  if (legacy) permanentRedirect(target)
  redirect(target)
}
