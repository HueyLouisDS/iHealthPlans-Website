'use client'
import { PHONE_NUMBER } from '@/lib/siteConfig'

export default function CallLink({ location, className, children, number = PHONE_NUMBER }) {
  // tel: cannot contain spaces or formatting, strip anything that is not a digit
  const dialable = number.replace(/[^0-9+]/g, '')

  function handleClick() {
  }

  return (
    <a href={`tel:${dialable}`} className={className} onClick={handleClick} data-lh-call-location={location}>
      {children}
    </a>
  )
}
