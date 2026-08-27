// Outbound mail. Currently only the admin invite.
//
// SMTP rather than a mail vendor, because the client already runs Google
// Workspace, so mail leaves from their own domain with deliverability that is
// already established and no DNS records to add.

import 'server-only'

import nodemailer from 'nodemailer'

/*=======================================================
        MAIL IS OPTIONAL, THE THING IT CARRIES IS NOT
========================================================*/

/*
 Every caller has to work when this is unconfigured or failing. An invite is
 created first and mailed second, so a mail problem is a delivery problem and
 never a reason the invite does not exist.

 sendMail therefore reports rather than throws. A caller that swallowed an
 exception here would show somebody a success message for a mail that never
 left, which is worse than saying nothing.
*/

const SEND_TIMEOUT_MS = 15_000

export function mailConfigured() {
  return Boolean(
    process.env.LH_SMTP_HOST && process.env.LH_SMTP_USER && process.env.LH_SMTP_PASSWORD
  )
}

export function mailFrom() {
  return process.env.LH_MAIL_FROM || process.env.LH_SMTP_USER || ''
}

let cached = null

function transport() {
  if (cached) return cached

  const port = Number.parseInt(process.env.LH_SMTP_PORT || '465', 10)

  cached = nodemailer.createTransport({
    host: process.env.LH_SMTP_HOST,
    port,
    // 465 is implicit TLS, 587 upgrades with STARTTLS. Both are encrypted.
    secure: port === 465,
    auth: {
      user: process.env.LH_SMTP_USER,
      /*
       A Google app password arrives with spaces in it for readability and
       they are not part of the secret. Stripping them here saves the failure
       where a pasted password authenticates nowhere and says nothing useful.
      */
      pass: String(process.env.LH_SMTP_PASSWORD || '').replace(/\s+/g, ''),
    },
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  })

  return cached
}

/**
 * Sends one message. Never throws, returns what happened.
 */
export async function sendMail({ to, subject, text, html }) {
  if (!mailConfigured()) return { sent: false, reason: 'not-configured' }

  try {
    const result = await transport().sendMail({ from: mailFrom(), to, subject, text, html })
    return { sent: true, messageId: result.messageId }
  } catch (cause) {
    // The message only. The cause carries the transport config including auth.
    console.error('[mail] send failed to %s: %s', to, cause.message)
    return { sent: false, reason: 'failed', message: cause.message }
  }
}

/*
 TODO copy. The wording below is mine, not the client's, and it is the only
 user facing text in this file. Replace it with whatever they want said.
*/
export function inviteMessage({ link, expiresInDays, siteName, invitedBy }) {
  const subject = `Your access to the ${siteName} reporting area`

  const text = [
    `You have been given access to the ${siteName} reporting area${invitedBy ? ` by ${invitedBy}` : ''}.`,
    '',
    'Open this link and sign in with your work Google account:',
    link,
    '',
    `The link expires in ${expiresInDays} days and can only be used once.`,
    'It only works for the address it was sent to, so a forwarded copy will be refused.',
    '',
    'If you were not expecting this, you can ignore it and nothing will happen.',
  ].join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:16px;line-height:1.5;color:#1b2a56">
      <p>You have been given access to the ${siteName} reporting area${invitedBy ? ` by ${invitedBy}` : ''}.</p>
      <p>
        <a href="${link}" style="display:inline-block;background:#0f9d58;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold">
          Sign in with Google
        </a>
      </p>
      <p style="font-size:14px;color:#505258">
        The link expires in ${expiresInDays} days and can only be used once. It only works for the
        address it was sent to, so a forwarded copy will be refused.
      </p>
      <p style="font-size:14px;color:#505258">
        If you were not expecting this, you can ignore it and nothing will happen.
      </p>
      <p style="font-size:12px;color:#6C7381;word-break:break-all">${link}</p>
    </div>
  `

  return { subject, text, html }
}
