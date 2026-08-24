// Hub page for /medicare-enrollment-periods.
// Lists all 6 enrollment windows and links through to the 2 that have their
// own pages. This is the page someone lands on when they know timing matters
// but not which window applies to them.

import { HeaderSpacer } from '@/components/layout/Header'
import PageHero from '@/components/ui/PageHero'
import Accordion from '@/components/ui/Accordion'
import ZipCta from '@/components/marketing/ZipCta'
import { WindowGrid, PenaltyNote } from '@/components/enrollment/EnrollmentSections'
import { getEnrollmentPage } from '@/lib/content/enrollment'

const SLUG = 'medicare-enrollment-periods'

export function generateMetadata() {
  const page = getEnrollmentPage(SLUG)
  return { title: page.title, description: page.metaDescription }
}

export default function MedicareEnrollmentPeriodsPage() {
  const page = getEnrollmentPage(SLUG)

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <PageHero
          eyebrow={page.eyebrow}
          headline={page.headline}
          intro={page.intro}
          callLocation="enrollmentHero:hub"
        />

        <WindowGrid />
        <PenaltyNote />

        <section className="w-full h-fit py-16 px-4">
          <div className="mx-auto max-w-4xl w-full flex flex-col items-center">
            <h2 className="text-4xl text-gray-900">Frequently asked questions</h2>
            <Accordion items={page.faqs} />
          </div>
        </section>

        <ZipCta />
      </main>
    </>
  )
}
