// Whether the phone line is staffed right now, and when it opens next, so a
// page can offer a callback rather than a tel: link that rings out. Staffed
// 42.5 hours of the week, so most visits land outside it.

const TIME_ZONE = 'America/New_York'
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const OPENS_AT = 9 * 60                 // minutes from midnight, so comparisons are one number
const CLOSES_AT = 17 * 60 + 30

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

  const hour = Number(parts.hour) % 24  // some engines render midnight as 24

  return {
    dayIndex: DAY_NAMES.indexOf(parts.weekday),
    minutes: hour * 60 + Number(parts.minute),
  }
}

function isWorkingDay(dayIndex) {
  return dayIndex >= 1 && dayIndex <= 5
}

export function getOfficeStatus(now = new Date()) {
  const { dayIndex, minutes } = officeClock(now)

  const isOpen = isWorkingDay(dayIndex) && minutes >= OPENS_AT && minutes < CLOSES_AT
  if (isOpen) {
    return { isOpen: true, nextOpenLabel: null, closesInMinutes: CLOSES_AT - minutes }
  }

  let daysAhead = 0                     // 0 means the office opens again today
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
