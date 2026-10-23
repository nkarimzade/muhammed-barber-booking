const turkeyClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Istanbul',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function getAppointmentCutoff(now = new Date()) {
  const parts = Object.fromEntries(turkeyClock.formatToParts(now).map(({ type, value }) => [type, value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

export function isUpcomingAppointment(appointment, cutoff = getAppointmentCutoff()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(appointment.date || '') ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(appointment.time || '')) return false
  return appointment.date > cutoff.date ||
    (appointment.date === cutoff.date && appointment.time > cutoff.time)
}

export async function purgePastAppointments(collection, createBatch, now = new Date()) {
  const cutoff = getAppointmentCutoff(now)
  let deletedCount = 0
  // Paginate past days without reading future bookings or needing a composite index.
  let snapshot = await collection.where('date', '<', cutoff.date).limit(450).get()
  while (!snapshot.empty) {
    const batch = createBatch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    deletedCount += snapshot.size
    snapshot = await collection.where('date', '<', cutoff.date).limit(450).get()
  }

  const today = await collection.where('date', '==', cutoff.date).get()
  const expired = today.docs.filter((doc) => {
    const { time } = doc.data()
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time || '') && time <= cutoff.time
  })
  for (let index = 0; index < expired.length; index += 450) {
    const batch = createBatch()
    const docs = expired.slice(index, index + 450)
    docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    deletedCount += docs.length
  }
  return deletedCount
}
