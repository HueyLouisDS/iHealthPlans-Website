// Closing call to action, a gradient card with a zip field and a quote
// button. Sits at the foot of the homepage, product, enrollment and education
// pages. A plain GET form, so it needs no JavaScript and the resulting url is
// shareable and shows up in reporting.

export default function ZipCta() {
  return (
    <div className="w-full h-fit py-[clamp(80px,11.85vw,128px)] px-4">
      <div className="py-12 px-8 bg-[linear-gradient(96deg,var(--ihealth-blue)_2.22%,var(--ihealth-green)_98.3%)] rounded-xl w-full max-w-6xl mx-auto flex flex-col items-center gap-8">
        <h2 className="text-white text-[clamp(32px,3.88vw,42px)] font-semibold text-center">
          Explore Medicare Advantage Solutions Options That May Meet Your Health Needs
        </h2>

        <form
          action="/quote-health-plans"
          method="get"
          className="w-full flex items-center justify-center gap-3 nm:gap-6 flex-col nm:flex-row"
        >
          <label htmlFor="zipcode" className="sr-only">
            Enter your zipcode
          </label>
          <input
            id="zipcode"
            name="zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="Enter your zipcode"
            className="max-w-none px-4 nm:max-w-xs w-full h-12 bg-white rounded-md text-base"
          />
          <button
            type="submit"
            className="h-12 px-6 rounded-md flex items-center justify-center bg-ihealthBlue text-lg text-white font-semibold flex-shrink-0 hover:brightness-110 transition-[filter] focus:outline-none focus:ring-4 focus:ring-white/40"
          >
            Get a Free Quote
          </button>
        </form>
      </div>
    </div>
  )
}
