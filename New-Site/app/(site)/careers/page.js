// Careers page, /careers. Video hero over the recruiting pitch, then the
// application form.
// Note the route is careers, plural. The scrape in Old-Site captured /career,
// which is a 404 on the live site, so this page was rebuilt from the live
// markup rather than from the scrape.

import { HeaderSpacer } from '@/components/layout/Header'
import CareersHero from '@/components/careers/CareersHero'
import ApplicationForm from '@/components/forms/ApplicationForm'

export const metadata = {
  title: 'Careers | iHealth Plans',
  description: 'Join Our Team at iHealth Plans: Earn as High as $300,000/Year',
}

export default function CareersPage() {
  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <CareersHero />

        <div className="w-full h-fit py-10 sm:py-24 px-4">
          <ApplicationForm />
        </div>
      </main>
    </>
  )
}
