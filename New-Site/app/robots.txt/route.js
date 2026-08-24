// /robots.txt
//
// A raw route rather than Next's generated robots, so the file can carry the
// authorship comment and so the disallow list is readable as text.

import { SHORT_NOTICE } from '@/lib/authorship'
import { SITE_URL } from '@/lib/siteConfig'

export const dynamic = 'force-static'
const DISALLOWED = ['/admin', '/api/', '/quote-health-plans?']

export function GET() {
  const body = `# ${SHORT_NOTICE}

User-agent: *
${DISALLOWED.map((path) => `Disallow: ${path}`).join('\n')}
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
