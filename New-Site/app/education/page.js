/**
 * Education index, /education. Lists the 170 articles 13 at a time, filtered by
 * an optional ?category= and paged by an optional ?page=.
 * Both are read on the server, so every filtered and paged view is a real url
 * with its own crawlable, shareable, reportable page.
 */

import { HeaderSpacer } from '@/components/layout/Header'
import CategoryFilter from '@/components/education/CategoryFilter'
import ArticleCard from '@/components/education/ArticleCard'
import CompactArticleLink from '@/components/education/CompactArticleLink'
import Pagination from '@/components/education/Pagination'
import ZipCta from '@/components/marketing/ZipCta'
import { getArticlePage, getCategories, getCategory } from '@/lib/content/education'

/**
 * Page title and description, which change with the active category.
 * Without this every one of the 10 filter views would share one title, and
 * search engines would treat them as duplicates of each other.
 */
export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const category = params?.category ? getCategory(params.category) : null

  if (!category) {
    return {
      title: 'Education | iHealth Plans',
      description: 'Articles on Medicare Advantage, Medigap, prescription drug coverage, and more.',
    }
  }

  return {
    title: `${category.name} | iHealth Plans`,
    description: `${category.count} articles on ${category.name} from iHealth Plans.`,
  }
}

/**
 * Renders the index.
 * The first row is deliberately not a uniform grid. 1 featured article with an
 * image spans 2 columns, and 3 text only links stack beside it, which is what
 * lets the page open with 4 articles instead of 1.
 */
export default async function EducationPage({ searchParams }) {
  const params = await searchParams
  const categorySlug = params?.category || null
  const requestedPage = Number.parseInt(params?.page, 10) || 1

  const categories = getCategories()
  const activeCategory = categorySlug ? getCategory(categorySlug) : null
  const { articles, page, totalPages, total } = getArticlePage({
    categorySlug: activeCategory ? categorySlug : null,
    page: requestedPage,
  })

  // Slot 1 is the featured card, slots 2 to 4 are the compact column, and
  // everything after that fills the standard grid below.
  const [featured, ...rest] = articles
  const compact = rest.slice(0, 3)
  const remaining = rest.slice(3)

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <CategoryFilter categories={categories} activeSlug={activeCategory ? categorySlug : null} />

        <div className="w-full h-fit pt-14 pb-20 px-4 flex flex-col items-center justify-center">
          <div className="max-w-shell w-full mb-10 flex items-start md:items-center justify-between flex-col-reverse md:flex-row gap-6 md:gap-0">
            <h1 className="text-[clamp(36px,4.44vw,48px)] font-semibold text-ihealthBlue">
              {activeCategory ? activeCategory.name : 'Latest articles'}
            </h1>
            <p className="text-sm text-[#878F99]">
              {total} article{total === 1 ? '' : 's'}
              {totalPages > 1 ? `, page ${page} of ${totalPages}` : ''}
            </p>
          </div>

          {featured ? (
            <>
              <div className="max-w-shell w-full grid gap-10 grid-cols-1 ml:grid-cols-3">
                <div className="w-full flex flex-col items-start col-span-1 ml:col-span-2">
                  <ArticleCard article={featured} isFeatured />
                </div>

                <div className="w-full flex flex-col items-start">
                  {compact.map((article) => (
                    <CompactArticleLink key={article.slug} article={article} />
                  ))}
                </div>
              </div>

              {remaining.length > 0 && (
                <div className="max-w-shell w-full mt-14 grid gap-10 grid-cols-1 sm:grid-cols-2 ml:grid-cols-3">
                  {remaining.map((article) => (
                    <ArticleCard key={article.slug} article={article} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="max-w-shell w-full text-lg text-[#525B67]">
              No articles in this category yet.
            </p>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} categorySlug={activeCategory ? categorySlug : null} />

        <div className="w-full">
          <ZipCta />
        </div>
      </main>
    </>
  )
}
