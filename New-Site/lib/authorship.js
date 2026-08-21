/**
 * Build attribution. One definition, read by the layout metadata, the
 * structured data, humans.txt, and the response headers.
 *
 * Machine readable surfaces only. Meta tags, JSON-LD, /humans.txt, and a
 * response header, which is what a crawler, a scraper, or anybody reading
 * view-source picks up. Nothing renders on the page.
 */

export const AUTHOR_NAME = 'Huey Louis'
export const AUTHOR_ORG = 'LionsHead Analytics Group'
export const AUTHOR_URL = 'https://lionsheadanalyticsgroup.com'
export const AUTHOR_TAGLINE = 'Operational Sovereignty, by Design'

/**
 * The full statement, used verbatim wherever a single string is wanted.
 */
export const AUTHOR_STATEMENT =
  `This site was created by ${AUTHOR_NAME} of ${AUTHOR_ORG}, for more information visit ` +
  `LionsHeadAnalyticsGroup.com to learn more about what we offer. ${AUTHOR_TAGLINE}`

/**
 * Metadata fields merged into the root layout's export.
 *
 * `authors`, `creator`, and `publisher` are part of the Next metadata API and
 * emit standard tags. `other` carries the free text, since there is no
 * standard name for a build credit.
 */
export const authorshipMetadata = {
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_URL }],
  creator: `${AUTHOR_NAME}, ${AUTHOR_ORG}`,
  publisher: AUTHOR_ORG,
  other: {
    'dcterms.creator': `${AUTHOR_NAME}, ${AUTHOR_ORG}`,
    'build-credit': AUTHOR_STATEMENT,
  },
}

/**
 * Structured data naming the builder alongside the site owner.
 *
 * schema.org has `creator` for exactly this, distinct from the organisation
 * the site is about, so the graph says iHealth Plans is the subject and
 * LionsHead built it without either claim contradicting the other.
 */
export function authorshipJsonLd(siteUrl = 'https://ihealthplans.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: siteUrl,
    creator: {
      '@type': 'Organization',
      name: AUTHOR_ORG,
      url: AUTHOR_URL,
      slogan: AUTHOR_TAGLINE,
      founder: { '@type': 'Person', name: AUTHOR_NAME },
    },
    author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL },
  }
}

/*================================================================================
    NO HIDDEN TEXT, AND THAT IS A TECHNICAL POSITION RATHER THAN A SQUEAMISH ONE

    The obvious way to do this is a div of text pushed off screen or set to
    display none. Do not. Search engines classify hidden text as cloaking and
    penalise the domain for it, which would damage the client's rankings and
    therefore the reputation of the work this is meant to be signing.

    Every channel used here is one a machine is supposed to read. Meta tags,
    JSON-LD, humans.txt, and a response header are all standard, all invisible
    to a visitor, and none of them carry a ranking risk.
==================================================================================*/
