/**
 * Next configuration.
 * Deliberately close to empty. Nothing platform specific goes in here, since
 * the deploy target is still an open question and a bare config is the one
 * thing that ports cleanly between Vercel, a Node host, or anywhere else.
 */

/*
 Articles pulled from the education section, redirected rather than 404ed so
 their ranking and inbound links pass to the target.

 The Medigap articles stay. The site goes to Spark for compliance review as it
 stands and the reviewer rules on those.
*/
const REMOVED_ARTICLES = [
  // Humana, removed because it is not on the carrier contract list
  ['comprehensive-humana-advantage-plan-overview', '/medicare-advantage'],
  ['comprehensive-humana-and-medicare-coverage', '/medicare-advantage'],
  ['detailed-humana-medicare-plans', '/medicare-advantage'],
  ['exploring-humana-medicare-replacement-plans', '/medicare-advantage'],
  ['humana-advantage-plan-overview', '/medicare-advantage'],
  ['humana-and-medicare-coverage', '/medicare-advantage'],
  ['humana-medicare-advantage-benefits', '/medicare-advantage'],
  ['humana-medicare-advantage-plans-benefits', '/medicare-advantage'],
  ['humana-medicare-advantage-plans-overview', '/medicare-advantage'],
  ['humana-medicare-replacement-plans', '/medicare-advantage'],
  ['overview-of-humana-medicare-advantage-plans', '/medicare-advantage'],
  ['understanding-humana-medicare-plans', '/medicare-advantage'],

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
