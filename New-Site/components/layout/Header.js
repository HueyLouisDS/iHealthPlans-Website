'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AnnouncementBar from '@/components/layout/AnnouncementBar'
import CallLink from '@/components/tracking/CallLink'
import { PHONE_NUMBER, PHONE_TTY, BUSINESS_HOURS, NAV_LINKS } from '@/lib/siteConfig'

const NAV_ITEM_CLASS =
  'flex text-[#111C39] text-base xl:text-lg font-semibold flex-col items-center py-1 relative border-r last:border-r-0 border-[#E5E5E5] hover:opacity-70 transition-opacity duration-300 px-5 xl:px-7 whitespace-nowrap'

function MenuIcon({ className }) {
  return (
    <svg viewBox="0 0 1024 1024" fill="currentColor" className={className} aria-hidden="true">
      <path d="M904 160H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0 624H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8zm0-312H120c-4.4 0-8 3.6-8 8v64c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-64c0-4.4-3.6-8-8-8z" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}

function Logo({ className }) {
  return (
    <Link href="/" className={className}>
      <Image
        src="/icons/health-plans-logo-h.svg"
        alt="iHealth Plans Logo"
        width={275}
        height={58}
        priority
        className="w-full h-fit object-contain"
      />
    </Link>
  )
}

function ChevronIcon({ isOpen }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavDropdown({ link }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`${NAV_ITEM_CLASS} !flex-row gap-1.5 items-center`}
      >
        {link.label}
        <ChevronIcon isOpen={isOpen} />
      </button>

      {/*
        The panel is always in the DOM and hidden with CSS rather than
        conditionally rendered. Mounting it only when open would keep these 4
        links out of the server rendered HTML, which hides them from crawlers.
        pointer-events-none stops the invisible panel swallowing clicks.
      */}
      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div className="w-[280px] bg-white rounded-lg shadow-xl border border-[#E5E5E5] py-2">
          {link.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => setIsOpen(false)}
              tabIndex={isOpen ? 0 : -1}
              className={`block py-3 text-base transition-colors hover:bg-ihealthBlue/5 hover:text-ihealthBlue ${
                child.isOverview
                  ? 'px-5 font-bold text-ihealthBlue border-b border-[#E5E5E5] mb-1'
                  : 'pl-9 pr-5 font-semibold text-[#111C39]'
              }`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <div className="w-full fixed left-0 right-0 top-0 z-50">
        <AnnouncementBar variant="header" location="announcementBar" />

        <div className="w-full py-2 px-4 bg-white shadow-lg">
          <div className="max-w-shell w-full h-full mx-auto flex items-center justify-between">
            {/* Gap stepped down from the original gap-40 for the same reason
                as the item padding, 5 nav items no longer fit beside it */}
            <div className="w-fit flex items-center justify-center gap-6 xl:gap-16">
              <Logo className="w-[clamp(151px,22.68vw,225px)] h-fit flex-shrink-0" />

              <nav className="w-full hidden items-center justify-center lg:flex">
                {NAV_LINKS.map((link) =>
                  link.children ? (
                    <NavDropdown key={link.label} link={link} />
                  ) : (
                    <Link key={link.href} href={link.href} className={NAV_ITEM_CLASS}>
                      {link.label}
                    </Link>
                  )
                )}
              </nav>
            </div>

            <div className="w-fit flex items-center justify-center gap-6">
              <CallLink
                location="headerPhoneBlock"
                className="hidden flex-col items-end hover:opacity-70 transition-opacity duration-300 sm:flex"
              >
                <span className="block text-[clamp(12px,1.48vw,16px)] text-ihealthBlue font-semibold leading-5">
                  Speak to a Licensed Insurance Agent
                </span>
                <span className="block text-[clamp(16px,2.22vw,20px)] text-[#505258] leading-5">
                  Call {PHONE_NUMBER} ({PHONE_TTY})
                </span>
                <span className="block text-[clamp(12px,1.48vw,14px)] text-[#505258] leading-5">
                  {BUSINESS_HOURS}
                </span>
              </CallLink>

              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={isMenuOpen}
                className="w-10 h-10 p-2 rounded-md bg-ihealthBlue flex items-center justify-center cursor-pointer lg:hidden"
              >
                <MenuIcon className="w-full h-full text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="w-full h-screen bg-white fixed top-0 left-0 right-0 z-50 overflow-y-auto flex flex-col">
          <AnnouncementBar variant="menu" location="menuAnnouncementBar" />

          <div className="w-full h-[72px] px-4 flex-shrink-0">
            <div className="max-w-shell w-full h-full mx-auto flex items-center justify-between">
              <Logo className="w-[clamp(151px,22.68vw,245px)] h-fit flex-shrink-0" />
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
                className="w-10 h-10 p-2 rounded-md bg-ihealthBlue flex items-center justify-center cursor-pointer lg:hidden"
              >
                <CloseIcon className="w-full h-full text-white" />
              </button>
            </div>
          </div>

          <div className="w-full px-4 pt-20 grid grid-cols-1 gap-5 flex-shrink-0">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div key={link.label} className="w-full flex flex-col items-start">
                  <span className="w-full flex items-center justify-center text-ihealthBlue/60 font-semibold text-[clamp(16px,3.55vw,32px)]">
                    {link.label}
                  </span>
                  <div className="w-full mt-4 flex flex-col items-center gap-3">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`text-ihealthBlue text-[clamp(14px,3vw,22px)] ${
                          child.isOverview ? 'font-bold underline underline-offset-4' : 'font-semibold'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                  <span className="w-full h-px bg-black/10 mt-5" />
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex flex-col items-start"
                >
                  <span className="w-full flex items-center justify-center text-ihealthBlue font-semibold text-[clamp(16px,3.55vw,32px)]">
                    {link.label}
                  </span>
                  <span className="w-full h-px bg-black/10 mt-5" />
                </Link>
              )
            )}
          </div>

          <div className="w-full mt-10 px-4 mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
            <CallLink
              location="menuSpeakToAgent"
              className="bg-transparent border-2 border-ihealthBlue mx-auto w-full h-fit px-8 py-2.5 text-ihealthBlue rounded-lg font-semibold text-[clamp(16px,3.55vw,20px)] flex items-center justify-center"
            >
              Speak to an Agent
            </CallLink>
            <Link
              href="/quote-health-plans"
              onClick={() => setIsMenuOpen(false)}
              className="bg-ihealthBlue border-2 border-ihealthBlue mx-auto w-full h-fit px-8 py-2.5 text-white rounded-lg font-semibold text-[clamp(16px,3.55vw,20px)] flex items-center justify-center"
            >
              Get a Free Quote
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

export function HeaderSpacer() {
  return <div className="h-[107px]" aria-hidden="true" />
}
