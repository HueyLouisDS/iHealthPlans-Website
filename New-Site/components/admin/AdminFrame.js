'use client'
import { useEffect, useState } from 'react'

function ToggleIcon({ isOpen }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
      {isOpen ? (
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
      )}
    </svg>
  )
}

export default function AdminFrame({ sidebar, title, description, showBypassBanner, children }) {
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    setIsOpen(window.innerWidth >= 720)
  }, [])

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex items-start">
      {/*
        Sticky and full viewport height, so the nav and the account block stay
        put while the page scrolls. A lead list runs to hundreds of rows and
        the navigation should not disappear off the top of it.

        Width transition rather than unmounting, so the nav is still in the dom
        for assistive technology when it reopens.
      */}
      <aside
        className={`sticky top-0 h-screen bg-ihealthBlue text-white flex-shrink-0 overflow-hidden transition-[width] duration-200 ${
          isOpen ? 'w-[240px]' : 'w-0'
        }`}
      >
        {/* No overflow on this column. Scrolling belongs to the nav alone, so
            the logo stays at the top and the account block stays at the
            bottom no matter how many nav items there are. Putting the scroll
            here instead would carry the account block away with it. */}
        <div className="w-[240px] h-full flex flex-col">{sidebar}</div>
      </aside>

      <main className="flex-1 min-w-0">
        {showBypassBanner && (
          <div className="bg-red-600 text-white px-6 py-3">
            <p className="font-bold">Authentication bypassed. Development mode only, nobody signed in.</p>
            <p className="text-sm text-white/90">
              Remove LH_ADMIN_DEV_BYPASS_AUTH from .env.local to require a real Google sign in. It
              cannot take effect in a production build.
            </p>
          </div>
        )}

        <header className="bg-white border-b px-4 nm:px-6 py-4 nm:py-6 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Hide navigation' : 'Show navigation'}
            className="w-11 h-11 flex-shrink-0 rounded-md flex items-center justify-center text-ihealthBlue hover:bg-[#f7f7f7] transition-colors focus:outline-none focus:ring-2 focus:ring-ihealthBlue/40"
          >
            <ToggleIcon isOpen={isOpen} />
          </button>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-ihealthBlue truncate">{title}</h1>
            {description && <p className="text-base text-[#505258] mt-1 truncate">{description}</p>}
          </div>
        </header>

        <div className="p-4 nm:p-6">{children}</div>
      </main>
    </div>
  )
}
