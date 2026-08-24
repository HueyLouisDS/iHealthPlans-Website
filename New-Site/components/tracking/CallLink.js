'use client'
import { PHONE_NUMBER } from '@/lib/siteConfig'

export default function CallLink({ location, className, children, number = PHONE_NUMBER }) {
  const dialable = number.replace(/[^0-9+]/g, '')   // tel: takes digits only, no formatting

  function handleClick() {
  }

  return (
    <a href={`tel:${dialable}`} className={className} onClick={handleClick} data-lh-call-location={location}>
      {children}
    </a>
  )
}
