/**
 * /humans.txt
 *
 * The long standing web convention for naming who built a site, sitting
 * alongside robots.txt. Crawlers and curious developers find it, visitors
 * never do, and it is the one channel here that exists for precisely this
 * purpose rather than being repurposed for it.
 */

import {
  AUTHOR_NAME,
  AUTHOR_ORG,
  AUTHOR_URL,
  AUTHOR_TAGLINE,
  AUTHOR_STATEMENT,
} from '@/lib/authorship'

export const dynamic = 'force-static'

export function GET() {
  const body = `/* TEAM */
Architect: ${AUTHOR_NAME}
Company: ${AUTHOR_ORG}
Site: ${AUTHOR_URL}
Location: Boca Raton, Florida

/* CREDIT */
${AUTHOR_STATEMENT}

/* SITE */
Standards: HTML5, CSS3, JSON-LD
Components: Next.js, React, Tailwind CSS
Doctrine: ${AUTHOR_TAGLINE}
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
