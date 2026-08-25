// /robots.txt
//
// A raw route rather than Next's generated robots, so the file can carry the
// authorship comment and so the disallow list is readable as text.
//
// Host aware, because a preview or *.vercel.app deploy serves the same pages
// and must not invite a crawler to index a second copy of the site.

import { SHORT_NOTICE } from '@/lib/authorship'
import { SITE_URL, CANONICAL_HOST } from '@/lib/siteConfig'

// Dynamic, since the answer depends on the host the request arrived on
export const dynamic = 'force-dynamic'

const DISALLOWED = ['/admin', '/api/', '/quote-health-plans?']

function textResponse(body) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

export function GET(request) {
  const host = request.headers.get('host') || ''

  /*
   Anything that is not the live domain is a copy. Middleware already sends
   X-Robots-Tag on these, which is the control that actually prevents
   indexing. This is the second layer, and it also stops the copy publishing
   a sitemap.
  */
  if (host !== CANONICAL_HOST) {
    return textResponse(`# ${SHORT_NOTICE}
# Not the live site. Nothing here is for indexing.

User-agent: *
Disallow: /
`)
  }

  return textResponse(`# ${SHORT_NOTICE}

User-agent: *
${DISALLOWED.map((path) => `Disallow: ${path}`).join('\n')}
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`)
}
