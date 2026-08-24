/**
 * Next configuration.
 * Deliberately close to empty. Nothing platform specific goes in here, since
 * the deploy target is still an open question and a bare config is the one
 * thing that ports cleanly between Vercel, a Node host, or anywhere else.
 */

/*
 Articles removed in content triage. Permanent, so search engines drop the old
 url and pass its ranking to the target rather than treating both as live.

 The 7 Medigap pieces went because the agency sells MA, PDP and D-SNP only, so
 they pulled search traffic no agent could serve. The 3 pairs were spun
 duplicates, the same article reworded under 2 slugs.
*/
const REMOVED_ARTICLES = [
  ['navigating-medicare-supplement-plans', '/medicare-advantage'],
  ['demystifying-medigap-costs-budgeting-for-comprehensive-coverage', '/medicare-advantage'],
  ['a-deep-dive-into-medigap-plans-unraveling-the-options-for-comprehensive-coverage', '/medicare-advantage'],
  ['understanding-medigap-a-comprehensive-guide-to-supplemental-insurance', '/medicare-advantage'],
  ['navigating-changes-in-medigap-plans-adapting-to-your-health-needs', '/medicare-advantage'],
  ['beyond-the-basics-additional-benefits-of-medigap-plans', '/medicare-advantage'],
  ['navigating-medigap-options-an-in-depth-overview-of-medicare-supplement-insurance', '/medicare-advantage'],

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
