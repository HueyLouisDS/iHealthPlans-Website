// Every word the privacy request form puts on screen, in one file.
//
// Separated from the component so the wording can be reviewed and replaced
// without touching the form logic, the same way lib/content/legal.js holds the
// notices. Nothing here has been written yet, every string is a placeholder.

/*=======================================================
        NONE OF THIS COPY IS REAL. DO NOT SHIP IT
========================================================*/

/*
 The whole point of this form is that it produces a written, dated request the
 dialer vendor will accept as a demand to delete. Placeholder wording produces
 a placeholder demand, so the page refuses to render while COPY_PENDING is
 true rather than quietly publishing TODO text to a consumer.

 Set COPY_PENDING to false only once every string below has been replaced.
*/
export const COPY_PENDING = true

// Values the form posts. Must match REQUEST_TYPES in lib/privacy/schema.js
export const REQUEST_TYPES = [
  { value: 'know', label: 'TODO copy: label for the right to know' },
  { value: 'copy', label: 'TODO copy: label for the right to a copy' },
  { value: 'correct', label: 'TODO copy: label for the right to correction' },
  { value: 'delete', label: 'TODO copy: label for the right to deletion' },
  { value: 'optOut', label: 'TODO copy: label for the right to opt out of sale or sharing' },
  { value: 'limitSensitive', label: 'TODO copy: label for the right to limit use of sensitive information' },
]

export const ON_BEHALF_OPTIONS = [
  { value: 'self', label: 'TODO copy: option for making a request about yourself' },
  { value: 'other', label: 'TODO copy: option for making a request for somebody else' },
]

export const COPY = {
  pageTitle: 'TODO copy: browser title for the privacy request page',
  metaDescription: 'TODO copy: meta description, roughly 25 words',

  headline: 'TODO copy: page heading',
  intro: 'TODO copy: one paragraph saying what this form does and how long a response takes',

  requestTypeLabel: 'TODO copy: label above the request type choices',
  onBehalfLabel: 'TODO copy: label above the self or somebody else choices',

  firstName: 'TODO copy: first name field label',
  lastName: 'TODO copy: last name field label',
  phone: 'TODO copy: telephone field label',
  email: 'TODO copy: email field label',
  state: 'TODO copy: state field label',
  relationship: 'TODO copy: label for describing authority to act for somebody else',
  details: 'TODO copy: label for the free text box',

  /*
   Stored verbatim on the request row at submission, so this is the one string
   that becomes evidence rather than decoration. It has to say what the person
   is affirming, and it should be reviewed by whoever signs off the notices.
  */
  attestation: 'TODO copy: the sentence the requester ticks to confirm, saying the information given is accurate and that they are who they say they are',

  submit: 'TODO copy: submit button',
  submitting: 'TODO copy: button text while the request is being sent',

  successHeadline: 'TODO copy: heading shown after a successful submission',
  successBody: 'TODO copy: what happens next, and the response deadline',

  errorGeneric: 'TODO copy: message shown when the submission fails for an unknown reason',
  errorRequired: 'TODO copy: message shown under a required field left empty',
  errorPhone: 'TODO copy: message shown when the telephone number is not a valid US number',
  errorEmail: 'TODO copy: message shown when the email address is not valid',
  errorAttestation: 'TODO copy: message shown when the confirmation box is not ticked',
}
