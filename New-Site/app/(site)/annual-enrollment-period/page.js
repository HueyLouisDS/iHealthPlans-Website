/**
 * Page for /annual-enrollment-period.
 * The most seasonal page on the site. Traffic to it spikes from roughly
 * September to early December, so it carries a live status banner telling a
 * visitor whether the window is open and how long they have.
 */

import Link from 'next/link'
import { HeaderSpacer } from '@/components/layout/Header'
import PageHero from '@/components/ui/PageHero'
import Accordion from '@/components/ui/Accordion'
import ZipCta from '@/components/marketing/ZipCta'
import EnrollmentStatus from '@/components/enrollment/EnrollmentStatus'
import { TickList, TermList, Explainer } from '@/components/enrollment/EnrollmentSections'
import { getEnrollmentPage } from '@/lib/content/enrollment'

const SLUG = 'annual-enrollment-period'

/**
 * Title and description, read from the enrollment period data so they
 * cannot drift from the copy on the page.
 */
export function generateMetadata() {
  const page = getEnrollmentPage(SLUG)
  return { title: page.title, description: page.metaDescription }
}

/**
 * Renders the AEP page.
 * Order is what you can do, what this window does not cover, why to review
 * anyway, then what to check. The exclusions sit high on purpose, because
 * assuming Medigap is covered by this window is the most expensive
 * misunderstanding a visitor can leave with.
 */
export default function AnnualEnrollmentPeriodPage() {
  const page = getEnrollmentPage(SLUG)

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <PageHero
          eyebrow={page.eyebrow}
          headline={page.headline}
          intro={page.intro}
          callLocation="enrollmentHero:aep"
        >
          <EnrollmentStatus />
        </PageHero>

        <TickList content={page.canDo} />
        <TermList content={page.cannotDo} />
        <Explainer content={page.whyReview} />
        <TermList content={page.checklist} columns={2} />

        <section className="w-full h-fit py-16 px-4">
          <div className="mx-auto max-w-4xl w-full flex flex-col items-center">
            <h2 className="text-4xl text-gray-900">Frequently asked questions</h2>
            <Accordion items={page.faqs} />
          </div>
        </section>

        <section className="w-full h-fit pb-16 px-4">
          <div className="w-full max-w-4xl mx-auto flex flex-wrap gap-6">
            <Link href="/medicare-enrollment-periods" className="text-[#105fa8] font-semibold hover:underline">
              See all Medicare enrollment periods
            </Link>
            <Link href="/special-enrollment-period" className="text-[#105fa8] font-semibold hover:underline">
              What if my circumstances change outside this window?
            </Link>
          </div>
        </section>

        <ZipCta />
      </main>
    </>
  )
}
