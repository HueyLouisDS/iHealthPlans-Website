/**
 * Two column explainer, what Medicare Advantage is on the left and what an
 * agent can do for you on the right. First real content block on the page.
 */

import Image from 'next/image'

const AGENT_CAPABILITIES = [
  'Discuss your Medicare Advantage options',
  'Explore available Medicare Advantage plan options that may fit your healthcare needs',
  'Make the enrollment process simple',
]

/**
 * Renders the overview section.
 * The uneven column split is intentional, the explanatory copy on the left is
 * long and the checklist on the right is short.
 */
export default function MedicareOverview() {
  return (
    <div className="w-full h-fit py-20">
      <div className="w-full max-w-6xl mx-auto px-4 flex flex-col items-start gap-12">
        <h2 className="text-4xl">Explore Medicare Advantage Options Available to You</h2>

        <div className="w-full grid grid-cols-1 nm:grid-cols-[0.85fr_1.15fr] gap-14">
          <div className="w-full flex flex-col items-start gap-4">
            <h6 className="font-bold text-xl">What is Medicare Advantage?</h6>
            <p className="text-lg">
              Medicare Advantage is the United States federal health insurance program for people
              who are 65 or older. It&rsquo;s also available for people who are younger than 65 and
              have been diagnosed with certain disabilities or health conditions such as End-Stage
              Renal Disease (ESRD) or Lou Gehrig&rsquo;s disease (ALS). The Medicare Advantage
              program consists of four parts, plus some other options for additional coverage.
              While everyone starts with Parts A and B, the rest of your coverage options will be a
              personal decision based on your healthcare needs and budget. At iHealth Plans, our
              mission is to assist you in navigating your choices and exploring available Medicare
              Advantage plan options that may fit your healthcare needs.
            </p>
          </div>

          <div className="w-full flex flex-col items-start gap-4">
            <h6 className="font-bold text-xl">iHealth Plans Licensed Insurance Agents can:</h6>
            <div className="w-full flex flex-col items-start gap-4">
              {AGENT_CAPABILITIES.map((capability) => (
                <span key={capability} className="w-full flex items-center gap-4">
                  <Image
                    src="/icons/check-icon.svg"
                    alt=""
                    width={29}
                    height={29}
                    className="flex-shrink-0"
                  />
                  <p className="text-lg">{capability}</p>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
