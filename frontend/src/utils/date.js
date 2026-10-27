export function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function isPastAppointmentSlot(date, time, now = new Date()) {
  if (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) return false
  const startsAt = Date.parse(`${date}T${time}:00+03:00`)
  return Number.isFinite(startsAt) && startsAt <= now.getTime()
}
