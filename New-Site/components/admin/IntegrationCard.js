'use client'

// The editable integration cards on /admin/integrations, with a Test
// Connection and a Save on each. Client side because the fields open on click.
// Receives the described shape from the server page, never a config object, so
// no credential crosses the boundary.
//
// Save is per card on purpose. A single page level button gated on every card
// being connected meant the admin allowlist could not be saved without working
// CRM and vendor credentials, which have nothing to do with who may sign in.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { INTEGRATIONS, EMAIL_LIST, EMAIL_SHAPE } from '@/lib/integrations/fields'

/*=======================================================
        NOTHING HERE EVER RECEIVES A CREDENTIAL
========================================================*/
const UNTESTED = 'untested'             // per card connection state
const TESTING = 'testing'
const CONNECTED = 'connected'
const FAILED = 'failed'

function EnvField({ field, isSet, value, onChange }) {
  const [open, setOpen] = useState(false)   // whether the input is showing
  const hasEdit = value !== undefined   // true once anything is typed this session

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-expanded={open}
          className={`font-mono text-sm px-2 py-1 rounded border transition-colors ${
            open
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'text-amber-900 border-transparent hover:bg-amber-100 hover:border-amber-200'
          }`}
        >
          {field.key}
        </button>

        {hasEdit ? (
          <span className="text-sm font-semibold text-ihealthGreen">edited</span>
        ) : isSet ? (
          <span className="text-sm font-semibold text-green-900">set</span>
        ) : (
          <span className={`text-sm ${field.optional ? 'text-[#6C7381]' : 'text-amber-900'}`}>
            {field.optional ? 'not set, optional' : 'not set'}
          </span>
        )}
      </div>

      {open && (
        <label className="flex flex-col gap-1 pl-2 border-l-2 border-amber-200">
          <span className="text-sm text-[#505258]">
            {field.label}
            {field.secret && isSet && ' (already set, typing replaces it)'}
          </span>
          <input
            type={field.secret ? 'password' : 'text'}
            autoComplete="off"
            spellCheck={false}
            placeholder={field.placeholder || ''}
            value={value ?? ''}
            onChange={(event) => onChange(field.key, event.target.value)}
            className="font-mono text-sm border rounded px-2 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-ihealthGreen"
          />
        </label>
      )}
    </div>
  )
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const VERIFIED = 'verified'

/*
 Whether this person has actually completed a Google sign in, or is only on
 the list. Being listed is permission, verification is proof they can use it,
 and an address that is listed but never verified is usually a typo nobody
 noticed rather than somebody who has not got round to it.

 Sending the invite needs somewhere to keep a token, which is admin_users and
 admin_invites in migration 003. Rendered disabled rather than hidden so the
 flow is visible and it is obvious why it does not fire yet.
*/
function VerifyState({ email, status }) {
  if (status === VERIFIED) {
    return <span className="text-sm font-semibold text-green-900">Verified</span>
  }

  return (
    <span
      className="text-sm font-semibold text-[#6C7381] cursor-not-allowed"
      title={`Sending an invite to ${email} needs the admin_users table, migration 003`}
    >
      Verify
    </span>
  )
}

/*
 The allowlist as removable rows, one address per Enter. Stored as the same
 comma separated string the environment holds, so the save and test routes are
 unchanged, the joining just happens here instead of in the user's head.

 Shown open rather than behind the key name like the credential fields, since
 the list is not a secret and hiding it makes the remove buttons unfindable.
*/
function EmailListField({ field, domain, saved, statuses, value, onChange }) {
  const [draft, setDraft] = useState('')     // the address being typed, not yet a chip
  const [problem, setProblem] = useState(null)

  const emails = parseList(value ?? saved)   // pending edit wins over what is saved

  function addEmail() {
    const entry = draft.trim().toLowerCase()
    if (!entry) return

    if (!EMAIL_SHAPE.test(entry)) return setProblem('That is not an email address.')
    if (domain && entry.split('@')[1] !== domain) {
      return setProblem(`Only ${domain} addresses can be added.`)
    }
    if (emails.includes(entry)) return setProblem('Already on the list.')

    onChange(field.key, [...emails, entry].join(','))
    setDraft('')
    setProblem(null)
  }

  function removeEmail(target) {
    onChange(field.key, emails.filter((email) => email !== target).join(','))
    setProblem(null)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addEmail()
      return
    }

    // Backspace on an empty box takes the last chip back, the usual behaviour here
    if (event.key === 'Backspace' && draft === '' && emails.length > 0) {
      removeEmail(emails[emails.length - 1])
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-sm px-2 py-1 text-amber-900">{field.key}</span>
        {emails.length === 0 ? (
          <span className="text-sm text-amber-900">nobody can sign in</span>
        ) : (
          <span className="text-sm font-semibold text-green-900">
            {emails.length} {emails.length === 1 ? 'address' : 'addresses'}
          </span>
        )}
      </div>

      {/* One per row rather than wrapped. These are a list of people, and a
          wrapped run reads as tags on a thing rather than as an access list. */}
      {emails.length > 0 && (
        <ul className="flex flex-col gap-2">
          {emails.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between gap-3 bg-amber-100 text-amber-900 border border-amber-300 rounded px-3 py-2"
            >
              <span className="font-mono text-sm truncate">{email}</span>

              <div className="flex items-center gap-3 flex-shrink-0">
                <VerifyState email={email} status={statuses[email]} />

                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  aria-label={`Remove ${email}`}
                  className="text-amber-900 hover:text-red-900 font-bold leading-none text-lg"
                >
                  &times;
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        type="email"
        autoComplete="off"
        spellCheck={false}
        disabled={!domain}
        placeholder={domain ? `name@${domain}, then Enter` : 'Set LH_ADMIN_ALLOWED_DOMAIN first'}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          setProblem(null)
        }}
        onKeyDown={handleKeyDown}
        onBlur={addEmail}
        className="font-mono text-sm border rounded px-2 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-ihealthGreen disabled:bg-[#f7f7f7] disabled:cursor-not-allowed"
      />

      {problem && <p className="text-sm text-red-900">{problem}</p>}
    </div>
  )
}

function StatusBadge({ state, isConfigured }) {
  if (state === CONNECTED) {
    return <Badge className="bg-green-100 text-green-900">Connected</Badge>
  }

  if (state === TESTING) {
    return <Badge className="bg-blue-100 text-blue-900">Testing</Badge>
  }

  if (state === FAILED) {
    return <Badge className="bg-red-100 text-red-900">Failed</Badge>
  }

  if (isConfigured) {
    return <Badge className="bg-amber-100 text-amber-900">Set, untested</Badge>
  }

  return <Badge className="bg-amber-100 text-amber-900">Not configured</Badge>
}

function Badge({ className, children }) {
  return (
    <span className={`px-3 py-1 rounded text-sm font-bold uppercase tracking-[1.2px] ${className}`}>
      {children}
    </span>
  )
}

function Card({ integration, status, present, admin, values, onChange, test, onTest, onSave, save, canWrite }) {
  const state = test?.state || UNTESTED

  // This card's own pending edits. Saving one card must not carry another's.
  const changed = integration.fields.filter((field) => values[field.key] !== undefined)

  const blocked = !canWrite
    ? 'Read only here, set these on the host.'
    : changed.length === 0
      ? null
      : state !== CONNECTED
        ? 'Test the connection first.'
        : null

  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-ihealthBlue">{integration.label}</h2>
        <StatusBadge state={state} isConfigured={status.isConfigured} />
      </div>

      <p className="text-sm text-[#6C7381]">{integration.hint}</p>

      <div className="flex flex-col gap-3 border-t pt-4">
        {integration.fields.map((field) =>
          field.kind === EMAIL_LIST ? (
            <EmailListField
              key={field.key}
              field={field}
              domain={admin.domain}
              saved={admin.emails}
              statuses={admin.statuses || {}}
              value={values[field.key]}
              onChange={onChange}
            />
          ) : (
            <EnvField
              key={field.key}
              field={field}
              isSet={Boolean(present[field.key])}
              value={values[field.key]}
              onChange={onChange}
            />
          )
        )}
      </div>

      {/*
       Save is per card, not per page. A single Configure button gated on all
       3 cards being connected meant the admin list could not be saved without
       working CRM and vendor credentials, which are unrelated to who is
       allowed to sign in.
      */}
      <div className="border-t pt-4 flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => onSave(integration.name)}
          disabled={changed.length === 0 || Boolean(blocked) || save?.isSaving}
          className="bg-ihealthGreen text-white font-bold text-sm px-5 py-2 rounded hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {save?.isSaving ? 'Saving' : changed.length > 0 ? `Save (${changed.length})` : 'Save'}
        </button>

        <button
          type="button"
          onClick={() => onTest(integration.name)}
          disabled={state === TESTING}
          className="border border-ihealthBlue text-ihealthBlue font-bold text-sm px-4 py-2 rounded hover:bg-ihealthBlue hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {state === TESTING ? 'Testing' : 'Test Connection'}
        </button>
      </div>

      {/* One line under the buttons, so a save result and a test result never
          fight for the same slot */}
      <p
        className={`text-sm ${
          save?.result
            ? save.result.ok
              ? 'text-green-900'
              : 'text-red-900'
            : state === CONNECTED
              ? 'text-green-900'
              : test?.message
                ? 'text-red-900'
                : 'text-[#6C7381]'
        }`}
      >
        {save?.result?.message || blocked || test?.message || 'Connection not set'}
      </p>
    </div>
  )
}

export default function IntegrationCards({ statuses, present, admin, canWrite }) {
  const router = useRouter()
  const [values, setValues] = useState({})  // pending edits, key to typed value
  const [tests, setTests] = useState({})    // integration name to { state, message }
  const [saves, setSaves] = useState({})    // integration name to { isSaving, result }

  function handleChange(key, value) {
    const owner = INTEGRATIONS.find((one) => one.fields.some((field) => field.key === key))

    setValues((current) => ({ ...current, [key]: value }))

    /*
     An edit invalidates that card's test and clears its last save message.
     Leaving either up would show a green Connected against a credential
     nobody has tried yet.
    */
    if (owner) {
      setTests((current) => ({ ...current, [owner.name]: undefined }))
      setSaves((current) => ({ ...current, [owner.name]: undefined }))
    }
  }

  async function handleTest(name) {
    setTests((current) => ({ ...current, [name]: { state: TESTING, message: null } }))

    try {
      const response = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, values }),
      })

      const body = await response.json()
      const ok = response.ok && body.ok === true

      setTests((current) => ({
        ...current,
        [name]: {
          state: ok ? CONNECTED : FAILED,
          message: body.message || body.errors?.join(' ') || body.error || 'Test failed.',
        },
      }))
    } catch {
      setTests((current) => ({
        ...current,
        [name]: { state: FAILED, message: 'Could not reach the server.' },
      }))
    }
  }

  /* saves one card's fields, never the whole form */
  async function handleSave(name) {
    const integration = INTEGRATIONS.find((one) => one.name === name)
    if (!integration) return

    // Only this card's keys, so an untested card's edits cannot ride along
    const payload = {}
    for (const field of integration.fields) {
      if (values[field.key] !== undefined) payload[field.key] = values[field.key]
    }

    setSaves((current) => ({ ...current, [name]: { isSaving: true, result: null } }))

    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: payload }),
      })

      const body = await response.json()

      if (!response.ok) {
        setSaves((current) => ({
          ...current,
          [name]: {
            isSaving: false,
            result: { ok: false, message: body.errors?.join(' ') || body.error || 'Save failed.' },
          },
        }))
        return
      }

      // Clear only what was saved, so another card keeps its pending edits
      setValues((current) => {
        const next = { ...current }
        for (const key of Object.keys(payload)) delete next[key]
        return next
      })

      setSaves((current) => ({
        ...current,
        [name]: { isSaving: false, result: { ok: true, message: body.note || 'Saved.' } },
      }))

      router.refresh()
    } catch {
      setSaves((current) => ({
        ...current,
        [name]: { isSaving: false, result: { ok: false, message: 'Could not reach the server.' } },
      }))
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {INTEGRATIONS.map((integration) => (
        <Card
          key={integration.name}
          integration={integration}
          status={statuses[integration.name] || { isConfigured: false }}
          present={present}
          admin={admin}
          values={values}
          onChange={handleChange}
          test={tests[integration.name]}
          onTest={handleTest}
          save={saves[integration.name]}
          onSave={handleSave}
          canWrite={canWrite}
        />
      ))}
    </div>
  )
}
