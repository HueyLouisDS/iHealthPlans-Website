/**
 * Gradient card holding the 4 value propositions.
 * Same blue to green gradient as the closing call to action, which is what
 * visually bookends the middle of the page.
 */

import Image from 'next/image'

/*
 * Icon filenames are inherited from the live site and do not always match the
 * heading beside them, for example a-trusted-brand sits under Nationwide
 * Support. Left as is so the assets stay traceable to their source.
 */
const VALUE_PROPS = [
  {
    icon: '/icons/personalized-guidance.svg',
    alt: 'Icon of a person in a chat bubble',
    width: 43,
    height: 34,
    title: 'Personalized Guidance',
    body: 'Our team is here to help you navigate your Medicare Advantage plan options, answering your questions and providing the guidance you need to make an informed decision.',
  },
  {
    icon: '/icons/comprehensive-coverage.svg',
    alt: 'File icon with a check',
    width: 27,
    height: 34,
    title: 'Your Coverage Options',
    body: 'Licensed insurance agents working with iHealth Plans can review your Medicare Advantage plan to find options that may better fit your healthcare needs.',
  },
  {
    icon: '/icons/simplified-process.svg',
    alt: 'File icon with a dollar sign',
    width: 26,
    height: 34,
    title: 'Help During the Process',
    body: 'We make it easy to explore your options and enroll in a plan. Plus, our team of licensed insurance agents is always here to help if you have questions or need assistance.',
  },
  {
    icon: '/icons/a-trusted-brand.svg',
    alt: 'Shield icon with a checkmark',
    width: 28,
    height: 34,
    title: 'Nationwide Support',
    body: 'iHealth Plans employs 150 licensed insurance agents across all 50 states to help you.',
  },
]

/**
 * Renders the value proposition grid.
 * brightness-200 forces the dark source SVGs to read as white against the
 * gradient, the assets themselves are not white.
 */
export default function WhyChoose() {
  return (
    <div className="w-full h-fit py-20 px-4">
      <div className="py-14 px-10 bg-[linear-gradient(96deg,var(--ihealth-blue)_33%,var(--ihealth-green)_98.3%)] text-white rounded-xl w-full max-w-6xl mx-auto flex flex-col items-start gap-16">
        <h2 className="text-4xl">Why iHealth Plans?</h2>

        <div className="w-full grid grid-cols-1 nm:grid-cols-2 gap-x-20 gap-y-10">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="w-full flex flex-col items-start gap-4">
              <Image
                src={prop.icon}
                alt={prop.alt}
                width={prop.width}
                height={prop.height}
                className="w-fit h-fit brightness-200"
              />
              <h6 className="font-bold text-lg">{prop.title}</h6>
              <p className="text-lg">{prop.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
