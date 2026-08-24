'use client'
import { useEffect, useState } from 'react'

const AEP_START_MONTH = 9
const AEP_START_DAY = 15
const AEP_END_MONTH = 11
const AEP_END_DAY = 7

const MS_PER_DAY = 86400000

function getAepStatus(now) {
  const year = now.getFullYear()
  const startOfToday = new Date(year, now.getMonth(), now.getDate())

  const openThisYear = new Date(year, AEP_START_MONTH, AEP_START_DAY)
  // End is exclusive at midnight on the 8th, so the 7th counts as open
  const closeThisYear = new Date(year, AEP_END_MONTH, AEP_END_DAY + 1)

  if (startOfToday >= openThisYear && startOfToday < closeThisYear) {
    return { isOpen: true, days: Math.round((closeThisYear - startOfToday) / MS_PER_DAY) }
  }

  // Before it opens this year, or already past it and looking at next year
  const nextOpen = startOfToday < openThisYear ? openThisYear : new Date(year + 1, AEP_START_MONTH, AEP_START_DAY)

  return { isOpen: false, days: Math.round((nextOpen - startOfToday) / MS_PER_DAY) }
}

export default function EnrollmentStatus() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    setStatus(getAepStatus(new Date()))
  }, [])

  if (!status) return null

  return (
    <div className="mb-8 inline-flex items-center gap-3 rounded-lg bg-white/15 border border-white/25 px-5 py-3">
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.isOpen ? 'bg-ihealthGreen' : 'bg-white/60'}`}
        aria-hidden="true"
      />
      <p className="text-base sm:text-lg">
        {status.isOpen ? (
          <>
            <span className="font-bold">Open now.</span> {status.days} day
            {status.days === 1 ? '' : 's'} left to make a change.
          </>
        ) : (
          <>
            <span className="font-bold">Not open yet.</span> Opens in {status.days} day
            {status.days === 1 ? '' : 's'}, on 15 October.
          </>
        )}
      </p>
    </div>
  )
}
