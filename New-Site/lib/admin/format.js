// Display formatting shared by the fixtures and the real queries.
//
// Its own module so lib/db/queries/reporting.js does not import from
// fixtures.js. The fixtures are scaffolding and should be deletable without
// taking the live reporting with them.
export function formatDuration(seconds) {
  const total = Number(seconds) || 0
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

/*
 A Date from the fixtures, a Date or an ISO string from pg depending on the
 column type, so it is coerced rather than assumed. An invalid value returns a
 dash instead of throwing, since a broken timestamp should not take a page
 down.
*/
export function formatDateTime(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
