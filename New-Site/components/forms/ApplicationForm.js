'use client'
import { useState } from 'react'
import Image from 'next/image'
import FloatingLabelInput from '@/components/forms/FloatingLabelInput'

const EMPTY_APPLICATION = { fullName: '', phone: '', email: '' }

function validate(application) {
  const errors = {}

  if (!application.fullName.trim()) errors.fullName = 'Please enter your full name.'
  const digits = application.phone.replace(/[^0-9]/g, '')
  if (digits.length < 10) errors.phone = 'Please enter a phone number we can reach you on.'

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }

  return errors
}

export default function ApplicationForm() {
  const [application, setApplication] = useState(EMPTY_APPLICATION)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('editing')

  function handleChange(field) {
    return (event) => {
      const { value } = event.target
      setApplication((current) => ({ ...current, [field]: value }))
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const found = validate(application)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setStatus('submitting')

    try {
      const response = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(application),
      })

      if (!response.ok) throw new Error(`Request failed with ${response.status}`)
      setStatus('submitted')
    } catch (error) {
      console.error('Careers application failed to send', error)
      setStatus('failed')
    }
  }

  if (status === 'submitted') {
    return (
      <div className="w-[400px] max-w-[90%] mx-auto mt-10 text-center">
        <p className="mb-10">Someone will be reaching out to you soon!</p>
        <Image
          src="/icons/health-plans-logo-h.svg"
          alt="iHealth Plans"
          width={1501}
          height={318}
          className="w-full h-auto"
        />
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-start max-w-xl mx-auto border p-10 rounded-xl">
      <h2 className="text-[32px] font-semibold text-ihealthBlue">Join Our Team!</h2>
      <p className="text-[#505258] text-[clamp(18px,1.85vw,20px)] mt-5 mb-10">
        Ready to make a difference? Explore our current openings and find your place in a team
        that&rsquo;s changing the face of healthcare.
      </p>

      <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
        <FloatingLabelInput
          name="fullName"
          label="Full Name"
          required
          autoComplete="name"
          value={application.fullName}
          onChange={handleChange('fullName')}
          error={errors.fullName}
        />
        <FloatingLabelInput
          name="phone"
          label="Phone"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={application.phone}
          onChange={handleChange('phone')}
          error={errors.phone}
        />
        <FloatingLabelInput
          name="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={application.email}
          onChange={handleChange('email')}
          error={errors.email}
        />

        {status === 'failed' && (
          <p role="alert" className="text-sm text-red-600">
            Something went wrong sending your application. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full mx-auto px-6 py-2.5 h-fit bg-ihealthBlue rounded-md text-lg text-white font-semibold disabled:opacity-60"
        >
          {status === 'submitting' ? 'Sending...' : 'Apply Now'}
        </button>
      </form>
    </div>
  )
}
