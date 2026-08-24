/**
 * Next configuration.
 * Deliberately close to empty. Nothing platform specific goes in here, since
 * the deploy target is still an open question and a bare config is the one
 * thing that ports cleanly between Vercel, a Node host, or anywhere else.
 */

/*
 Spun duplicates, the same article reworded under 2 slugs. Permanent, so
 search engines drop the old url and pass its ranking to the survivor rather
 than treating both as live and discounting each.

 The Medigap articles are NOT removed. The site goes to Spark for compliance
 review as it stands, and the reviewer rules on what comes out.
*/
const REMOVED_ARTICLES = [
  [
    'advantages-of-united-health-medicare-advantage',
    '/education/advantages-of-united-health-medicare-advantage-plans',
  ],
  [
    'benefits-of-united-health-medicare-advantage',
    '/education/benefits-of-united-health-medicare-advantage-plans',
  ],
  [
    'unitedhealthcare-group-medicare-advantage',
    '/education/unitedhealthcare-group-medicare-advantage-plans',
  ],
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Permanent redirects for content that has been pulled.
   * Without these the urls 404, which loses whatever ranking and inbound links
   * they had rather than passing them on.
   */
  async redirects() {
    return REMOVED_ARTICLES.map(([slug, destination]) => ({
      source: `/education/${slug}`,
      destination,
      permanent: true,
    }))
  },
}

export default nextConfig
