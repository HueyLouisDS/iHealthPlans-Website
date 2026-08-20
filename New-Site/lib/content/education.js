/**
 * Data access for the education section.
 * Reads the JSON index produced by scripts/extractEducationIndex.mjs, which is
 * the only thing that knows about the old site. Everything downstream of here
 * treats articles as plain data, so swapping the source for Sanity later means
 * rewriting this file and nothing else.
 */

import articles from '@/content/education/articles.json'

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
