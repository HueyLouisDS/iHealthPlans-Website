/**
 * Page for /medicare-advantage-open-enrollment, shown in the nav as
 * "Open Enrollment".
 *
 * The url is deliberately explicit rather than /open-enrollment. Medicare.gov
 * uses "Open Enrollment" for the 15 October to 7 December window, which is the
 * Annual Enrollment Period on its own page. A vague slug here would compete
 * with that page for searches meant for it, and pull people to the wrong
 * dates.
 */

import Link from 'next/link'
import { HeaderSpacer } from '@/components/layout/Header'
import PageHero from '@/components/ui/PageHero'
import Accordion from '@/components/ui/Accordion'
import ZipCta from '@/components/marketing/ZipCta'
import { TickList, TermList, Explainer } from '@/components/enrollment/EnrollmentSections'
import { getEnrollmentPage } from '@/lib/content/enrollment'

const SLUG = 'medicare-advantage-open-enrollment'

export function generateMetadata() {
  const page = getEnrollmentPage(SLUG)
  return { title: page.title, description: page.metaDescription }
}

/**
 * Renders the page.
 * Who it applies to comes before what you can do, which is the reverse of the
 * AEP page. Most people arriving here are not eligible for this window at all,
 * so answering that first saves them reading a page about rules that do not
 * apply to them.
 */
export default function MedicareAdvantageOpenEnrollmentPage() {
  const page = getEnrollmentPage(SLUG)

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <PageHero
          eyebrow={page.eyebrow}
          headline={page.headline}
          intro={page.intro}
          callLocation="enrollmentHero:maOpen"
        />

        <TickList content={page.whoItIsFor} />
        <TickList content={page.canDo} />
        <TermList content={page.cannotDo} />
        <Explainer content={page.timing} />

        <section className="w-full h-fit py-16 px-4">
          <div className="mx-auto max-w-4xl w-full flex flex-col items-center">
            <h2 className="text-4xl text-gray-900">Frequently asked questions</h2>
            <Accordion items={page.faqs} />
          </div>
        </section>

        <section className="w-full h-fit pb-16 px-4">
          <div className="w-full max-w-4xl mx-auto flex flex-wrap gap-6">
            <Link href="/annual-enrollment-period" className="text-[#105fa8] font-semibold hover:underline">
              About the Annual Enrollment Period
            </Link>
            <Link href="/medicare-enrollment-periods" className="text-[#105fa8] font-semibold hover:underline">
              See all Medicare enrollment periods
            </Link>
          </div>
        </section>

        <ZipCta />
      </main>
    </>
  )
}
