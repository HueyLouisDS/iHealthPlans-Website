/**
 * Thin credibility strip directly under the hero.
 * Two claims with icons, the first hidden on small screens so the row never
 * wraps awkwardly on a phone.
 */

import Image from 'next/image'

// Both items use the same icon on the live site, despite different alt text.
// TODO get the correct second icon from the client, or drop one of the items.
const TRUST_ITEMS = [
  { label: 'Licensed Insurance Agents with Years of Experience', alt: '100 with circle', hideOnMobile: true },
  { label: 'Medicare Advantage Plans', alt: 'People icon', hideOnMobile: false },
]

/**
 * Renders the trust strip.
 */
export default function TrustBar() {
  return (
    <div className="w-full h-fit py-1 sm:py-3 bg-[#f7f7f7] shadow-md">
      <div className="w-full max-w-6xl mx-auto px-4 flex items-center justify-center flex-wrap gap-10 md:gap-20">
        {TRUST_ITEMS.map((item) => (
          <span
            key={item.label}
            className={`${item.hideOnMobile ? 'hidden md:flex' : 'flex'} items-center justify-center gap-4`}
          >
            <Image
              src="/icons/ihealth-icon.png"
              alt={item.alt}
              width={50}
              height={50}
              className="w-[40px] lg:w-[50px]"
            />
            <p className="lg:text-lg font-semibold">{item.label}</p>
          </span>
        ))}
      </div>
    </div>
  )
}
