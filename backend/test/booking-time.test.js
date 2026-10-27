import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import { getAppointmentCutoff, isUpcomingAppointment, purgePastAppointments } from '../src/appointment-lifecycle.js'
import { isPastAppointmentSlot } from '../../frontend/src/utils/date.js'

// Run the actual API handler with a controlled clock and an in-memory database.
// No Firebase credentials, network access, or production records are used.
const source = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8')
const imports = source.match(/import \{\r?\n([\s\S]*?)\} from '\.\/db\.js'/)[1]
  .split(',').map(s => s.trim()).filter(Boolean)
const handlerSource = source.replace(/^import[\s\S]*?from '\.\/db\.js'\r?\n/m, '')
  .split('const server = http.createServer')[0] + '\nreturn handleRequest'

function apiAt(instant) {
  const now = new Date(instant)
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now.valueOf()])) }
    static now() { return now.valueOf() }
  }
  const records = new Map()
  const collection = {
    where(field, op, value) {
      const query = {
        limit() { return query },
        async get() {
          const docs = [...records].filter(([, a]) => op === '<' ? a[field] < value : a[field] === value)
            .map(([ref, a]) => ({ ref, data: () => a }))
          return { docs, size: docs.length, empty: !docs.length }
        },
      }
      return query
    },
  }
  const db = Object.fromEntries(imports.map(name => [name, async () => { throw Error(`Unexpected database call: ${name}`) }]))
  Object.assign(db, {
    normalizePhone: phone => String(phone || '').replace(/\D/g, ''),
    getServices: async () => [{ id: 'test', name: 'Test', price: '350 TL', time: '35 dk' }],
    isDayClosed: async () => false,
    isPhoneBlocked: async () => false,
    isSlotBlocked: async () => false,
    isTimeBooked: async (date, time) => [...records.values()].some(a => a.date === date && a.time === time),
    getAppointments: async date => [...records.values()].filter(a => a.date === date),
    getBlockedSlots: async () => [],
    createAppointment: async a => {
      const appointment = { ...a, id: `${a.date}_${a.time}`, status: 'booked' }
      records.set(appointment.id, appointment)
      return appointment
    },
    getAppointmentsByNumberId: async phone => [...records.values()]
      .filter(a => a.numberId === phone && isUpcomingAppointment(a, getAppointmentCutoff(now))),
    deletePastAppointments: async () => purgePastAppointments(collection, () => {
      const pending = []
      return { delete: ref => pending.push(ref), commit: async () => pending.forEach(ref => records.delete(ref)) }
    }, now),
  })
  const handler = vm.compileFunction(handlerSource, [...imports, 'getAppointmentCutoff', 'isUpcomingAppointment'], {
    parsingContext: vm.createContext({ Date: Clock, Intl, URL, Buffer, process: { env: {} }, console }),
  })(...imports.map(name => db[name]), () => getAppointmentCutoff(now), isUpcomingAppointment)
  async function request(method, url, body) {
    const req = { method, url, headers: { host: 'test.local' }, async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify(body)) } }
    let status, payload
    await handler(req, { writeHead(value) { status = value }, end(value) { payload = JSON.parse(value) } })
    return { status, ...payload }
  }
  return { request, records }
}

const cases = [
  ['before 11:00', '2026-10-27T07:59:59Z', '2026-10-27', 201, 1],
  ['exactly 11:00', '2026-10-27T08:00:00Z', '2026-10-27', 400, 0],
  ['11:05', '2026-10-27T08:05:00Z', '2026-10-27', 400, 0],
  ['11:59', '2026-10-27T08:59:59Z', '2026-10-27', 400, 0],
  ['12:00', '2026-10-27T09:00:00Z', '2026-10-27', 400, 0],
  ['tomorrow at 11:00', '2026-10-27T08:05:00Z', '2026-10-28', 201, 1],
  ['yesterday at 11:00', '2026-10-27T07:00:00Z', '2026-10-26', 400, 0],
  ['11:30 just before start', '2026-10-27T08:29:59Z', '2026-10-27', 201, 1, '11:30'],
  ['11:30 exactly at start', '2026-10-27T08:30:00Z', '2026-10-27', 400, 0, '11:30'],
  ['11:30 after start', '2026-10-27T08:35:00Z', '2026-10-27', 400, 0, '11:30'],
]
for (const [label, instant, date, expectedStatus, remaining, time = '11:00'] of cases) {
  test(`booking / Istanbul ${label}`, async () => {
    const api = apiAt(instant)
    const availability = await api.request('GET', `/api/availability?date=${date}`)
    assert.equal(availability.slots.find(s => s.time === time).isBooked, expectedStatus === 400)
    const result = await api.request('POST', '/api/appointments', {
      serviceId: 'test', date, time, customerName: 'Isolated Test', customerPhone: '5000000000',
    })
    assert.equal(result.status, expectedStatus)
    assert.equal(api.records.size, remaining, 'Expired starts must never be saved')
    assert.equal(isPastAppointmentSlot(date, time, new Date(instant)), expectedStatus === 400)
    const lookup = await api.request('GET', '/api/appointments/lookup?numberId=5000000000')
    assert.equal(lookup.status, 200)
    assert.equal(lookup.appointments.length, remaining)
    assert.equal(api.records.size, remaining)
  })
}
