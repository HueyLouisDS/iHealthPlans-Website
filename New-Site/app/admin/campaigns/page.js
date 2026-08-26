// /admin/campaigns, a redirect rather than a page. The channel views live at
// /admin/campaigns/[channel]. Carries the query string across so a bookmarked
// period or sort survives the hop.

import { redirect } from 'next/navigation'
import { DEFAULT_CHANNEL } from '@/lib/admin/data'

export default async function AdminCampaignsIndex({ searchParams }) {
  const query = await searchParams

  const carried = new URLSearchParams()
  for (const key of ['period', 'sort']) {
    if (query?.[key]) carried.set(key, String(query[key]))
  }

  const search = carried.toString()
  redirect(`/admin/campaigns/${DEFAULT_CHANNEL.slug}${search ? `?${search}` : ''}`)
}
