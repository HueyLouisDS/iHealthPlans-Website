// Data access for the education section.
// Reads the JSON index produced by scripts/extractEducationIndex.mjs and the
// per article bodies produced by scripts/extractEducationBodies.mjs, which are
// the only things that know about the old site. Everything downstream of here
// treats articles as plain data, so swapping the source for Sanity later means
// rewriting this file and nothing else.

import fs from 'node:fs'
import path from 'node:path'
import articles from '@/content/education/articles.json'

const BODIES_DIR = path.join(process.cwd(), 'content', 'education', 'bodies')
const bodyCache = new Map()
export const ARTICLES_PER_PAGE = 13
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

export function getAllArticles() {
  return articles
}

export function getCategories() {
  const bySlug = new Map()

  for (const article of articles) {
    const existing = bySlug.get(article.categorySlug)
    if (existing) existing.count += 1
    else bySlug.set(article.categorySlug, { slug: article.categorySlug, name: article.category, count: 1 })
  }

  const ordered = CATEGORY_ORDER.map((slug) => bySlug.get(slug)).filter(Boolean)
  const remainder = [...bySlug.values()].filter((c) => !CATEGORY_ORDER.includes(c.slug))

  return [...ordered, ...remainder]
}

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

export function getCategory(slug) {
  return getCategories().find((category) => category.slug === slug) || null
}

export function getArticle(slug) {
  return articles.find((article) => article.slug === slug) || null
}

export function getArticleBody(slug) {
  if (!getArticle(slug)) return null
  if (bodyCache.has(slug)) return bodyCache.get(slug)

  let body = null
  try {
    body = JSON.parse(fs.readFileSync(path.join(BODIES_DIR, `${slug}.json`), 'utf8'))
  } catch {
    body = null
  }

  bodyCache.set(slug, body)
  return body
}

export function getAllSlugs() {
  return articles.map((article) => article.slug)
}

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
