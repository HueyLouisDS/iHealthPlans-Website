'use client'
import { useState } from 'react'

function ToggleIcon({ isOpen }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
      {!isOpen && <path d="M12 6v12" strokeLinecap="round" />}
      <path d="M18 12H6" strokeLinecap="round" />
    </svg>
  )
}

export default function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <dl className="mt-10 w-full space-y-6 divide-y divide-gray-900/10">
      {items.map((item, index) => {
        const isOpen = openIndex === index

        return (
          <div key={item.question} className="pt-6">
            <dt className="w-full">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between text-left text-gray-900"
              >
                <span className="text-base font-semibold leading-7">{item.question}</span>
                <span className="ml-6 flex h-7 items-center">
                  <ToggleIcon isOpen={isOpen} />
                </span>
              </button>
            </dt>

            {isOpen && (
              <dd className="mt-2 pr-12 w-full">
                <p className="text-base leading-7 text-gray-600">{item.answer}</p>
              </dd>
            )}
          </div>
        )
      })}
    </dl>
  )
}
