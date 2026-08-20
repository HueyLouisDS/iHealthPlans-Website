/**
 * Layout for the admin area.
 * Its job is to keep the admin pages out of search results and away from the
 * public site's header and footer. The sign in page renders through here too,
 * which is why there is no auth check at this level.
 */

export const metadata = {
  title: 'Reporting | iHealth Plans',
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Nothing but a passthrough.
 * The public Header and Footer come from the root layout, so admin pages
 * deliberately render their own full screen chrome instead of inheriting the
 * marketing site's.
 */
export default function AdminLayout({ children }) {
  return children
}
