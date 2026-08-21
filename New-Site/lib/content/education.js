/**
 * Data access for the education section.
 * Reads the JSON index produced by scripts/extractEducationIndex.mjs and the
 * per article bodies produced by scripts/extractEducationBodies.mjs, which are
 * the only things that know about the old site. Everything downstream of here
 * treats articles as plain data, so swapping the source for Sanity later means
 * rewriting this file and nothing else.
 */

import fs from 'node:fs'
import path from 'node:path'
import articles from '@/content/education/articles.json'

// Bodies are read from disk one at a time rather than imported as a bundle.
// All 170 together are roughly 400KB of JSON, and an article page needs one.
const BODIES_DIR = path.join(process.cwd(), 'content', 'education', 'bodies')

// Parsed bodies, kept for the life of the process. The files never change at
// runtime, so re-reading and re-parsing on every request would buy nothing.
const bodyCache = new Map()

// The live site paginates at 13, confirmed from its own render payload rather
// than counted off the page. Changing this changes the featured row layout too,
// the first 4 slots are not interchangeable with the rest.
export const ARTICLES_PER_PAGE = 13

// Display order of the category filter, taken from the live site. It is not
// alphabetical and it is not by article count, so it has to be listed
// explicitly. Medicare Plans holds 114 of the 170 articles and still sits last.
const CATEGORY_ORDER = [
  'comprehensive-coverage-awareness',
  'long-term-care-planning',
  'medicare-insurance',
  'medicare-savings-programs',
  'medicare-advantage-consideration',
  'medigap-medicare-supplement-insurance-options',
  'prescription-drug-coverage',
  'telehealth-and-digital-access',
  'medicare-plans',
]

/**
 * Every article, newest first.
 * Already sorted by the extraction script, returned as is so callers do not
 * each re-sort 170 records.
 */
export function getAllArticles() {
  return articles
}

/**
 * The category filter list, in the site's own order, with counts.
 * Counts are not shown today but the filter is the obvious place to surface
 * them, and computing them here keeps the component free of data logic.
 */
export function getCategories() {
  const bySlug = new Map()

  for (const article of articles) {
    const existing = bySlug.get(article.categorySlug)
    if (existing) existing.count += 1
    else bySlug.set(article.categorySlug, { slug: article.categorySlug, name: article.category, count: 1 })
  }

  // Anything not in CATEGORY_ORDER still appears, appended, rather than
  // vanishing. A new category added in the CMS should show up without a code
  // change even though its position will be wrong until it is listed above.
  const ordered = CATEGORY_ORDER.map((slug) => bySlug.get(slug)).filter(Boolean)
  const remainder = [...bySlug.values()].filter((c) => !CATEGORY_ORDER.includes(c.slug))

  return [...ordered, ...remainder]
}

/**
 * One page of articles, optionally filtered to a category.
 * Page numbers are 1 based and clamped, so a hand typed ?page=999 lands on the
 * last real page instead of rendering an empty grid.
 */
export function getArticlePage({ categorySlug = null, page = 1 } = {}) {
  const filtered = categorySlug
    ? articles.filter((article) => article.categorySlug === categorySlug)
    : articles

  const totalPages = Math.max(1, Math.ceil(filtered.length / ARTICLES_PER_PAGE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const start = (currentPage - 1) * ARTICLES_PER_PAGE

  return {
    articles: filtered.slice(start, start + ARTICLES_PER_PAGE),
    total: filtered.length,
    totalPages,
    page: currentPage,
  }
}

/**
 * Looks up a single category by slug, for the page heading and metadata.
 * Returns null for an unknown slug so the caller can decide between falling
 * back to all articles and returning a 404.
 */
export function getCategory(slug) {
  return getCategories().find((category) => category.slug === slug) || null
}

/**
 * One article's metadata, or null if the slug is not one we publish.
 * Every caller that touches the filesystem goes through this first, which is
 * what makes the slug safe to put in a path below.
 */
export function getArticle(slug) {
  return articles.find((article) => article.slug === slug) || null
}

/**
 * One article's body blocks, or null when there is no body on disk.
 *
 * The slug is checked against the index before it reaches path.join, and never
 * used raw. A slug arrives from the url, and `../../../.env` joined onto a
 * content directory is a file read the visitor chose. Validating against a
 * fixed list is the only version of this that cannot be talked around.
 */
export function getArticleBody(slug) {
  if (!getArticle(slug)) return null
  if (bodyCache.has(slug)) return bodyCache.get(slug)

  let body = null
  try {
    body = JSON.parse(fs.readFileSync(path.join(BODIES_DIR, `${slug}.json`), 'utf8'))
  } catch {
    // A missing body is a content gap, not a crash. The page renders its
    // heading and image and says the article is unavailable.
    body = null
  }

  bodyCache.set(slug, body)
  return body
}

/**
 * Every article slug, for generateStaticParams.
 */
export function getAllSlugs() {
  return articles.map((article) => article.slug)
}

/**
 * Other articles worth reading after this one.
 *
 * Same category first, then whatever is newest, so a thin category still fills
 * the rail rather than showing 1 card and a gap. The article itself is always
 * excluded, which sounds obvious and is the bug every related rail ships with.
 */
export function getRelatedArticles(slug, limit = 3) {
  const article = getArticle(slug)
  if (!article) return []

  const sameCategory = articles.filter(
    (other) => other.slug !== slug && other.categorySlug === article.categorySlug
  )
  const rest = articles.filter(
    (other) => other.slug !== slug && other.categorySlug !== article.categorySlug
  )

  return [...sameCategory, ...rest].slice(0, limit)
}
