/**
 * /sitemap.xml
 *
 * Built from the content modules rather than a hand kept list, so an article
 * added or pulled is in or out of the sitemap without anybody remembering to
 * edit this file. A sitemap that lists a 404 is worse than no sitemap.
 */

import { SHORT_NOTICE } from '@/lib/authorship'
import { SITE_URL } from '@/lib/siteConfig'
import { getAllArticles, getCategories } from '@/lib/content/education'
import { getAllProducts } from '@/lib/content/products'
import { getAllLegalPages } from '@/lib/content/legal'
import { ENROLLMENT_PAGES } from '@/lib/content/enrollment'

export const dynamic = 'force-static'

/*
 Priority is a hint and search engines mostly ignore it, but it costs nothing
 and it documents what this business considers important. The product pages
 sell, the articles bring people in, the legal pages exist because they must.
*/
const PRIORITY = {
  home: '1.0',
  product: '0.9',
  enrollment: '0.8',
  index: '0.7',
  article: '0.6',
  legal: '0.3',
}

/**
 * One <url> entry. Dates are optional, since a wrong lastmod is worse than
 * none, and most of these pages have no meaningful modification date.
 */
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

/**
 * Every indexable url on the site.
 *
 * The admin area and the api routes are absent on purpose, matching the
 * disallow list in robots.txt. A sitemap that lists a path robots.txt blocks
 * is a contradiction search engines report as an error.
 */
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
    /* ISO date only, which is what the sitemap spec wants for a day precision value */
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
