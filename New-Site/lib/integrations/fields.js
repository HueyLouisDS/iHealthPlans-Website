// Which environment variables each integration needs, and how to label them.
// Deliberately carries no `import 'server-only'`, because both the admin client
// component and the write route import it and they have to agree on the same
// list. It holds names and labels only, never a value.

/*=======================================================
        THIS LIST IS THE WRITE WHITELIST
========================================================*/

export const EMAIL_LIST = 'emailList'   // field kind, rendered as removable chips
export const EMAIL_SHAPE = /^[^@\s,]+@[^@\s,]+\.[^@\s,]+$/

export const INTEGRATIONS = [
  {
    name: 'admin',
    label: 'Admin Access',
    hint:
      'Who can open this area. Both checks must pass, the address must be on the allowed domain ' +
      'and in this list. Empty list means nobody gets in, which is deliberate. The domain itself ' +
      'is set in the environment, not here.',
    fields: [
      { key: 'LH_ADMIN_ALLOWED_EMAILS', label: 'Allowed emails', kind: EMAIL_LIST },
    ],
  },
  {
    name: 'crm',
    label: 'CRM',
    hint:
      'TLD. The API key created under Settings, API, which is a different place from the vendor ' +
      'source the Vendor card below uses. Everything the site reads comes through this, the ' +
      'dialer side included, since the VICIdial data is a field option on each endpoint rather ' +
      'than a separate connection.',
    fields: [
      { key: 'LH_CRM_BASE_URL', label: 'Base url', placeholder: 'https://ihp.tldcrm.com' },
      { key: 'LH_CRM_API_ID', label: 'API id' },
      { key: 'LH_CRM_API_KEY', label: 'API key', secret: true },
    ],
  },
  {
    name: 'vendor',
    label: 'Vendor',
    hint:
      'The vendor source, which is how the site posts a lead in when the form is submitted. ' +
      'Write only, and not interchangeable with the CRM API key above.',
    fields: [
      { key: 'LH_VENDOR_POST_URL', label: 'Post url', placeholder: 'https://ihp.tldcrm.com/post' },
      {
        key: 'LH_VENDOR_RESULTS_URL',
        label: 'Results log url',
        placeholder: 'https://ihp.tldcrm.com/public/vendors',
        optional: true,
      },
      { key: 'LH_VENDOR_ID', label: 'Vendor id', placeholder: '15781' },
      { key: 'LH_VENDOR_POST_KEY', label: 'Post key', secret: true },
    ],
  },
]

// Flattened for the route, which checks membership rather than reading groups
export const WRITABLE_KEYS = new Set(
  INTEGRATIONS.flatMap((integration) => integration.fields.map((field) => field.key))
)

/*
 The allowlist can only ever hold addresses on the allowed domain. Enforced
 here rather than only in the UI, so it holds against a direct POST as well as
 against the form.

 The domain is read from the environment because it is not writable through
 this route, which is what stops the domain and the list being widened in the
 same request. The break glass address is outside the domain by design and is
 also environment only. See auth.js.
*/
function validateEmailList(value) {
  const domain = String(process.env.LH_ADMIN_ALLOWED_DOMAIN || '').trim().toLowerCase()
  if (!domain) return 'LH_ADMIN_ALLOWED_DOMAIN is not set, so no address can be checked.'

  const entries = value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  const malformed = entries.filter((email) => !EMAIL_SHAPE.test(email))
  if (malformed.length > 0) return `Not a valid address: ${malformed.join(', ')}`

  const offDomain = entries.filter((email) => email.split('@')[1] !== domain)
  if (offDomain.length > 0) {
    return `Only ${domain} addresses can be listed here. Refused: ${offDomain.join(', ')}`
  }

  return null
}

export function validateValue(key, value) {
  if (!WRITABLE_KEYS.has(key)) return `${key} is not a writable setting.`
  if (typeof value !== 'string') return `${key} must be a string.`
  if (/[\r\n]/.test(value)) return `${key} cannot contain a line break.`
  if (value.length > 500) return `${key} is too long.`
  if (key === 'LH_ADMIN_ALLOWED_EMAILS' && value) return validateEmailList(value)

  return null
}
