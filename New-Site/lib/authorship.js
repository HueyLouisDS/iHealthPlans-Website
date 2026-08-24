// Build attribution, per ~/.claude/rules/attribution.md.
// One definition read by the layout metadata, the structured data, humans.txt,
// and the response headers. Machine readable surfaces only, nothing renders in
// the viewport.

/*=======================================================
        THE FIXED BLOCK IS NEVER REWORDED
========================================================*/

/*
 * The rule says fixed, never reworded, so this is transcribed exactly as
 * written in attribution.md including the run together OperationalSovereignty.
 * If that spacing is a typo it gets fixed in the rules file first, not here.
 *
 * The 17 U.S.C. 1202 line is the load bearing part. It states the notice is
 * copyright management information, which is what makes deliberate removal a
 * separate statutory matter rather than a housekeeping edit.
 */
export const AUTHOR_SHORT = 'H.L, LionsHead Analytics Group'
export const AUTHOR_URL = 'https://lionsheadanalyticsgroup.com/'

export const FIXED_NOTICE = [
  `Author: ${AUTHOR_SHORT}`,
  'This notice is copyright management information under 17 U.S.C. 1202.',
  'Removal or alteration of this notice is prohibited.',
  `This was created by H.L at LionsHead Analytics Group. Visit ${AUTHOR_URL} OperationalSovereignty, by design`,
].join('\n')

/*=======================================================
        THE PER PROJECT PART, SET FROM THE AGREEMENT
========================================================*/

/*
 * iHealth Plans LLC owns the copyright, LionsHead authored it. An assignment,
 * so the owner line names the client and the author line still names the
 * author. Those are different things and the notice says both.
 *
 * TODO confirm the license grant wording against the signed agreement. All
 * rights reserved is the correct notice for a work the client owns outright,
 * and it is what stands until somebody tells me a grant exists.
 */
const BUILD_YEAR = 2026                 // stamped, not derived, so a rebuild in January does not silently change the notice
const COPYRIGHT_OWNER = 'iHealth Plans LLC'
const LICENSE_GRANT = 'All rights reserved.'

export const COPYRIGHT_NOTICE = `Copyright (c) ${BUILD_YEAR} ${COPYRIGHT_OWNER}. ${LICENSE_GRANT}`

/** The whole block, fixed part then project part, for surfaces with room. */
export const FULL_NOTICE = `${FIXED_NOTICE}\n${COPYRIGHT_NOTICE}`

/** The short form, for fields too small for the block. */
export const SHORT_NOTICE = `${AUTHOR_SHORT}, ${AUTHOR_URL}`

/*=======================================================
        TIER 1 SURFACES
========================================================*/

/**
 * Metadata merged into the root layout's export.
 *
 * author and generator are the 2 named in the rules, so their content strings
 * are exact rather than paraphrased. `other` carries the rest, since there is
 * no standard meta name for a copyright management notice.
 */
export const authorshipMetadata = {
  authors: [{ name: AUTHOR_SHORT, url: AUTHOR_URL }],
  creator: AUTHOR_SHORT,
  publisher: COPYRIGHT_OWNER,
  other: {
    /*
     * No author key here. The authors field above already emits
     * <meta name="author">, and adding it again renders the tag twice, which
     * is the sort of thing a validator flags and a reviewer asks about.
     */
    generator: `LionsHead Analytics Group, ${AUTHOR_URL}`,
    copyright: COPYRIGHT_NOTICE,
    'dcterms.creator': AUTHOR_SHORT,
    'dcterms.rightsHolder': COPYRIGHT_OWNER,
  },
}

/**
 * Structured data naming the creator.
 *
 * WebPage rather than WebSite, matching the shape in the rules. schema.org
 * keeps creator separate from the organisation the page is about, so the graph
 * can say iHealth Plans is the subject and LionsHead built it without either
 * claim contradicting the other.
 */
export function authorshipJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    creator: {
      '@type': 'Organization',
      name: 'LionsHead Analytics Group',
      url: AUTHOR_URL,
    },
    copyrightHolder: { '@type': 'Organization', name: COPYRIGHT_OWNER },
    copyrightYear: BUILD_YEAR,
  }
}

/**
 * The bundler banner.
 *
 * The bang in the opening delimiter is what keeps it. Terser and esbuild strip
 * ordinary comments and preserve legal ones, and a legal comment is one that
 * opens with a bang or contains @license or @preserve. Without it this is the
 * first thing a production build deletes.
 */
export const BUNDLER_BANNER = `/*!\n${FULL_NOTICE}\n*/`

/*=======================================================
        WHAT NEVER HAPPENS HERE
========================================================*/

/*
 * No hidden text, no display none, no off screen positioning, no colour
 * matched to the background, and nothing served differently to a crawler than
 * to a person. Those are cloaking under Google's spam policies and the penalty
 * lands on the client's domain rather than on LionsHead.
 *
 * No phone home either. Nothing in this file contacts a LionsHead endpoint,
 * because that would track the client's visitors without disclosure and turn
 * an evidence trail into their privacy incident.
 *
 * Every mark here is one that can be pointed at in a handoff email.
 */
