// The TCPA and TPMO consent wording, defined once as data.
// components/compliance/TcpaConsent.js renders it and the quote form sends the
// flattened text with the submission, so what is stored is what was on screen.
import { PHONE_NUMBER, PHONE_TTY, BUSINESS_HOURS, SMID, SITE_URL } from '@/lib/siteConfig'

const DO_NOT_CALL_PATH = '/do-not-call'

/*===============================================================
        ONE DEFINITION, RENDERED AND STORED FROM THE SAME PLACE
===============================================================*/

/*
 The consent record is evidence. A version stored as a pointer to current page
 copy is worthless the moment the copy changes, so lead_consents holds the
 wording verbatim and the form sends it rather than the server looking it up.

 That only holds if the string sent is provably the string displayed. Hence
 this shape. A paragraph is a list of segments, a segment is a plain string, a
 { strong } run, or a { link, href }, and both the component and the flattener
 below read the same array. Editing the wording in one place is impossible.
*/
export function consentParagraphs() {
  return [
    [
      { strong: 'This is a solicitation for insurance.' },
      ' By submitting this form, you understand that your contact information will be provided to a licensed sales agent who can enroll you into a Medicare Advantage or Prescription Drug (Part D) plan, and you agree to receive marketing messages by email, autodialer, text, or prerecorded call. Cellular charges may apply.',
    ],
    [
      `Your consent to connect with a licensed insurance agent does not affect your eligibility to enroll or the provision of services, and it is not a condition of purchase. You can withdraw it at any time by calling iHealth Plans at ${PHONE_NUMBER} (${PHONE_TTY}), ${BUSINESS_HOURS}, or through our `,
      { link: 'Do Not Call page', href: DO_NOT_CALL_PATH },
      '.',
    ],
    [`SMID: ${SMID}`],
  ]
}

/*
 A link is flattened with its destination spelled out, because the stored text
 has to stand on its own in a complaint. "our Do Not Call page" read back from
 a database says nothing about where that page was.*/
function flattenSegment(segment) {
  if (typeof segment === 'string') return segment
  if (segment.strong) return segment.strong

  return `${segment.link} (${SITE_URL}${segment.href})`
}

// The exact wording, as one string, for storage in lead_consents.consent_text
export function consentText() {
  return consentParagraphs()
    .map((paragraph) => paragraph.map(flattenSegment).join(''))
    .join('\n\n')
}
