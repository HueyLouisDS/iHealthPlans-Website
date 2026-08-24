// Which environment variables each integration needs, and how to label them.
// Deliberately carries no `import 'server-only'`, because both the admin client
// component and the write route import it and they have to agree on the same
// list. It holds names and labels only, never a value.

/*=======================================================
        THIS LIST IS THE WRITE WHITELIST
========================================================*/

/*
 * The route refuses any key not named here. That is the whole protection
 * against a form that writes to .env.local, since an unrestricted write could
 * set NODE_OPTIONS and get arbitrary code loaded on the next restart.
 *
 * Adding a row here grants write access to that variable. Nothing else does.
 * AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are absent on purpose,
 * they are not integration settings and nothing should be able to rotate them
 * through a web form.
 */
export const INTEGRATIONS = [
  {
    name: 'crm',
    label: 'CRM',
    hint:
      'TLD. The API key created under Settings, API, which is a different place from the vendor ' +
      'source that Lead Post uses. Everything the site reads comes through this.',
    fields: [
      { key: 'LH_CRM_BASE_URL', label: 'Base url', placeholder: 'https://ihp.tldcrm.com' },
      { key: 'LH_CRM_API_ID', label: 'API id' },
      { key: 'LH_CRM_API_KEY', label: 'API key', secret: true },
    ],
  },
  {
    name: 'dialer',
    label: 'Dialer',
    hint: 'The dialer side, if it is ever reached separately from the CRM API above.',
    fields: [
      { key: 'LH_DIALER_BASE_URL', label: 'Base url' },
      { key: 'LH_DIALER_API_ID', label: 'API id' },
      { key: 'LH_DIALER_API_KEY', label: 'API key', secret: true },
    ],
  },
  {
    name: 'dialer_post',
    label: 'Lead Post',
    hint: 'Writes a lead into TLD when the site form is submitted.',
    fields: [
      { key: 'LH_DIALER_POST_URL', label: 'Post url', placeholder: 'https://ihp.tldcrm.com/post' },
      { key: 'LH_DIALER_POST_VENDOR_ID', label: 'Vendor id', placeholder: '15781' },
      { key: 'LH_DIALER_POST_KEY', label: 'Post key', secret: true },
    ],
  },
]

/* Flattened for the route, which checks membership rather than reading groups */
export const WRITABLE_KEYS = new Set(
  INTEGRATIONS.flatMap((integration) => integration.fields.map((field) => field.key))
)

/**
 * Checks one submitted value.
 *
 * The newline rule is the important one. A value carrying a line break would
 * write a second line into .env.local, so a post key field could define any
 * variable at all and defeat the whitelist above.
 */
export function validateValue(key, value) {
  if (!WRITABLE_KEYS.has(key)) return `${key} is not a writable setting.`
  if (typeof value !== 'string') return `${key} must be a string.`
  if (/[\r\n]/.test(value)) return `${key} cannot contain a line break.`
  if (value.length > 500) return `${key} is too long.`
  return null
}
