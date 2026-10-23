import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { getAppointmentCutoff, isUpcomingAppointment, purgePastAppointments } from './appointment-lifecycle.js'

const defaultServices = [
  {
    id: 'sac-sakal-yikama',
    name: 'Sac, Sakal Kesimi ve Yikama',
    price: '500 TL',
    time: '55 dk',
    detail: 'Tam bakim paketi',
  },
  { id: 'sac-kesimi', name: 'Sac kesimi', price: '350 TL', time: '35 dk', detail: 'Klasik, modern ve fade kesim' },
  { id: 'sakal-tirasi', name: 'Sakal tirasi', price: '200 TL', time: '20 dk', detail: 'Hat belirleme ve sicak havlu' },
  { id: 'cocuk-kesimi', name: 'Cocuk kesimi', price: '250 TL', time: '25 dk', detail: 'Rahat ve hizli kesim' },
  { id: 'damat-bakimi', name: 'Damat bakimi', price: '900 TL', time: '75 dk', detail: 'Ozel gun hazirligi' },
]

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT JSON parse hatasi:', e.message)
    }
  }

  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    '/etc/secrets/service-account.json',
    path.resolve(process.cwd(), 'service-account.json'),
    path.resolve(process.cwd(), 'backend', 'service-account.json'),
  ].filter(Boolean)

  for (const candidate of possiblePaths) {
    try {
      const resolved = path.resolve(process.cwd(), candidate)
      if (existsSync(resolved)) {
        return admin.credential.cert(JSON.parse(readFileSync(resolved, 'utf8')))
      }
    } catch (e) {
      console.error(`Firebase credential okunamadi (${candidate}):`, e.message)
    }
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  }

  console.warn('UYARI: Firebase credentials bulunamadi, applicationDefault deneniyor.')
  return admin.credential.applicationDefault()
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: getCredential(),
  })
}

const firestore = admin.firestore()
const servicesCollection = firestore.collection('services')
const appointmentsCollection = firestore.collection('appointments')
const closedDaysCollection = firestore.collection('closedDays')
const blockedPhonesCollection = firestore.collection('blockedPhones')
const blockedSlotsCollection = firestore.collection('blockedSlots')

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

function createServiceId(name) {
  const slug = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return slug || `hizmet-${Date.now().toString(36)}`
}

function createSlotId(date, time) {
  return `${date}_${String(time || '').replace(':', '')}`
}

async function ensureDefaultServices() {
  await Promise.all(
    defaultServices.map(async (service) => {
      const ref = servicesCollection.doc(service.id)
      const snapshot = await ref.get()

      if (!snapshot.exists) {
        await ref.set(service)
      }
    }),
  )
}

function snapshotToArray(snapshot) {
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export async function getServices() {
  await ensureDefaultServices()
  const snapshot = await servicesCollection.get()
  const services = snapshotToArray(snapshot)
  const defaultServiceIds = new Set(defaultServices.map((service) => service.id))
  const mergedDefaultServices = defaultServices.map((defaultService) => ({
    ...defaultService,
    ...services.find((service) => service.id === defaultService.id),
  }))
  const customServices = services
    .filter((service) => !defaultServiceIds.has(service.id) && service.isDeleted !== true)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.name.localeCompare(b.name))

  return [...mergedDefaultServices.filter((service) => service.isDeleted !== true), ...customServices]
}

export async function createService(service) {
  await ensureDefaultServices()

  const now = new Date().toISOString()
  const baseId = createServiceId(service.name)
  let id = baseId
  let ref = servicesCollection.doc(id)
  let snapshot = await ref.get()

  if (snapshot.exists) {
    id = `${baseId}-${Date.now().toString(36)}`
    ref = servicesCollection.doc(id)
    snapshot = await ref.get()
  }

  if (snapshot.exists) {
    return null
  }

  const payload = {
    id,
    name: service.name,
    price: service.price,
    time: service.time,
    detail: service.detail || '',
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  }

  await ref.set(payload)
  return payload
}

export async function updateService(serviceId, updates) {
  await ensureDefaultServices()
  const ref = servicesCollection.doc(serviceId)
  const snapshot = await ref.get()

  if (!snapshot.exists || snapshot.data().isDeleted === true) {
    return null
  }

  await ref.set(
    {
      ...updates,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )

  const updatedSnapshot = await ref.get()
  return {
    id: updatedSnapshot.id,
    ...updatedSnapshot.data(),
  }
}

export async function deleteService(serviceId) {
  await ensureDefaultServices()
  const ref = servicesCollection.doc(serviceId)
  const snapshot = await ref.get()

  if (!snapshot.exists || snapshot.data().isDeleted === true) {
    return null
  }

  const updates = {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await ref.set(updates, { merge: true })
  return {
    id: snapshot.id,
    ...snapshot.data(),
    ...updates,
  }
}

export async function getAppointments(date) {
  let query = appointmentsCollection

  if (date) {
    query = query.where('date', '==', date)
  }

  const snapshot = await query.get()
  return snapshotToArray(snapshot)
}

export async function getAppointmentsByNumberId(numberId) {
  const [numberSnapshot, phoneSnapshot] = await Promise.all([
    appointmentsCollection.where('numberId', '==', numberId).get(),
    appointmentsCollection.where('customerPhone', '==', numberId).get(),
  ])
  const appointmentsById = new Map()

  ;[...snapshotToArray(numberSnapshot), ...snapshotToArray(phoneSnapshot)].forEach((appointment) => {
    appointmentsById.set(appointment.id, appointment)
  })

  const cutoff = getAppointmentCutoff()
  return [...appointmentsById.values()].filter((appointment) => isUpcomingAppointment(appointment, cutoff)).sort(
    (a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''),
  )
}

export async function deletePastAppointments(now = new Date()) {
  return purgePastAppointments(appointmentsCollection, () => firestore.batch(), now)
}

export async function isTimeBooked(date, time) {
  const appointments = await getAppointments(date)
  return appointments.some((appointment) => appointment.time === time && appointment.status === 'booked')
}

export async function getBlockedSlots(date) {
  let query = blockedSlotsCollection

  if (date) {
    query = query.where('date', '==', date)
  }

  const snapshot = await query.get()
  return snapshotToArray(snapshot).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
}

export async function isSlotBlocked(date, time) {
  const snapshot = await blockedSlotsCollection.doc(createSlotId(date, time)).get()
  return snapshot.exists
}

export async function blockSlot(date, time, note = '') {
  const id = createSlotId(date, time)
  const payload = {
    id,
    date,
    time,
    note,
    createdAt: new Date().toISOString(),
  }

  await blockedSlotsCollection.doc(id).set(payload, { merge: true })
  return payload
}

export async function unblockSlot(slotId) {
  await blockedSlotsCollection.doc(slotId).delete()
}

export async function createAppointment(appointment) {
  const slotId = `${appointment.date}_${appointment.time.replace(':', '')}`
  const ref = appointmentsCollection.doc(slotId)

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)

    if (snapshot.exists && snapshot.data().status === 'booked') {
      const error = new Error('Bu saat dolu. Lutfen baska bir saat secin.')
      error.code = 'SLOT_BOOKED'
      throw error
    }

    const payload = {
      ...appointment,
      id: ref.id,
      status: 'booked',
      createdAt: new Date().toISOString(),
    }

    transaction.set(ref, payload)
    return payload
  })
}

export async function deleteAppointment(appointmentId) {
  const ref = appointmentsCollection.doc(appointmentId)
  const snapshot = await ref.get()

  if (!snapshot.exists) {
    return null
  }

  await ref.delete()
  return { id: snapshot.id, ...snapshot.data() }
}

export async function deleteAppointmentForNumberId(appointmentId, numberId) {
  const ref = appointmentsCollection.doc(appointmentId)
  const snapshot = await ref.get()

  if (!snapshot.exists) {
    return { status: 'not-found', appointment: null }
  }

  const appointment = { id: snapshot.id, ...snapshot.data() }
  const normalizedNumberId = normalizePhone(numberId)
  const appointmentNumberId = normalizePhone(appointment.numberId || appointment.customerPhone)

  if (!normalizedNumberId || appointmentNumberId !== normalizedNumberId) {
    return { status: 'forbidden', appointment: null }
  }

  await ref.delete()
  return { status: 'deleted', appointment }
}

export async function getClosedDays() {
  const snapshot = await closedDaysCollection.get()
  return snapshotToArray(snapshot).sort((a, b) => a.date.localeCompare(b.date))
}

export async function isDayClosed(date) {
  const snapshot = await closedDaysCollection.doc(date).get()
  return snapshot.exists
}

export async function closeDay(date, note = '') {
  const payload = {
    date,
    note,
    createdAt: new Date().toISOString(),
  }

  await closedDaysCollection.doc(date).set(payload, { merge: true })
  return payload
}

export async function openDay(date) {
  await closedDaysCollection.doc(date).delete()
}

export async function getBlockedPhones() {
  const snapshot = await blockedPhonesCollection.get()
  return snapshotToArray(snapshot).sort((a, b) => a.phone.localeCompare(b.phone))
}

export async function isPhoneBlocked(phone) {
  const normalizedPhone = normalizePhone(phone)

  if (!normalizedPhone) {
    return false
  }

  const snapshot = await blockedPhonesCollection.doc(normalizedPhone).get()
  return snapshot.exists
}

export async function blockPhone(phone, note = '') {
  const normalizedPhone = normalizePhone(phone)
  const payload = {
    phone: normalizedPhone,
    note,
    createdAt: new Date().toISOString(),
  }

  await blockedPhonesCollection.doc(normalizedPhone).set(payload, { merge: true })
  return payload
}

export async function unblockPhone(phone) {
  await blockedPhonesCollection.doc(normalizePhone(phone)).delete()
}

export { defaultServices, normalizePhone }
