'use client'

// The editable integration cards on /admin/integrations, their Test Connection
// buttons, and the Configure button that saves them. Client side because the
// fields open on click. Receives the described shape from the server page,
// never a config object, so no credential crosses the boundary.

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

/*
 The allowlist as removable chips, one address per Enter. Stored as the same
 comma separated string the environment holds, so the save and test routes are
 unchanged, the joining just happens here instead of in the user's head.

 Shown open rather than behind the key name like the credential fields, since
 the list is not a secret and hiding it makes the remove buttons unfindable.
*/
function EmailListField({ field, domain, saved, value, onChange }) {
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

      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 border border-amber-300 rounded px-2 py-1 font-mono text-sm"
            >
              {email}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                aria-label={`Remove ${email}`}
                className="text-amber-900 hover:text-red-900 font-bold leading-none text-base"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
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

function Card({ integration, status, present, admin, values, onChange, test, onTest }) {
  const state = test?.state || UNTESTED

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

      <div className="border-t pt-4 flex items-center justify-between gap-3 flex-wrap">
        {test?.message ? (
          <p className={`text-sm ${state === CONNECTED ? 'text-green-900' : 'text-red-900'}`}>
            {test.message}
          </p>
        ) : (
          <span className="text-sm text-[#6C7381]">Connection not set</span>
        )}

        <button
          type="button"
          onClick={() => onTest(integration.name)}
          disabled={state === TESTING}
          className="border border-ihealthBlue text-ihealthBlue font-bold text-sm px-4 py-2 rounded hover:bg-ihealthBlue hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {state === TESTING ? 'Testing' : 'Test Connection'}
        </button>
      </div>
    </div>
  )
}

export default function IntegrationCards({ statuses, present, admin, canWrite }) {
  const router = useRouter()
  const [values, setValues] = useState({})  // pending edits, key to typed value
  const [tests, setTests] = useState({})    // integration name to { state, message }
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const changedCount = Object.keys(values).length
  const allConnected = INTEGRATIONS.every((one) => tests[one.name]?.state === CONNECTED)

  function handleChange(key, value) {
    const owner = INTEGRATIONS.find((one) => one.fields.some((field) => field.key === key))

    setValues((current) => ({ ...current, [key]: value }))
    setResult(null)

    if (owner) {
      setTests((current) => ({ ...current, [owner.name]: undefined }))
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

  async function handleSave() {
    setSaving(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      })

      const body = await response.json()

      if (!response.ok) {
        setResult({ ok: false, message: body.errors?.join(' ') || body.error || 'Save failed.' })
        return
      }
      setValues({})
      setResult({ ok: true, message: body.note || 'Saved.' })
      router.refresh()
    } catch {
      setResult({ ok: false, message: 'Could not reach the server.' })
    } finally {
      setSaving(false)
    }
  }

  const blockedReason = !canWrite       // why the button is disabled, shown to the user
    ? 'Read only. Set these on the host in a deployed environment.'
    : changedCount === 0
      ? 'Nothing to save.'
      : !allConnected
        ? 'Test both connections first.'
        : null

  return (
    <>
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
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-end gap-4 flex-wrap">
        {result && (
          <p className={`text-base ${result.ok ? 'text-green-900' : 'text-amber-900'}`}>
            {result.message}
          </p>
        )}

        {!result && blockedReason && (
          <p className="text-base text-[#6C7381]">{blockedReason}</p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={Boolean(blockedReason) || saving}
          className="bg-ihealthGreen text-white font-bold px-6 py-2.5 rounded hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {saving ? 'Saving' : changedCount > 0 ? `Configure (${changedCount})` : 'Configure'}
        </button>
      </div>
    </>
  )
}
