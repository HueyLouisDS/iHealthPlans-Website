'use client'

// The editable integration cards on /admin/integrations, plus the Configure
// button that saves them. Client side because the fields open on click.
// Receives the described shape from the server page, never a config object,
// so no credential crosses the boundary.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { INTEGRATIONS } from '@/lib/integrations/fields'

/*=======================================================
        NOTHING HERE EVER RECEIVES A CREDENTIAL
========================================================*/

/*
 * The props carry presence booleans and label text. A value typed into one of
 * these inputs goes straight to the route and is dropped from state on save,
 * so it never sits in a component that a React devtools session could read.
 *
 * Inputs use type="password" for secrets and autoComplete="off" throughout, so
 * the browser does not offer to remember an api key in a password manager
 * under the admin site's origin.
 */

/**
 * One environment variable, as a clickable pill that opens an input.
 *
 * The pill is the variable name, which is what somebody scanning the page is
 * looking for anyway. Clicking it is how the field opens, so the thing you
 * read and the thing you click are the same thing.
 */
function EnvField({ field, isSet, value, onChange }) {
  const [open, setOpen] = useState(false)   // whether the input is showing
  const hasEdit = value !== undefined       // true once anything is typed this session

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
          <span className="text-sm text-[#6C7381]">not set</span>
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
            className="font-mono text-sm border rounded px-2 py-1.5 w-full max-w-full focus:outline-none focus:ring-2 focus:ring-ihealthGreen"
          />
        </label>
      )}
    </div>
  )
}

/**
 * One integration card, status on top and the editable fields below.
 */
function Card({ integration, status, present, values, onChange }) {
  return (
    <div className="bg-white border rounded-lg p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-ihealthBlue">{integration.label}</h2>

        <span
          className={`px-3 py-1 rounded text-sm font-bold uppercase tracking-[1.2px] ${
            status.isConfigured ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {status.isConfigured ? 'Connected' : 'Not configured'}
        </span>
      </div>

      <p className="text-sm text-[#6C7381]">{integration.hint}</p>

      <div className="flex flex-col gap-3 border-t pt-4">
        {integration.fields.map((field) => (
          <EnvField
            key={field.key}
            field={field}
            isSet={Boolean(present[field.key])}
            value={values[field.key]}
            onChange={onChange}
          />
        ))}
      </div>

      <p className="text-sm text-[#6C7381] border-t pt-4">
        All 3 together, since 2 of 3 sends a request to the right host with no key and gets a 401
        nobody reads.
      </p>
    </div>
  )
}

/**
 * The cards and the Configure button, holding the pending edits between them.
 *
 * One save for the whole page rather than one per field, because a partly
 * configured integration is the state the status badge exists to warn about
 * and there is no reason to pass through it on the way to a complete one.
 */
export default function IntegrationCards({ statuses, present, canWrite }) {
  const router = useRouter()
  const [values, setValues] = useState({})  // pending edits, key to typed value
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null) // last save outcome, shown beside the button

  const changedCount = Object.keys(values).length

  function handleChange(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
    setResult(null)
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

      /*
       * Cleared on success so a typed key does not stay in client state after
       * it has been written. The refresh below re-reads presence from the
       * server, which is what the page should be showing anyway.
       */
      setValues({})
      setResult({ ok: true, message: body.note || 'Saved.' })
      router.refresh()
    } catch {
      setResult({ ok: false, message: 'Could not reach the server.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {INTEGRATIONS.map((integration) => (
          <Card
            key={integration.name}
            integration={integration}
            status={statuses[integration.name] || { isConfigured: false }}
            present={present}
            values={values}
            onChange={handleChange}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-end gap-4 flex-wrap">
        {result && (
          <p className={`text-base ${result.ok ? 'text-green-900' : 'text-amber-900'}`}>
            {result.message}
          </p>
        )}

        {!canWrite && (
          <p className="text-base text-[#6C7381]">
            Read only. Set these on the host in a deployed environment.
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={!canWrite || saving || changedCount === 0}
          className="bg-ihealthGreen text-white font-bold px-6 py-2.5 rounded hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {saving ? 'Saving' : changedCount > 0 ? `Configure (${changedCount})` : 'Configure'}
        </button>
      </div>
    </>
  )
}
