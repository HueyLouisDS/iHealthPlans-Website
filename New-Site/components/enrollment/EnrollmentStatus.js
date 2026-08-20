'use client'

/**
 * Live banner telling a visitor whether the Annual Enrollment Period is open
 * right now, and how long they have.
 * Timing is the reason most people call about Medicare, so putting the answer
 * above the fold is the highest value thing on this page.
 *
 * Client side and mount only on purpose. Rendering a date on the server would
 * either freeze at build time on a static page, or force the whole page to be
 * dynamic just for one line. Neither is worth it, and this is a UI affordance
 * rather than content search engines need.
 */

import { useEffect, useState } from 'react'

// AEP runs 15 October to 7 December inclusive. Months are 0 indexed in JS
// Date, so 9 is October and 11 is December.
const AEP_START_MONTH = 9
const AEP_START_DAY = 15
const AEP_END_MONTH = 11
const AEP_END_DAY = 7

const MS_PER_DAY = 86400000

/**
 * Works out where today sits relative to the Annual Enrollment Period.
 * Returns the state and the number of whole days until the next boundary, so
 * the caller decides the wording rather than this doing string building.
 */
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

/**
 * Renders the banner.
 * Renders nothing on the server and on the first client pass, then fills in
 * after mount. That avoids a hydration mismatch, which is guaranteed
 * otherwise since the server and the browser can disagree about the date.
 */
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
