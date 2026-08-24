// /humans.txt, the convention for naming who built a site. Sits alongside
// robots.txt, found by crawlers and developers rather than visitors.

import { FULL_NOTICE, SHORT_NOTICE, AUTHOR_URL } from '@/lib/authorship'

export const dynamic = 'force-static'

export function GET() {
  const body = `/* TEAM */
${FULL_NOTICE}

// CONTACT
${SHORT_NOTICE}
Location: Boca Raton, Florida
Site: ${AUTHOR_URL}

// SITE
Standards: HTML5, CSS3, JSON-LD
Components: Next.js, React, Tailwind CSS
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
