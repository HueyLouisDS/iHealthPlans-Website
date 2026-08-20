/**
 * Shared template for the 4 Medicare product landing pages.
 * All 4 render through this so the structure, the conversion path, and the
 * compliance register stay identical across them. The differences between the
 * pages live entirely in lib/content/products.js.
 */

import Link from 'next/link'
import { HeaderSpacer } from '@/components/layout/Header'
import Accordion from '@/components/ui/Accordion'
import PageHero from '@/components/ui/PageHero'
import ZipCta from '@/components/marketing/ZipCta'
import { getProduct } from '@/lib/content/products'
import { ENROLLMENT_WINDOWS } from '@/lib/content/enrollment'

/**
 * Green tick used through the key points list.
 */
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-ihealthGreen flex-shrink-0 mt-1" aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Narrative section, a heading and 1 or more paragraphs.
 */
function Explainer({ content }) {
  return (
    <section className="w-full h-fit py-16 px-4">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-start gap-6">
        <h2 className="text-4xl text-ihealthBlue">{content.heading}</h2>
        {content.body.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-lg">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  )
}

/**
 * The 4 headline benefits, as a ticked grid.
 * Sits high on the page because it is what a visitor scanning for relevance
 * actually reads before deciding whether to keep going.
 */
function KeyPoints({ product }) {
  return (
    <section className="w-full h-fit pb-8 px-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 nm:grid-cols-2 gap-x-16 gap-y-10">
        {product.keyPoints.map((point) => (
          <div key={point.title} className="w-full flex items-start gap-4">
            <CheckIcon />
            <div className="flex flex-col items-start gap-2">
              <h3 className="font-bold text-xl text-ihealthBlue">{point.title}</h3>
              <p className="text-lg">{point.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Term and detail list, used for plan types and cost breakdowns.
 * A definition list rather than a table, because these are label and
 * explanation pairs and a table would imply a comparison that is not there.
 */
function TermList({ content }) {
  return (
    <section className="w-full h-fit py-16 px-4">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-start gap-8">
        <h2 className="text-4xl text-ihealthBlue">{content.heading}</h2>
        <dl className="w-full divide-y divide-gray-900/10">
          {content.items.map((item) => (
            <div key={item.term} className="py-5 grid grid-cols-1 nm:grid-cols-[240px_1fr] gap-2 nm:gap-8">
              <dt className="font-bold text-lg text-ihealthBlue">{item.term}</dt>
              <dd className="text-lg">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/**
 * Eligibility bullets on a tinted panel, so the qualifying criteria are
 * visually separated from the explanatory copy around them.
 */
function Eligibility({ content }) {
  return (
    <section className="w-full h-fit py-16 px-4">
      <div className="w-full max-w-4xl mx-auto bg-[#f7f7f7] rounded-xl p-10 flex flex-col items-start gap-6">
        <h2 className="text-4xl text-ihealthBlue">{content.heading}</h2>
        <ul className="w-full flex flex-col items-start gap-4">
          {content.items.map((item) => (
            <li key={item.slice(0, 40)} className="w-full flex items-start gap-4">
              <CheckIcon />
              <span className="text-lg">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/**
 * The enrollment windows, shared across all products and the enrollment
 * pages, read from lib/content/enrollment.js.
 * Repeated on every product page on purpose. Timing is the single most common
 * reason someone calls, and it should never be more than 1 scroll away.
 */
function EnrollmentWindows() {
  return (
    <section className="w-full h-fit py-16 px-4">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-start gap-8">
        <h2 className="text-4xl text-ihealthBlue">When you can enroll</h2>
        <div className="w-full grid grid-cols-1 nm:grid-cols-2 gap-8">
          {ENROLLMENT_WINDOWS.map((window) => (
            <div key={window.name} className="w-full flex flex-col items-start gap-2 border-l-2 border-l-ihealthGreen pl-5">
              <h3 className="font-bold text-xl text-ihealthBlue">{window.name}</h3>
              <p className="text-sm font-semibold uppercase tracking-[1.2px] text-ihealthGreen">
                {window.dates}
              </p>
              <p className="text-lg">{window.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Links to the other 3 products.
 * These 4 pages are genuinely alternatives to one another, and someone who
 * lands on the wrong one should be able to reach the right one without
 * going back to search.
 */
function RelatedProducts({ product }) {
  return (
    <section className="w-full h-fit py-16 px-4">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-start gap-8">
        <h2 className="text-4xl text-ihealthBlue">Other coverage options</h2>
        {/* Column count follows the number of cards. With only Medicare
            Advantage and D-SNP left, a fixed 3 column grid would leave a
            single card stranded at a third of the width */}
        <div
          className={`w-full grid gap-8 grid-cols-1 ${
            product.related.length >= 3 ? 'nm:grid-cols-3' : product.related.length === 2 ? 'nm:grid-cols-2' : 'nm:max-w-md'
          }`}
        >
          {product.related.map((slug) => {
            const related = getProduct(slug)
            if (!related) return null

            return (
              <Link
                key={slug}
                href={`/${slug}`}
                className="w-full flex flex-col items-start gap-3 border rounded-xl p-6 hover:border-ihealthGreen transition-colors group"
              >
                <span className="text-xs font-bold uppercase tracking-[1.2px] text-ihealthGreen">
                  {related.eyebrow}
                </span>
                <h3 className="font-bold text-xl text-ihealthBlue group-hover:underline">
                  {related.name}
                </h3>
                <p className="text-base text-[#505258] line-clamp-3">{related.intro}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/**
 * Renders a complete product page from its data.
 * Section order is a funnel, what it is, why it matters, what it costs, who
 * qualifies, when to act, then the questions that stop people converting.
 */
export default function ProductPage({ slug }) {
  const product = getProduct(slug)
  if (!product) return null

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <PageHero
          eyebrow={product.eyebrow}
          headline={product.headline}
          intro={product.intro}
          callLocation={`productHero:${product.slug}`}
        />

        <div className="w-full max-w-6xl mx-auto px-4 pt-16">
          <KeyPoints product={product} />
        </div>

        <Explainer content={product.whatItIs} />
        <TermList content={product.planTypes} />
        <TermList content={product.costs} />
        <Eligibility content={product.eligibility} />
        <EnrollmentWindows />

        <section className="w-full h-fit py-16 px-4">
          <div className="mx-auto max-w-4xl w-full flex flex-col items-center">
            <h2 className="text-4xl text-gray-900">Frequently asked questions</h2>
            <Accordion items={product.faqs} />
          </div>
        </section>

        <RelatedProducts product={product} />
        <ZipCta />
      </main>
    </>
  )
}
