/**
 * Shared template for the legal and compliance notices.
 * Plain, high contrast, generous line height, and a contents list at the top.
 * These pages get read by people who are annoyed, worried, or acting on
 * somebody else's behalf, so findability beats visual interest.
 *
 * Any content string beginning "TO CONFIRM:" renders as a visible amber block
 * rather than as body copy. That is deliberate. An unresolved legal notice
 * should be impossible to publish without somebody seeing it.
 */

import Link from 'next/link'
import { HeaderSpacer } from '@/components/layout/Header'
import CallLink from '@/components/tracking/CallLink'
import { getLegalPage, LEGAL_LAST_UPDATED } from '@/lib/content/legal'
import { PHONE_NUMBER, PHONE_TTY } from '@/lib/siteConfig'

const CONFIRM_PREFIX = 'TO CONFIRM:'

/**
 * Turns a heading into an anchor id, so the contents list can link to it.
 */
function toAnchorId(heading) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Highlighted block for an unresolved item.
 * Amber rather than red, since these are open questions rather than errors,
 * but loud enough that nobody ships the page by accident.
 */
function ToConfirm({ text }) {
  return (
    <div className="w-full my-4 border-l-4 border-l-amber-500 bg-amber-50 px-5 py-4 rounded-r-lg">
      <p className="text-sm font-bold uppercase tracking-[1.2px] text-amber-800 mb-1">
        To confirm before publishing
      </p>
      <p className="text-lg text-amber-900">{text.slice(CONFIRM_PREFIX.length).trim()}</p>
    </div>
  )
}

/**
 * Renders one paragraph, or a ToConfirm block if that is what it is.
 */
function Paragraph({ text }) {
  if (text.startsWith(CONFIRM_PREFIX)) return <ToConfirm text={text} />
  return <p className="text-lg leading-relaxed">{text}</p>
}

/**
 * Contact rows. The phone entry is a real CallLink rather than plain text,
 * because these pages carry the number that a person in difficulty will use,
 * and a call from a legal notice is a meaningfully different signal from a
 * call off a landing page.
 */
function Contacts({ items, slug }) {
  return (
    <dl className="w-full my-4 divide-y divide-gray-900/10 border-y border-gray-900/10">
      {items.map((item) => (
        <div key={item.label} className="py-4 grid grid-cols-1 nm:grid-cols-[160px_1fr] gap-1 nm:gap-6">
          <dt className="font-bold text-lg text-ihealthBlue">{item.label}</dt>
          <dd className="text-lg break-words">
            {item.value === 'PHONE_NUMBER_WITH_TTY' ? (
              <CallLink location={`legal:${slug}`} className="text-[#105fa8] font-semibold hover:underline">
                {PHONE_NUMBER} ({PHONE_TTY})
              </CallLink>
            ) : item.value.startsWith(CONFIRM_PREFIX) ? (
              <ToConfirm text={item.value} />
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Renders a complete notice from its data.
 * Contents list first, then the sections, each with its own anchor.
 */
export default function LegalPage({ slug }) {
  const page = getLegalPage(slug)
  if (!page) return null

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <div className="w-full bg-[#f7f7f7] border-b">
          <div className="w-full max-w-4xl mx-auto px-4 py-14 flex flex-col items-start gap-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-ihealthBlue">{page.headline}</h1>
            <p className="text-lg leading-relaxed">{page.intro}</p>
            <p className="text-base text-[#505258]">
              Last updated{' '}
              {LEGAL_LAST_UPDATED.startsWith(CONFIRM_PREFIX) ? (
                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-semibold">
                  {LEGAL_LAST_UPDATED.slice(CONFIRM_PREFIX.length).trim()}
                </span>
              ) : (
                LEGAL_LAST_UPDATED
              )}
            </p>
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto px-4 py-12">
          <nav aria-label="On this page" className="mb-12">
            <h2 className="text-sm font-bold uppercase tracking-[1.2px] text-[#505258] mb-4">
              On this page
            </h2>
            <ol className="flex flex-col items-start gap-2">
              {page.sections.map((section, index) => (
                <li key={section.heading}>
                  <Link
                    href={`#${toAnchorId(section.heading)}`}
                    className="text-lg text-[#105fa8] hover:underline"
                  >
                    {index + 1}. {section.heading}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col items-start gap-12">
            {page.sections.map((section) => (
              <section
                key={section.heading}
                id={toAnchorId(section.heading)}
                // Offset so an anchor jump does not land under the fixed header
                className="w-full flex flex-col items-start gap-4 scroll-mt-[120px]"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-ihealthBlue">{section.heading}</h2>

                {section.body?.map((paragraph) => (
                  <Paragraph key={paragraph.slice(0, 40)} text={paragraph} />
                ))}

                {section.list && (
                  <ul className="w-full flex flex-col items-start gap-3 list-disc pl-6">
                    {section.list.map((item) => (
                      <li key={item.slice(0, 40)} className="text-lg leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {section.contacts && <Contacts items={section.contacts} slug={slug} />}

                {section.afterBody?.map((paragraph) => (
                  <Paragraph key={paragraph.slice(0, 40)} text={paragraph} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
