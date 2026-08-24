// /sitemap.xml
//
// Built from the content modules rather than a hand kept list, so an article
// added or pulled is in or out of the sitemap without anybody remembering to
// edit this file. A sitemap that lists a 404 is worse than no sitemap.

import { SHORT_NOTICE } from '@/lib/authorship'
import { SITE_URL } from '@/lib/siteConfig'
import { getAllArticles, getCategories } from '@/lib/content/education'
import { getAllProducts } from '@/lib/content/products'
import { getAllLegalPages } from '@/lib/content/legal'
import { ENROLLMENT_PAGES } from '@/lib/content/enrollment'

export const dynamic = 'force-static'
const PRIORITY = {
  home: '1.0',
  product: '0.9',
  enrollment: '0.8',
  index: '0.7',
  article: '0.6',
  legal: '0.3',
}

function entry(path, priority, lastModified = null) {
  const loc = `${SITE_URL}${path}`

  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastModified ? `    <lastmod>${lastModified}</lastmod>` : null,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n')
}

function urls() {
  const all = [entry('/', PRIORITY.home)]

  for (const product of getAllProducts()) {
    all.push(entry(`/${product.slug}`, PRIORITY.product))
  }

  for (const slug of Object.keys(ENROLLMENT_PAGES)) {
    all.push(entry(`/${slug}`, PRIORITY.enrollment))
  }

  all.push(entry('/education', PRIORITY.index))

  for (const category of getCategories()) {
    all.push(entry(`/education/category/${category.slug}`, PRIORITY.index))
  }

  for (const article of getAllArticles()) {
    // ISO date only, which is what the sitemap spec wants for a day precision value
    const lastModified = article.date ? String(article.date).slice(0, 10) : null
    all.push(entry(`/education/${article.slug}`, PRIORITY.article, lastModified))
  }

  for (const page of getAllLegalPages()) {
    all.push(entry(`/${page.slug}`, PRIORITY.legal))
  }

  all.push(entry('/careers', PRIORITY.legal))

  return all
}

export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<!-- ${SHORT_NOTICE} -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls().join('\n')}
</urlset>
`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
