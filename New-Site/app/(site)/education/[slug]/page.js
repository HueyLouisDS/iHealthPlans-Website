/**
 * One education article, /education/[slug].
 *
 * All 170 of these were dead links until now. The index has always listed them
 * and every card pointed at a 404, which is the worst possible shape for a
 * content section, since search engines had already indexed the titles.
 *
 * Prerendered at build time from content/education/bodies, so an article is a
 * static file rather than a render on every request.
 */

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { HeaderSpacer } from '@/components/layout/Header'
import ArticleBody from '@/components/education/ArticleBody'
import ArticleCard from '@/components/education/ArticleCard'
import CategoryChip from '@/components/education/CategoryChip'
import ZipCta from '@/components/marketing/ZipCta'
import OfficeStatusCta from '@/components/marketing/OfficeStatusCta'
import CallLink from '@/components/tracking/CallLink'
import { PHONE_NUMBER } from '@/lib/siteConfig'
import { getArticle, getArticleBody, getAllSlugs, getRelatedArticles } from '@/lib/content/education'

/**
 * Prerenders all 170 articles.
 * They come from a fixed JSON file with no runtime source, so there is nothing
 * to gain by rendering them on demand and a slow first visit to lose.
 */
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

/**
 * Per article metadata.
 * The description is the one written for the article rather than a truncation
 * of its first paragraph, which is what the old site published and what search
 * results already show.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params
  const article = getArticle(slug)

  if (!article) return { title: 'Article not found | iHealth Plans' }

  return {
    title: `${article.title} | iHealth Plans`,
    description: article.description,
    alternates: { canonical: `/education/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.date,
      images: [{ url: article.image }],
    },
  }
}

/**
 * Chevron between breadcrumb links.
 */
function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-3.5 h-3.5 flex-shrink-0"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Small calendar glyph beside the date, matching the cards.
 */
function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-4 h-4 text-ihealthGreen"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  )
}

export default async function ArticlePage({ params }) {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) notFound()

  const body = getArticleBody(slug)
  const related = getRelatedArticles(slug)

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <article className="w-full h-fit pt-10 pb-20 px-4 flex flex-col items-center">
          <nav
            aria-label="Breadcrumb"
            className="max-w-[900px] w-full flex items-center gap-2.5 text-sm font-semibold text-[#A1A8B2] mb-8"
          >
            <Link href="/education" className="hover:underline hidden sm:block">
              Education
            </Link>
            <span className="hidden sm:block">
              <Chevron />
            </span>
            <Link href={`/education?category=${article.categorySlug}`} className="hover:underline flex-shrink-0">
              {article.category}
            </Link>
            <Chevron />
            {/* The current page is not a link. A breadcrumb whose last item
                links to the page you are on is a control that does nothing. */}
            <span className="text-[#525B67] line-clamp-1" aria-current="page">
              {article.title}
            </span>
          </nav>

          <Image
            src={article.image}
            alt=""
            width={1792}
            height={1024}
            priority
            sizes="(min-width: 940px) 900px, 100vw"
            className="max-w-[900px] w-full h-[clamp(220px,32vw,360px)] object-cover rounded-md"
          />

          <header className="max-w-[900px] w-full mt-10">
            <CategoryChip name={article.category} />

            <h1 className="text-[clamp(30px,3.88vw,42px)] font-semibold text-ihealthBlue mt-5 mb-4 text-balance">
              {article.title}
            </h1>

            <div className="flex items-center gap-4 flex-wrap text-sm text-[#505258]">
              <span className="flex items-center gap-1.5">
                <CalendarIcon />
                <time dateTime={article.date}>{article.displayDate}</time>
              </span>
              {body && <span>{body.minutes} min read</span>}
            </div>
          </header>

          <div className="max-w-[900px] w-full mt-10">
            {body ? (
              <ArticleBody blocks={body.blocks} />
            ) : (
              /* A content gap rather than a crash. Better to say the text is
                 missing than to render a title over an empty page. */
              <p className="text-lg text-[#525B67]">
                This article is not available right now. Call us on{' '}
                <CallLink location="articleMissingBody" className="text-ihealthGreen font-semibold hover:underline">
                  {PHONE_NUMBER}
                </CallLink>{' '}
                and we will answer the question directly.
              </p>
            )}
          </div>

          {/* Someone who read to the end has a question, so the ask goes here
              rather than beside the body. Hours aware, because the line is
              staffed 42.5 hours a week and a phone only cta is a dead end for
              the other 125. */}
          <aside className="max-w-[900px] w-full mt-14 p-6 md:p-8 rounded-lg bg-ihealthGreen/10 flex flex-col gap-5">
            <div>
              <p className="text-[clamp(18px,2vw,22px)] font-semibold text-ihealthBlue">
                Questions about your own coverage?
              </p>
              <p className="text-base text-[#525B67] mt-1">
                Talk to a licensed agent about the plans available where you live.
              </p>
            </div>

            <OfficeStatusCta location="articleFooterCta" tone="light" />
          </aside>
        </article>

        {related.length > 0 && (
          <section className="w-full h-fit pb-20 px-4 flex flex-col items-center">
            <div className="max-w-shell w-full">
              <h2 className="text-[clamp(24px,2.77vw,30px)] font-semibold text-ihealthBlue mb-10">
                Keep reading
              </h2>

              <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 ml:grid-cols-3">
                {related.map((other) => (
                  <ArticleCard key={other.slug} article={other} />
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="w-full">
          <ZipCta />
        </div>
      </main>
    </>
  )
}
