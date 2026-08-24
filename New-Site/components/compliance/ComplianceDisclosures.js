// CMS required disclosure block, rendered in the footer of every page.
// Kept out of components/layout on purpose. This text is approved marketing
// material governed by the SMID above it, so it changes on a compliance
// review cycle and must never be reworded for design reasons.

import { SMID, CARRIER_COUNT, PRODUCT_COUNT } from '@/lib/siteConfig'

export default function ComplianceDisclosures() {
  return (
    <>
      <p>SMID: {SMID}</p>

      <p>
        <span className="font-bold text-[#3f3f3f]">Federal Contracting Statement (FCS):</span>{' '}
        iHealth Plans represents Medicare Advantage [HMO, PPO, PFFS, and PDP] organizations that
        have a Medicare contract or a Medicare-approved Part D sponsor. Enrollment in the plan
        depends on the plan&rsquo;s contract renewal with Medicare.
      </p>

      <p>
        We do not offer every plan available in your area. Currently we represent {CARRIER_COUNT}{' '}
        organizations which offer {PRODUCT_COUNT} products in your area. Please contact
        Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Program (SHIP) to get
        information on all of your options.
      </p>

      <p>
        This is not an offer or solicitation in any jurisdiction where we are not authorized to do
        business or where such offer or solicitation would be contrary to the local laws or
        regulations of that jurisdiction. Medicare Supplement insurance plans are not connected
        with or endorsed by the U.S. government or the federal Medicare program.
      </p>
    </>
  )
}
