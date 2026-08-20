/**
 * Circular photo beside the tenure claim. Pure trust building, no call to
 * action, it sits between the two heavier content blocks to break them up.
 */

import Image from 'next/image'

/**
 * Renders the section.
 * The image is forced square and cropped, the source is landscape, so the
 * aspect-square plus object-cover pair is what makes the circle work.
 */
export default function DecadeOfService() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 grid nm:grid-cols-[0.85fr_1.15fr] items-center gap-14">
      <Image
        src="/images/happy-older-couple.jpg"
        alt="Older Couple Enjoying Signing Up for Medicare Advantage"
        width={2119}
        height={1414}
        sizes="(min-width: 720px) 40vw, 100vw"
        className="w-full h-fit rounded-full max-w-sm nm:max-w-none mx-auto nm:mx-0 aspect-square object-cover border-4 border-ihealthGreen"
      />

      <div className="w-full flex flex-col items-start gap-8">
        <h2 className="text-4xl">A Decade of Service</h2>
        <p className="text-lg">
          iHealth Plans has been helping clients for over 10 years. Our licensed insurance agents
          offer guidance, ensuring you make informed decisions about your health insurance. With a
          decade of dedicated service, we strive to offer guidance based on your healthcare needs.
          Trust in our experience and dedication to help you navigate your Medicare Advantage
          options with confidence.
        </p>
      </div>
    </div>
  )
}
