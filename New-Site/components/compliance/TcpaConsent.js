/**
 * The TCPA and TPMO disclosure that must appear on any form collecting contact
 * details for a licensed agent to follow up on.
 */

/*=============================================
    WHY THIS IS A COMPONENT AND NOT PASTED INTO THE FORM

    The live site publishes the CMS guidance *instruction* rather than the
    disclosure itself. Its quote page currently reads, verbatim and visibly:

      "In accordance with Telephone Consumer Protection Act (TCPA) guidelines,
       when requesting contact information from a consumer, TPMOs must, at a
       minimum, disclose in a readable font that: Example: This is a
       solicitation for insurance..."

    Somebody copied the guidance document, including the words "TPMOs must" and
    "Example:", into the page. Only the text after "Example:" was ever meant to
    be shown. That is fixed here.

    The reference to Medicare Supplement is also removed, because the agency
    does not sell it and a consent that names products they cannot place is
    both inaccurate and pointless.

    TO CONFIRM before this goes live: the exact wording is a compliance
    decision. Have it reviewed alongside the material id question, and confirm
    it matches the consent language used on every other lead capture channel.
=============================================*/

import { PHONE_NUMBER, PHONE_TTY, BUSINESS_HOURS, SMID } from '@/lib/siteConfig'

/**
 * Renders the disclosure.
 * Sits directly above the submit button rather than in a collapsed panel,
 * because "readable font" and buried behind a toggle are not compatible.
 */
export default function TcpaConsent() {
  return (
    <div className="w-full text-sm text-[#505258] leading-relaxed flex flex-col gap-3">
      <p>
        <span className="font-semibold">This is a solicitation for insurance.</span> By submitting
        this form, you understand that your contact information will be provided to a licensed
        sales agent who can enroll you into a Medicare Advantage or Prescription Drug (Part D)
        plan, and you agree to receive marketing messages by email, autodialer, text, or
        prerecorded call. Cellular charges may apply.
      </p>

      <p>
        Your consent to connect with a licensed insurance agent does not affect your eligibility to
        enroll or the provision of services, and it is not a condition of purchase. You can
        withdraw it at any time by calling iHealth Plans at {PHONE_NUMBER} ({PHONE_TTY}),{' '}
        {BUSINESS_HOURS}, or through our{' '}
        <a href="/do-not-call" className="text-[#105fa8] hover:underline">
          Do Not Call page
        </a>
        .
      </p>

      <p className="text-[#6C7381]">SMID: {SMID}</p>
    </div>
  )
}
