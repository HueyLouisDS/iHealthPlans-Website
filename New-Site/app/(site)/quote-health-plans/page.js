/**
 * Quote and callback page, /quote-health-plans.
 * The destination every call to action on the site points at.
 *
 * ?callback=1 switches the wording to a callback request. OfficeStatusCta adds
 * it automatically when the phone line is shut, which is roughly 75% of the
 * week, so a visitor arriving in the evening or at a weekend gets a page that
 * matches what just happened rather than one telling them to call.
 */

import { HeaderSpacer } from '@/components/layout/Header'
import QuoteForm from '@/components/forms/QuoteForm'
import { BUSINESS_HOURS, PHONE_NUMBER, PHONE_TTY } from '@/lib/siteConfig'

/**
 * Title and description for this route.
 */
export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const isCallback = params?.callback === '1'

  return {
    title: isCallback ? 'Request a Callback | iHealth Plans' : 'Get a Free Quote | iHealth Plans',
    description:
      'Speak with a licensed insurance agent about the Medicare Advantage plan options available in your area.',
  }
}

export default async function QuoteHealthPlansPage({ searchParams }) {
  const params = await searchParams
  const isCallback = params?.callback === '1'
  // Carried from the zip field on the closing call to action
  const initialZip = String(params?.zip || '')

  return (
    <>
      <HeaderSpacer />

      <main className="flex flex-col items-center justify-center">
        <div className="w-full bg-[linear-gradient(96deg,var(--ihealth-blue)_20%,var(--ihealth-green)_140%)] text-white">
          <div className="w-full max-w-6xl mx-auto px-4 py-12 sm:py-16 flex flex-col items-start">
            <h1 className="text-3xl sm:text-5xl font-bold leading-[120%] mb-4 max-w-3xl">
              Explore Medicare Advantage plan options that may fit your needs
            </h1>
            <p className="text-lg sm:text-xl font-light max-w-2xl">
              There is no cost or obligation to speak with a licensed insurance agent. Call{' '}
              {PHONE_NUMBER} ({PHONE_TTY}), {BUSINESS_HOURS}, or leave your details below.
            </p>
          </div>
        </div>

        <div className="w-full h-fit py-12 sm:py-16 px-4">
          <QuoteForm isCallback={isCallback} initialZip={initialZip} />
        </div>
      </main>
    </>
  )
}
