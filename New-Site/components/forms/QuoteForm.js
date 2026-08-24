'use client'
import { useState } from 'react'
import Image from 'next/image'
import FloatingLabelInput from '@/components/forms/FloatingLabelInput'
import TcpaConsent from '@/components/compliance/TcpaConsent'
import { BUSINESS_HOURS } from '@/lib/siteConfig'

const EMPTY = { zip: '', firstName: '', lastName: '', phone: '', bestTime: '', onBehalfOf: '' }

const BEST_TIMES = [
  { value: 'morning', label: 'Morning, 9 AM to 12 PM' },
  { value: 'afternoon', label: 'Afternoon, 12 PM to 5:30 PM' },
  { value: 'anytime', label: 'Any time during business hours' },
]

const ON_BEHALF_OPTIONS = [
  { value: 'self', label: 'Myself' },
  { value: 'other', label: 'A parent or family member' },
]

function validate(values) {
  const errors = {}

  if (!/^[0-9]{5}$/.test(values.zip.trim())) errors.zip = 'Please enter your 5 digit zip code.'
  if (!values.firstName.trim()) errors.firstName = 'Please enter your first name.'
  if (!values.lastName.trim()) errors.lastName = 'Please enter your last name.'
  if (values.phone.replace(/[^0-9]/g, '').length < 10) {
    errors.phone = 'Please enter a phone number we can reach you on.'
  }

  if (!values.onBehalfOf) errors.onBehalfOf = 'Please tell us who this is for.'

  return errors
}

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
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="w-5 h-5 flex-shrink-0 accent-[#08a350]"
              />
              <span className="text-base">{option.label}</span>
            </label>
          )
        })}
      </div>

      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </fieldset>
  )
}

export default function QuoteForm({ isCallback = false, initialZip = '' }) {
  const [values, setValues] = useState({
    ...EMPTY,
    zip: /^[0-9]{5}$/.test(initialZip) ? initialZip : '',
  })
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

    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus()
      return
    }

    setStatus('submitting')

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, requestedCallback: isCallback }),
      })

      if (!response.ok) throw new Error(`Request failed with ${response.status}`)
      setStatus('submitted')
    } catch (error) {
      // Never leave someone on a spinner after they have typed their details in
      console.error('Lead submission failed', error)
      setStatus('failed')
    }
  }

  if (status === 'submitted') {
    return (
      <div className="w-full max-w-xl mx-auto border rounded-xl p-10 text-center flex flex-col items-center gap-5">
        <Image src="/icons/check-icon.svg" alt="" width={48} height={48} />
        <h2 className="text-2xl font-bold text-ihealthBlue">Thank you, we have your details.</h2>
        <p className="text-lg text-[#505258]">
          A licensed insurance agent will call you
          {values.bestTime === 'morning'
            ? ' in the morning'
            : values.bestTime === 'afternoon'
              ? ' in the afternoon'
              : ''}
          . Our hours are {BUSINESS_HOURS}.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl mx-auto border rounded-xl p-8 sm:p-10">
      <h2 className="text-2xl sm:text-3xl font-bold text-ihealthBlue">
        {isCallback ? 'Request a callback' : 'Get a free quote'}
      </h2>
      <p className="text-lg text-[#505258] mt-3 mb-8">
        {isCallback
          ? `Our agents are not available right now. Leave your details and a licensed insurance agent will call you back. Our hours are ${BUSINESS_HOURS}.`
          : 'Tell us how to reach you and a licensed insurance agent will talk through the Medicare Advantage plan options available in your area.'}
      </p>

      <form className="w-full flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        <FloatingLabelInput
          name="zip"
          label="Zip code"
          required
          inputMode="numeric"
          autoComplete="postal-code"
          value={values.zip}
          onChange={handleChange('zip')}
          error={errors.zip}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FloatingLabelInput
            name="firstName"
            label="First name"
            required
            autoComplete="given-name"
            value={values.firstName}
            onChange={handleChange('firstName')}
            error={errors.firstName}
          />
          <FloatingLabelInput
            name="lastName"
            label="Last name"
            required
            autoComplete="family-name"
            value={values.lastName}
            onChange={handleChange('lastName')}
            error={errors.lastName}
          />
        </div>

        <FloatingLabelInput
          name="phone"
          label="Phone number"
          type="tel"
          required
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={handleChange('phone')}
          error={errors.phone}
        />

        <ChoiceGroup
          legend="Who is this for?"
          name="onBehalfOf"
          options={ON_BEHALF_OPTIONS}
          value={values.onBehalfOf}
          onChange={handleChange('onBehalfOf')}
          error={errors.onBehalfOf}
        />

        <ChoiceGroup
          legend="Best time to call"
          name="bestTime"
          options={BEST_TIMES}
          value={values.bestTime}
          onChange={handleChange('bestTime')}
        />

        <TcpaConsent />

        {status === 'failed' && (
          <p role="alert" className="text-base text-red-600">
            Something went wrong sending your details. Please try again, or call us directly.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full h-14 px-6 rounded-lg bg-ihealthGreen text-white text-lg font-semibold disabled:opacity-60 hover:brightness-95 transition-[filter] focus:outline-none focus:ring-4 focus:ring-ihealthGreen/40"
        >
          {status === 'submitting' ? 'Sending...' : isCallback ? 'Request my callback' : 'Get my free quote'}
        </button>
      </form>
    </div>
  )
}
