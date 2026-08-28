'use client'
// The form behind the Online row on the privacy rights page.
//
// Every visible string comes from lib/content/privacyRequest.js, none of it
// from here, so the wording can be reviewed in one file. Validation is shared
// with the server through lib/privacy/schema.js and returns copy keys rather
// than sentences, for the same reason.

import { useState } from 'react'
import FloatingLabelInput from '@/components/forms/FloatingLabelInput'
import { validateRequest } from '@/lib/privacy/schema'
import { COPY, REQUEST_TYPES, ON_BEHALF_OPTIONS } from '@/lib/content/privacyRequest'

const EMPTY = {
  requestType: '',
  onBehalfOf: '',
  relationship: '',
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  state: '',
  details: '',
}

// One radio group, styled to match the quote form
function ChoiceGroup({ legend, name, options, value, onChange, error }) {
  return (
    <fieldset className="w-full">
      <legend className="text-base font-semibold text-ihealthBlue mb-2">{legend}</legend>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.value

          return (
            <label
              key={option.value}
              className={`flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${
                isSelected ? 'border-ihealthGreen bg-ihealthGreen/5' : 'border-black/10 hover:border-black/25'
              }`}
            >
              <input
                type="radio"
                id={value === option.value ? name : undefined}
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="w-5 h-5 accent-ihealthGreen"
              />
              <span className="text-base">{option.label}</span>
            </label>
          )
        })}
      </div>

      {error && (
        <p id={`${name}-error`} className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export default function PrivacyRequestForm() {
  const [values, setValues] = useState(EMPTY)
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('editing')

  function handleChange(field) {
    return (eventOrValue) => {
      const next = typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value
      setValues((current) => ({ ...current, [field]: next }))
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    /*
     The attestation text travels with the submission rather than being looked
     up server side, so the row stores the exact wording that was on screen.
     Page copy changes, and the version somebody agreed to does not.
    */
    const payload = {
      ...values,
      attestationAccepted: accepted,
      attestationText: COPY.attestation,
    }

    const found = validateRequest(payload)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus()
      return
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/privacy-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(`Request failed with ${response.status}`)
      setStatus('submitted')
    } catch (error) {
      /*
       A failed privacy request is not the same as a failed quote. The deadline
       only starts when the row exists, so somebody who sees an error here has
       to be told to use another contact method rather than assume it landed.
      */
      console.error('Privacy request submission failed', error)
      setStatus('failed')
    }
  }

  // Reads a copy key back out as a string, since validation returns keys
  function messageFor(field) {
    const key = errors[field]
    return key ? COPY[key] : undefined
  }

  if (status === 'submitted') {
    return (
      <div className="w-full max-w-xl mx-auto border rounded-xl p-10 flex flex-col items-start gap-5">
        <h2 className="text-2xl font-bold text-ihealthBlue">{COPY.successHeadline}</h2>
        <p className="text-lg text-[#505258]">{COPY.successBody}</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto border rounded-xl p-8 sm:p-10">
      <form className="w-full flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        <ChoiceGroup
          legend={COPY.requestTypeLabel}
          name="requestType"
          options={REQUEST_TYPES}
          value={values.requestType}
          onChange={handleChange('requestType')}
          error={messageFor('requestType')}
        />

        <ChoiceGroup
          legend={COPY.onBehalfLabel}
          name="onBehalfOf"
          options={ON_BEHALF_OPTIONS}
          value={values.onBehalfOf}
          onChange={handleChange('onBehalfOf')}
          error={messageFor('onBehalfOf')}
        />

        {values.onBehalfOf === 'other' && (
          <FloatingLabelInput
            name="relationship"
            label={COPY.relationship}
            value={values.relationship}
            onChange={handleChange('relationship')}
            error={messageFor('relationship')}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatingLabelInput
            name="firstName"
            label={COPY.firstName}
            autoComplete="given-name"
            value={values.firstName}
            onChange={handleChange('firstName')}
            error={messageFor('firstName')}
          />
          <FloatingLabelInput
            name="lastName"
            label={COPY.lastName}
            autoComplete="family-name"
            value={values.lastName}
            onChange={handleChange('lastName')}
            error={messageFor('lastName')}
          />
        </div>

        {/* The telephone number is what a request is verified against, so it
            is required even when somebody would rather only give an email */}
        <FloatingLabelInput
          name="phone"
          label={COPY.phone}
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={values.phone}
          onChange={handleChange('phone')}
          error={messageFor('phone')}
        />

        <FloatingLabelInput
          name="email"
          label={COPY.email}
          type="email"
          required
          autoComplete="email"
          value={values.email}
          onChange={handleChange('email')}
          error={messageFor('email')}
        />

        <FloatingLabelInput
          name="state"
          label={COPY.state}
          autoComplete="address-level1"
          value={values.state}
          onChange={handleChange('state')}
          error={messageFor('state')}
        />

        <div className="w-full">
          <label htmlFor="details" className="block text-base font-semibold text-ihealthBlue mb-2">
            {COPY.details}
          </label>
          <textarea
            id="details"
            name="details"
            rows={4}
            value={values.details}
            onChange={handleChange('details')}
            className="w-full border border-black border-opacity-5 rounded-lg px-3 py-2.5 text-[#5C5F69] focus:border-[#214F7A] focus:outline-none focus:ring-0"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            id="attestationAccepted"
            checked={accepted}
            onChange={(event) => {
              setAccepted(event.target.checked)
              setErrors((current) => ({ ...current, attestationAccepted: undefined }))
            }}
            className="w-5 h-5 mt-1 accent-ihealthGreen shrink-0"
          />
          <span className="text-base leading-relaxed">{COPY.attestation}</span>
        </label>

        {messageFor('attestationAccepted') && (
          <p className="text-sm text-red-600 -mt-3">{messageFor('attestationAccepted')}</p>
        )}

        {status === 'failed' && (
          <p role="alert" className="text-base text-red-600">
            {COPY.errorGeneric}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full min-h-[56px] rounded-lg bg-ihealthGreen text-white text-lg font-semibold disabled:opacity-60"
        >
          {status === 'submitting' ? COPY.submitting : COPY.submit}
        </button>
      </form>
    </div>
  )
}
