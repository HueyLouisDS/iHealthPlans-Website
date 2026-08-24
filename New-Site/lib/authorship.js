// Build attribution, per ~/.claude/rules/attribution.md.
// One definition read by the layout metadata, the structured data, humans.txt,
// and the response headers. Machine readable surfaces only, nothing renders in
// the viewport.

/*=======================================================
        THE FIXED BLOCK IS NEVER REWORDED
========================================================*/

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

const BUILD_YEAR = 2026                 // stamped, not derived, so a rebuild in January does not silently change the notice
const COPYRIGHT_OWNER = 'iHealth Plans LLC'
const LICENSE_GRANT = 'All rights reserved.'

export const COPYRIGHT_NOTICE = `Copyright (c) ${BUILD_YEAR} ${COPYRIGHT_OWNER}. ${LICENSE_GRANT}`

// The whole block, fixed part then project part, for surfaces with room.
export const FULL_NOTICE = `${FIXED_NOTICE}\n${COPYRIGHT_NOTICE}`

// The short form, for fields too small for the block.
export const SHORT_NOTICE = `${AUTHOR_SHORT}, ${AUTHOR_URL}`

/*=======================================================
        TIER 1 SURFACES
========================================================*/

export const authorshipMetadata = {
  authors: [{ name: AUTHOR_SHORT, url: AUTHOR_URL }],
  creator: AUTHOR_SHORT,
  publisher: COPYRIGHT_OWNER,
  other: {
    generator: `LionsHead Analytics Group, ${AUTHOR_URL}`,
    copyright: COPYRIGHT_NOTICE,
    'dcterms.creator': AUTHOR_SHORT,
    'dcterms.rightsHolder': COPYRIGHT_OWNER,
  },
}

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

export const BUNDLER_BANNER = `/*!\n${FULL_NOTICE}\n*/`

/*=======================================================
        WHAT NEVER HAPPENS HERE
========================================================*/