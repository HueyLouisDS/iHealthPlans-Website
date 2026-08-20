/**
 * Closing call to action, gradient card with a zip field and a quote button.
 * Recreated faithfully from the live site, including the fact that the zip
 * field is not wired to anything.
 */

import Link from 'next/link'

/**
 * Renders the closing call to action.
 *
 * TODO the zip input is decorative on the live site. Whatever the visitor
 * types is discarded, and the button is a plain link to /quote-health-plans
 * that carries nothing with it. That is a lead captured and then thrown away
 * at the last step of the page. Wiring the value into the quote URL, and into
 * the session record, is the smallest high value fix on this page.
 */
export default function ZipCta() {
  return (
    <div className="w-full h-fit py-[clamp(80px,11.85vw,128px)] px-4">
      <div className="py-12 px-8 bg-[linear-gradient(96deg,var(--ihealth-blue)_2.22%,var(--ihealth-green)_98.3%)] rounded-xl w-full max-w-6xl mx-auto flex flex-col items-center gap-8">
        <h2 className="text-white text-[clamp(32px,3.88vw,42px)] font-semibold text-center">
          Explore Medicare Advantage Solutions Options That May Meet Your Health Needs
        </h2>

        <div className="w-full flex items-center justify-center gap-3 nm:gap-6 flex-col nm:flex-row">
          <label htmlFor="zipcode" className="sr-only">
            Enter your zipcode
          </label>
          <input
            id="zipcode"
            name="zipcode"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Enter your zipcode"
            className="max-w-none px-4 nm:max-w-xs w-full h-12 bg-white rounded-md"
          />
          <Link
            href="/quote-health-plans"
            className="h-12 px-6 rounded-md flex items-center justify-center bg-ihealthBlue text-lg text-white font-semibold flex-shrink-0"
          >
            Get a Free Quote
          </Link>
        </div>
      </div>
    </div>
  )
}
