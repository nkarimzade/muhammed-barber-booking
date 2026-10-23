import { createAppointmentsPdf } from './appointments-pdf.js'
import http from 'node:http'
import './env.js'
import {
  blockPhone,
  blockSlot,
  closeDay,
  createAppointment,
  createService,
  deleteAppointment,
  deleteAppointmentForNumberId,
  deletePastAppointments,
  deleteService,
  getAppointments,
  getAppointmentsByNumberId,
  getBlockedPhones,
  getBlockedSlots,
  getClosedDays,
  getServices,
  isDayClosed,
  isPhoneBlocked,
  isSlotBlocked,
  isTimeBooked,
  normalizePhone,
  openDay,
  unblockPhone,
  unblockSlot,
  updateService,
} from './db.js'

const port = Number(process.env.PORT || 4000)
const adminToken = process.env.ADMIN_TOKEN || ''
let appointmentCleanup = null

function cleanUpAppointments() {
  if (!appointmentCleanup) {
    appointmentCleanup = deletePastAppointments()
      .catch((error) => console.error('Gecmis randevular temizlenemedi:', error.message))
      .finally(() => { appointmentCleanup = null })
  }
  return appointmentCleanup
}

const timeSlots = [
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
]

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  response.end(JSON.stringify(payload))
}

function sendPdf(response, filename, buffer) {
  response.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  response.end(buffer)
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isSunday(date) {
  if (!isDate(date)) return false
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).getDay() === 0
}

function isNumberId(value) {
  return /^5\d{9}$/.test(value)
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getTurkeyDateAndHour() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const partMap = {}
  parts.forEach((p) => {
    partMap[p.type] = p.value
  })
  const todayStr = `${partMap.year}-${partMap.month}-${partMap.day}`
  const hour = parseInt(partMap.hour, 10)
  return { todayStr, hour }
}

function isAdminRequest(request) {
  if (!adminToken) {
    return false
  }

  return request.headers.authorization === `Bearer ${adminToken}`
}

async function parseBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  const rawBody = Buffer.concat(chunks).toString('utf8')
  return rawBody ? JSON.parse(rawBody) : {}
}

async function requireAdmin(request, response) {
  if (isAdminRequest(request)) {
    return true
  }

  sendJson(response, 401, { message: 'Şifre yanlış' })
  return false
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if ((request.method === 'GET' || request.method === 'HEAD') && (url.pathname === '/api/health' || url.pathname === '/health' || url.pathname === '/')) {
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/services') {
    sendJson(response, 200, { services: await getServices() })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/closed-days') {
    sendJson(response, 200, {
      closedDays: await getClosedDays(),
      weeklyClosedDays: ['sunday'],
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/availability') {
    const date = normalizeText(url.searchParams.get('date'))

    if (!isDate(date)) {
      sendJson(response, 400, { message: 'Gecerli bir tarih gonderin.' })
      return
    }

    const isClosed = isSunday(date) || (await isDayClosed(date))
    const appointments = await getAppointments(date)
    const blockedSlots = await getBlockedSlots(date)
    const bookedTimes = new Set(
      appointments
        .filter((appointment) => appointment.status === 'booked')
        .map((appointment) => appointment.time),
    )
    const blockedTimes = new Set(blockedSlots.map((slot) => slot.time))
    const { todayStr, hour: currentHour } = getTurkeyDateAndHour()
    const isSlotPast = (time) => {
      if (date < todayStr) return true
      if (date === todayStr) {
        const slotHour = parseInt(time.split(':')[0], 10)
        return slotHour < currentHour
      }
      return false
    }

    sendJson(response, 200, {
      date,
      isClosed,
      slots: timeSlots.map((time) => ({
        time,
        isBooked: isClosed || bookedTimes.has(time) || blockedTimes.has(time) || isSlotPast(time),
      })),
    })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/appointments/lookup') {
    const numberId = normalizePhone(url.searchParams.get('numberId') || url.searchParams.get('phone'))

    if (!isNumberId(numberId)) {
      sendJson(response, 400, { message: 'Telefon numarasi 5xx xxx xx xx formatinda olmali.' })
      return
    }

    // Also clean up on lookup after an idle/suspended host resumes.
    await cleanUpAppointments()
    sendJson(response, 200, {
      numberId,
      appointments: await getAppointmentsByNumberId(numberId),
    })
    return
  }

  if (request.method === 'DELETE' && url.pathname.startsWith('/api/appointments/')) {
    const appointmentId = decodeURIComponent(url.pathname.replace('/api/appointments/', ''))
    const numberId = normalizePhone(url.searchParams.get('numberId') || url.searchParams.get('phone'))

    if (!appointmentId) {
      sendJson(response, 400, { message: 'Randevu ID gerekli.' })
      return
    }

    if (!isNumberId(numberId)) {
      sendJson(response, 400, { message: 'Telefon numarasi 5xx xxx xx xx formatinda olmali.' })
      return
    }

    const result = await deleteAppointmentForNumberId(appointmentId, numberId)

    if (result.status === 'not-found') {
      sendJson(response, 404, { message: 'Randevu bulunamadi.' })
      return
    }

    if (result.status === 'forbidden') {
      sendJson(response, 403, { message: 'Bu randevuyu iptal etme yetkiniz yok.' })
      return
    }

    sendJson(response, 200, { appointment: result.appointment })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/appointments') {
    const body = await parseBody(request)
    const serviceId = normalizeText(body.serviceId)
    const date = normalizeText(body.date)
    const time = normalizeText(body.time)
    const customerName = normalizeText(body.customerName)
    const customerPhone = normalizeText(body.customerPhone)
    const numberId = normalizePhone(customerPhone)
    const customerNote = normalizeText(body.customerNote)
    const services = await getServices()
    const service = services.find((item) => item.id === serviceId)

    if (!service || !isDate(date) || !timeSlots.includes(time) || !customerName || !isNumberId(numberId)) {
      sendJson(response, 400, { message: 'Randevu bilgileri eksik veya hatali.' })
      return
    }

    const { todayStr, hour: currentHour } = getTurkeyDateAndHour()
    if (date < todayStr) {
      sendJson(response, 400, { message: 'Geçmiş bir tarihe randevu alınamaz.' })
      return
    }
    if (date === todayStr) {
      const slotHour = parseInt(time.split(':')[0], 10)
      if (slotHour < currentHour) {
        sendJson(response, 400, { message: 'Geçmiş bir saate randevu alınamaz.' })
        return
      }
    }

    if (isSunday(date) || (await isDayClosed(date))) {
      sendJson(response, 409, { message: 'Bu gun randevuya kapali.' })
      return
    }

    if (await isPhoneBlocked(numberId)) {
      sendJson(response, 403, { message: 'Bu telefon numarasi ile randevu alinamaz.' })
      return
    }

    if (await isTimeBooked(date, time)) {
      sendJson(response, 409, { message: 'Bu saat dolu. Lutfen baska bir saat secin.' })
      return
    }

    if (await isSlotBlocked(date, time)) {
      sendJson(response, 409, { message: 'Bu saat randevuya kapali.' })
      return
    }

    let appointment

    try {
      appointment = await createAppointment({
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceTime: service.time,
        date,
        time,
        customerName,
        customerPhone: numberId,
        numberId,
        customerNote,
      })
    } catch (error) {
      if (error.code === 'SLOT_BOOKED') {
        sendJson(response, 409, { message: error.message })
        return
      }

      throw error
    }

    sendJson(response, 201, { appointment })
    return
  }

  if (url.pathname.startsWith('/api/admin')) {
    if (!(await requireAdmin(request, response))) {
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/dashboard') {
      const date = normalizeText(url.searchParams.get('date'))

      sendJson(response, 200, {
        services: await getServices(),
        closedDays: await getClosedDays(),
        blockedSlots: await getBlockedSlots(isDate(date) ? date : undefined),
        blockedPhones: await getBlockedPhones(),
        appointments: await getAppointments(isDate(date) ? date : undefined),
      })
      return
    }

    if (request.method === 'GET' && url.pathname === '/api/admin/appointments/pdf') {
      const date = normalizeText(url.searchParams.get('date'))

      if (!isDate(date)) {
        sendJson(response, 400, { message: 'Gecerli bir tarih gonderin.' })
        return
      }

      const appointments = await getAppointments(date)
      const pdfBuffer = await createAppointmentsPdf(date, appointments)
      sendPdf(response, `randevular-${date}.pdf`, pdfBuffer)
      return
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/admin/appointments/')) {
      const appointmentId = decodeURIComponent(url.pathname.replace('/api/admin/appointments/', ''))

      if (!appointmentId) {
        sendJson(response, 400, { message: 'Randevu ID gerekli.' })
        return
      }

      const appointment = await deleteAppointment(appointmentId)

      if (!appointment) {
        sendJson(response, 404, { message: 'Randevu bulunamadi.' })
        return
      }

      sendJson(response, 200, { appointment })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/services') {
      const body = await parseBody(request)
      const name = normalizeText(body.name)
      const price = normalizeText(body.price)
      const time = normalizeText(body.time)
      const detail = normalizeText(body.detail)

      if (!name || !price || !time) {
        sendJson(response, 400, { message: 'Islem adi, fiyat ve sure gerekli.' })
        return
      }

      const service = await createService({ name, price, time, detail })

      if (!service) {
        sendJson(response, 409, { message: 'Bu islem eklenemedi. Lutfen tekrar deneyin.' })
        return
      }

      sendJson(response, 201, { service })
      return
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/admin/services/')) {
      const serviceId = decodeURIComponent(url.pathname.replace('/api/admin/services/', ''))
      const service = await deleteService(serviceId)

      if (!service) {
        sendJson(response, 404, { message: 'Hizmet bulunamadi.' })
        return
      }

      sendJson(response, 200, { service })
      return
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/admin/services/')) {
      const serviceId = decodeURIComponent(url.pathname.replace('/api/admin/services/', ''))
      const body = await parseBody(request)
      const updates = {}

      for (const key of ['name', 'price', 'time', 'detail']) {
        const value = normalizeText(body[key])
        if (value) updates[key] = value
      }

      const service = await updateService(serviceId, updates)

      if (!service) {
        sendJson(response, 404, { message: 'Hizmet bulunamadi.' })
        return
      }

      sendJson(response, 200, { service })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/closed-days') {
      const body = await parseBody(request)
      const date = normalizeText(body.date)

      if (!isDate(date)) {
        sendJson(response, 400, { message: 'Gecerli bir tarih gonderin.' })
        return
      }

      sendJson(response, 201, { closedDay: await closeDay(date, normalizeText(body.note)) })
      return
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/admin/closed-days/')) {
      const date = decodeURIComponent(url.pathname.replace('/api/admin/closed-days/', ''))

      if (!isDate(date)) {
        sendJson(response, 400, { message: 'Gecerli bir tarih gonderin.' })
        return
      }

      await openDay(date)
      sendJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/blocked-slots') {
      const body = await parseBody(request)
      const date = normalizeText(body.date)
      const time = normalizeText(body.time)

      if (!isDate(date) || !timeSlots.includes(time)) {
        sendJson(response, 400, { message: 'Gecerli tarih ve saat gonderin.' })
        return
      }

      sendJson(response, 201, { blockedSlot: await blockSlot(date, time, normalizeText(body.note)) })
      return
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/admin/blocked-slots/')) {
      const slotId = decodeURIComponent(url.pathname.replace('/api/admin/blocked-slots/', ''))

      if (!slotId) {
        sendJson(response, 400, { message: 'Saat kaydi gerekli.' })
        return
      }

      await unblockSlot(slotId)
      sendJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'POST' && url.pathname === '/api/admin/blocked-phones') {
      const body = await parseBody(request)
      const phone = normalizePhone(body.phone)

      if (!phone) {
        sendJson(response, 400, { message: 'Telefon numarasi gerekli.' })
        return
      }

      sendJson(response, 201, { blockedPhone: await blockPhone(phone, normalizeText(body.note)) })
      return
    }

    if (request.method === 'DELETE' && url.pathname.startsWith('/api/admin/blocked-phones/')) {
      const phone = decodeURIComponent(url.pathname.replace('/api/admin/blocked-phones/', ''))

      await unblockPhone(phone)
      sendJson(response, 200, { ok: true })
      return
    }
  }

  sendJson(response, 404, { message: 'Endpoint bulunamadi.' })
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error)
    sendJson(response, 500, { message: 'Sunucu hatasi.' })
  })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Backend running on http://0.0.0.0:${port}`)
  void cleanUpAppointments()
})

const appointmentCleanupTimer = setInterval(() => { void cleanUpAppointments() }, 60_000)
appointmentCleanupTimer.unref()
server.on('close', () => clearInterval(appointmentCleanupTimer))
