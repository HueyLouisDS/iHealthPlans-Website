// The TCPA and TPMO disclosure that must appear on any form collecting contact
// details for a licensed agent to follow up on.

/*=============================================
    WHY THIS IS A COMPONENT AND NOT PASTED INTO THE FORM
=============================================*/

import { PHONE_NUMBER, PHONE_TTY, BUSINESS_HOURS, SMID } from '@/lib/siteConfig'

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
