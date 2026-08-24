// The section blocks the 3 enrollment pages are assembled from.
// Grouped in one file because each is small and they are only ever used
// together. Splitting them into 5 files would add navigation cost without
// adding clarity.

import Link from 'next/link'
import { ENROLLMENT_WINDOWS } from '@/lib/content/enrollment'

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-ihealthGreen flex-shrink-0 mt-1" aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function WindowGrid() {
  return (
    <section className="w-full h-fit py-16 px-4">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-start gap-8">
        <h2 className="text-4xl text-ihealthBlue">The enrollment periods</h2>

        <div className="w-full grid grid-cols-1 nm:grid-cols-2 gap-8">
          {ENROLLMENT_WINDOWS.map((window) => {
            const inner = (
              <>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="font-bold text-xl text-ihealthBlue">{window.name}</h3>
                  <span className="text-xs font-bold uppercase tracking-[1.2px] text-[#878F99]">
                    {window.abbreviation}
                  </span>
                </div>
                <p className="text-sm font-semibold uppercase tracking-[1.2px] text-ihealthGreen">
                  {window.dates}
                </p>
                <p className="text-lg">{window.detail}</p>
                {window.href && (
                  <span className="text-[#105fa8] font-semibold group-hover:underline">
                    Read more about the {window.name}
                  </span>
                )}
              </>
            )

            const className =
              'w-full flex flex-col items-start gap-2 border rounded-xl p-6 h-full'

            return window.href ? (
              <Link
                key={window.slug}
                href={window.href}
                className={`${className} hover:border-ihealthGreen transition-colors group`}
              >
                {inner}
              </Link>
            ) : (
              <div key={window.slug} className={className}>
                {inner}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function Explainer({ content }) {
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

export function TickList({ content }) {
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

export function TermList({ content, columns = 1 }) {
  return (
    <section className="w-full h-fit py-16 px-4">
      <div className={`w-full ${columns === 2 ? 'max-w-6xl' : 'max-w-4xl'} mx-auto flex flex-col items-start gap-8`}>
        <h2 className="text-4xl text-ihealthBlue">{content.heading}</h2>

        {columns === 2 ? (
          <dl className="w-full grid grid-cols-1 nm:grid-cols-2 gap-x-16 gap-y-8">
            {content.items.map((item) => (
              <div key={item.term} className="flex flex-col items-start gap-2 border-l-2 border-l-ihealthGreen pl-5">
                <dt className="font-bold text-xl text-ihealthBlue">{item.term}</dt>
                <dd className="text-lg">{item.detail}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <dl className="w-full divide-y divide-gray-900/10">
            {content.items.map((item) => (
              <div key={item.term} className="py-5 grid grid-cols-1 nm:grid-cols-[240px_1fr] gap-2 nm:gap-8">
                <dt className="font-bold text-lg text-ihealthBlue">{item.term}</dt>
                <dd className="text-lg">{item.detail}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}

export function PenaltyNote() {
  return (
    <section className="w-full h-fit py-16 px-4">
      <div className="w-full max-w-4xl mx-auto border-l-4 border-l-ihealthGreen bg-[#f7f7f7] rounded-r-xl p-10 flex flex-col items-start gap-4">
        <h2 className="text-3xl text-ihealthBlue">Why the timing matters</h2>
        <p className="text-lg">
          Delaying coverage past the point you were first eligible can result in a late enrollment
          penalty. For Part B, an amount is added to your premium for each full 12 month period you
          could have had it and did not, and it generally continues for as long as you have Part B.
        </p>
        <p className="text-lg">
          Part D works similarly. Going 63 days or more in a row without Part D or other creditable
          prescription drug coverage after your Initial Enrollment Period can result in an amount
          being added to your premium for as long as you have coverage.
        </p>
        <p className="text-lg">
          Some situations avoid a penalty entirely, such as having creditable coverage through an
          employer. Whether that applies to you is worth confirming rather than assuming.
        </p>
      </div>
    </section>
  )
}
