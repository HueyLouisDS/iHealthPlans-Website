/**
 * The 7 homepage questions.
 * Holds the copy only, the accordion behaviour lives in components/ui/Accordion
 * so the product pages reuse the identical interaction rather than growing a
 * second, slightly different one.
 */

import Accordion from '@/components/ui/Accordion'

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
      'If you are interested in health insurance coverage beyond Original Medicare, speaking to a licensed insurance agent can help you explore the Medicare Advantage and Part D prescription drug plan options available in your area, including plans that bundle drug coverage and plans that offer additional benefits.',
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
 * Renders the homepage FAQ block.
 */
export default function Faq() {
  return (
    <div className="w-full h-fit px-4 pb-20">
      <div className="mx-auto max-w-5xl w-full">
        <div className="mx-auto max-w-4xl w-full flex flex-col items-center divide-y divide-gray-900/10">
          <h2 className="text-4xl text-gray-900">Frequently asked questions</h2>
          <Accordion items={FAQ_ITEMS} />
        </div>
      </div>
    </div>
  )
}
