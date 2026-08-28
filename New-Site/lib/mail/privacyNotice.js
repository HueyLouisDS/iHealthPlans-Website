// Tells somebody a privacy request came in.
//
// Its own module rather than another function in mailer.js, because this
// message goes to staff and carries a legal deadline, while everything in
// mailer.js so far goes to a person about their own account.

import { sendMail, mailConfigured } from '@/lib/mail/mailer'
import { RESPONSE_DAYS } from '@/lib/privacy/schema'

/*-------- This is critical --------*/
/*
 Where this lands is the only thing standing between a request arriving and a
 30 day clock expiring unnoticed. If LH_PRIVACY_NOTICE_TO is unset the notice
 goes nowhere and the row sits in the table with nobody watching it.

 It is read at call time rather than at import, so changing the address on the
 host takes effect on the next request instead of the next deploy.
*/
function recipient() {
  return String(process.env.LH_PRIVACY_NOTICE_TO || '').trim()
}

/*
 This is internal mail, so the wording is mine and does not need sign off the
 way the consumer facing copy does. It deliberately carries no name, telephone
 number or email address. The record is in the database, and a mailbox is a
 worse place to keep somebody's request than the table built for it.
*/
function message({ requestId, request }) {
  const due = new Date(request.dueAt).toISOString().slice(0, 10)

  const text = [
    `A privacy request was submitted on the website.`,
    '',
    `Reference   ${requestId}`,
    `Type        ${request.requestType}`,
    `On behalf   ${request.onBehalfOf}`,
    `State       ${request.state || 'not given'}`,
    `Due by      ${due}, which is ${RESPONSE_DAYS} days from submission`,
    '',
    'The full request, including who made it and how to reach them, is in the',
    'privacy_requests table. It is not repeated here on purpose.',
    '',
    'A deletion request also needs the written demand sending to the dialer',
    'vendor once identity has been verified. They will not act without it.',
  ].join('\n')

  return { subject: `Privacy request ${requestId}, due ${due}`, text }
}

/*
 Never throws and never blocks the submission. The request is already stored by
 the time this runs, so a failed notice is a delay rather than a lost record.
*/
export async function notifyPrivacyRequest({ requestId, request }) {
  const to = recipient()

  if (!to) {
    console.error('[privacy] LH_PRIVACY_NOTICE_TO is not set, request %s notified nobody', requestId)
    return { sent: false, reason: 'no-recipient' }
  }

  if (!mailConfigured()) {
    console.error('[privacy] mail is not configured, request %s notified nobody', requestId)
    return { sent: false, reason: 'not-configured' }
  }

  const { subject, text } = message({ requestId, request })
  return sendMail({ to, subject, text })
}
