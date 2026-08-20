/**
 * Whether the phone line is staffed right now, and when it opens next.
 *
 * The phone is answered Monday to Friday, 9:00 to 17:30 Eastern. That is 42.5
 * hours out of 168, so roughly 75% of the week a tel: link rings out. Knowing
 * which side of that a visitor is on is what lets the page offer a callback
 * instead of a dead end.
 *
 * Everything here is computed in America/New_York regardless of where the
 * visitor is. A caller in Los Angeles at 3pm is calling an office that closed
 * 30 minutes ago, and the page has to say so. Using the visitor's own clock
 * would tell them the opposite.
 *
 * Daylight saving is handled by Intl rather than by an offset, because EST and
 * EDT differ and a hardcoded -5 would be an hour wrong for 8 months of the year.
 */

const TIME_ZONE = 'America/New_York'
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Minutes from midnight, so open and close comparisons are a single number
const OPENS_AT = 9 * 60
const CLOSES_AT = 17 * 60 + 30

/**
 * Reads the weekday and clock time as they are in the office's timezone.
 * formatToParts is used rather than string parsing because the formatted
 * output varies by locale and would break on a machine set to another one.
 */
function officeClock(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  )

  // Some engines render midnight as hour 24 under hour12:false
  const hour = Number(parts.hour) % 24

  return {
    dayIndex: DAY_NAMES.indexOf(parts.weekday),
    minutes: hour * 60 + Number(parts.minute),
  }
}

/**
 * Whether a day index is a working day. Monday to Friday.
 * TODO holidays are not handled. The office is presumably shut on public
 * holidays, and telling somebody to call back on Thanksgiving is worse than
 * saying nothing. Needs a holiday list from the client.
 */
function isWorkingDay(dayIndex) {
  return dayIndex >= 1 && dayIndex <= 5
}

/**
 * Works out the status and the next opening.
 * Pure, takes the current time as an argument, so it can be tested at any
 * moment of the week without waiting for one.
 */
export function getOfficeStatus(now = new Date()) {
  const { dayIndex, minutes } = officeClock(now)

  const isOpen = isWorkingDay(dayIndex) && minutes >= OPENS_AT && minutes < CLOSES_AT
  if (isOpen) {
    return { isOpen: true, nextOpenLabel: null, closesInMinutes: CLOSES_AT - minutes }
  }

  // Still today if it is a working day and the office has not opened yet
  let daysAhead = 0
  if (!(isWorkingDay(dayIndex) && minutes < OPENS_AT)) {
    daysAhead = 1
    while (!isWorkingDay((dayIndex + daysAhead) % 7)) daysAhead += 1
  }

  const nextDayIndex = (dayIndex + daysAhead) % 7
  const when =
    daysAhead === 0 ? 'today' : daysAhead === 1 ? 'tomorrow' : FULL_DAY_NAMES[nextDayIndex]

  return {
    isOpen: false,
    // Reads as "today at 9 AM", "tomorrow at 9 AM", or "Monday at 9 AM"
    nextOpenLabel: `${when} at 9 AM`,
    nextOpenDay: FULL_DAY_NAMES[nextDayIndex],
    daysAhead,
  }
}

export { TIME_ZONE, OPENS_AT, CLOSES_AT }
