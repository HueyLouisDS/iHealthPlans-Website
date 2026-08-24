// Page for /special-enrollment-period.
// Unlike the AEP page this one is not seasonal. It is reached by people who
// have just had something change, which makes it high intent all year round
// and the strongest non seasonal call driver of the 3 enrollment pages.

import Link from 'next/link'
import { HeaderSpacer } from '@/components/layout/Header'
import PageHero from '@/components/ui/PageHero'
import Accordion from '@/components/ui/Accordion'
import ZipCta from '@/components/marketing/ZipCta'
import { TermList, Explainer } from '@/components/enrollment/EnrollmentSections'
import { getEnrollmentPage } from '@/lib/content/enrollment'

const SLUG = 'special-enrollment-period'

export function generateMetadata() {
  const page = getEnrollmentPage(SLUG)
  return { title: page.title, description: page.metaDescription }
}

export default function SpecialEnrollmentPeriodPage() {
  const page = getEnrollmentPage(SLUG)

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <PageHero
          eyebrow={page.eyebrow}
          headline={page.headline}
          intro={page.intro}
          callLocation="enrollmentHero:sep"
        />

        <TermList content={page.events} columns={2} />
        <Explainer content={page.timing} />

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
            <Link href="/annual-enrollment-period" className="text-[#105fa8] font-semibold hover:underline">
              About the Annual Enrollment Period
            </Link>
          </div>
        </section>

        <ZipCta />
      </main>
    </>
  )
}
