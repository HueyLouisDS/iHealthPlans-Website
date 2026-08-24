// Full bleed homepage hero. Background photo, dark gradient scrim, headline
// stack, and the 2 primary calls to action.
// The gradient is what keeps the white copy readable over the photo, it is
// load bearing rather than decorative.

import Image from 'next/image'
import OfficeStatusCta from '@/components/marketing/OfficeStatusCta'

export default function Hero() {
  return (
    <div className="w-full h-fit pb-12 pt-20 sm:py-40 sm:min-h-[600px] relative">
      <div className="w-full max-w-6xl mx-auto px-4 flex flex-col items-start relative z-20">
        <div className="max-w-xl w-full flex flex-col items-start">
          <h6 className="border-l-ihealthGreen border-l-2 pl-2 sm:pl-3 text-white tracking-[3px] font-extralight mb-2 sm:mb-3 !leading-[125%]">
            Are you new to Medicare Advantage, recently moved,{' '}
            <br className="hidden md:block" />
            or losing your health insurance coverage?
          </h6>

          <h1 className="text-white text-3xl sm:text-5xl font-bold leading-[120%] mb-1 sm:mb-3">
            Navigate Your Healthcare Journey With Help From iHealth Plans
          </h1>

          <p className="text-white text-lg sm:text-xl font-light mb-2.5">
            Enrolling in Medicare Advantage may seem complex, but speaking with a licensed
            insurance agent about your options may help. We&rsquo;re here to help you explore your
            Medicare Advantage plan options at no-cost or obligation in a consultative fashion.
          </p>

          {/* Swaps the primary action depending on whether the phone line is
              staffed. Closed roughly 75% of the week, and previously every one
              of those visitors got a tel: link that rings out. */}
          <div className="mt-4">
            <OfficeStatusCta location="hero" tone="dark" />
          </div>
        </div>
      </div>

      {/* Scrim sits between the photo and the copy, hence z-10 against z-0 and z-20 */}
      <div className="w-full h-full absolute z-10 inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.75)_10%,transparent_99.85%)] sm:bg-[linear-gradient(90deg,rgba(0,0,0,.8)_38.55%,transparent_99.85%)]" />

      <Image
        src="/images/featured-image.jpg"
        alt="People walking"
        width={2121}
        height={1414}
        priority
        sizes="100vw"
        className="absolute inset-0 z-0 object-cover object-[50%_40%] w-full h-full"
      />
    </div>
  )
}
