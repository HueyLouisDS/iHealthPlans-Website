'use client'

/**
 * Accordion of the 7 homepage questions.
 * Written against useState rather than a headless component library. The live
 * site pulls in @headlessui/react for this one accordion, which is a large
 * dependency for behaviour that is 20 lines.
 */

import { useState } from 'react'

// Questions and answers are the client's approved copy, recovered from the
// live bundle. Treat edits here as content changes, not code changes.
const FAQ_ITEMS = [
  {
    question: 'What Is Medicare Advantage?',
    answer:
      'Medicare Advantage (also known as “Part C”) is a type of Medicare health plan offered by a private company that contracts with Medicare for people 65+ and younger with specific disabilities. These plans include Part A, Part B, and usually Part D. Plans may offer some additional benefits that Original Medicare doesn’t cover.',
  },
  {
    question: 'Can my spouse/partner and I share a policy?',
    answer:
      'No, Medicare Advantage coverage is individual coverage. That means you and your spouse/partner must sign up for one plan per person.',
  },
  {
    question: 'How does this work with Social Security?',
    answer:
      'You do not need to collect Social Security to enroll in Medicare Advantage. If you collect Social Security when you turn 65, you will automatically enroll in Medicare Advantage.',
  },
  {
    question: 'How is Medicare Advantage different from Medicaid?',
    answer:
      'While they sound alike, Medicare Advantage and Medicaid are different. Medicare Advantage is a health insurance program provided by the U.S. government for people ages 65 plus and younger people with certain disabilities. Medicaid is a government health program designed specifically to help low-income people afford health care.',
  },
  {
    question: 'What decisions do I need to make?',
    answer:
      'If you are interested in health insurance coverage beyond original Medicare, you need to speak to a licensed insurance agent to explore Medicare Advantage plans, Medicare Supplemental Insurance, Part D Drug plans, and stand-alone dental and vision coverage options.',
  },
  {
    question: 'What if I’m still covered by an employer or spouse’s/partner’s employer plan?',
    answer:
      'You can continue to be covered through your own plan or through a spouse’s/partner’s plan if you still qualify. Make sure you check with the sponsor of your existing policy.',
  },
  {
    question: 'What’s the difference between premiums, deductibles, copays, and coinsurance?',
    answer:
      'Premiums are regular amounts you pay for coverage. A deductible is a dollar amount you need to pay out of pocket before your coverage begins paying. Copays are dollar amounts you pay whenever you receive a certain procedure. Coinsurance is a percentage of the total charge you pay whenever you receive a certain procedure.',
  },
]

/**
 * Plus and minus glyph for the toggle, swapped by the open state.
 */
function ToggleIcon({ isOpen }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
      {!isOpen && <path d="M12 6v12" strokeLinecap="round" />}
      <path d="M18 12H6" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Renders the accordion.
 * Tracks a single open index rather than a set, so opening one closes the
 * others. That is how the live site behaves.
 */
export default function Faq() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <div className="w-full h-fit px-4 pb-20">
      <div className="mx-auto max-w-5xl w-full">
        <div className="mx-auto max-w-4xl w-full flex flex-col items-center divide-y divide-gray-900/10">
          <h2 className="text-4xl text-gray-900">Frequently asked questions</h2>

          <dl className="mt-10 w-full space-y-6 divide-y divide-gray-900/10">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index

              return (
                <div key={item.question} className="pt-6">
                  <dt className="w-full">
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start justify-between text-left text-gray-900"
                    >
                      <span className="text-base font-semibold leading-7">{item.question}</span>
                      <span className="ml-6 flex h-7 items-center">
                        <ToggleIcon isOpen={isOpen} />
                      </span>
                    </button>
                  </dt>

                  {isOpen && (
                    <dd className="mt-2 pr-12 w-full">
                      <p className="text-base leading-7 text-gray-600">{item.answer}</p>
                    </dd>
                  )}
                </div>
              )
            })}
          </dl>
        </div>
      </div>
    </div>
  )
}
