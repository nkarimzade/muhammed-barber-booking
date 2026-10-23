import test from 'node:test'
import assert from 'node:assert/strict'
import { getAppointmentCutoff, isUpcomingAppointment, purgePastAppointments } from '../src/appointment-lifecycle.js'

function fakeStore(records) {
  const docs = new Map(records.map((record, index) => [String(index), record]))
  const batchSizes = []
  const collection = {
    where(field, operator, value) {
      let limit = Infinity
      const query = {
        limit(value) { limit = value; return query },
        async get() {
          const results = [...docs].filter(([, record]) =>
            operator === '<' ? record[field] < value : record[field] === value,
          ).slice(0, limit).map(([ref, record]) => ({ ref, data: () => record }))
          return { docs: results, size: results.length, empty: results.length === 0 }
        },
      }
      return query
    },
  }
  const createBatch = () => {
    const pending = []
    return {
      delete(ref) { pending.push(ref) },
      async commit() {
        assert.ok(pending.length <= 450)
        batchSizes.push(pending.length)
        pending.forEach((ref) => docs.delete(ref))
      },
    }
  }
  return { collection, createBatch, docs, batchSizes }
}

test('cutoff uses Istanbul date and minute, including the midnight boundary', () => {
  assert.deepEqual(getAppointmentCutoff(new Date('2026-10-24T21:05:00Z')), { date: '2026-10-25', time: '00:05' })
})

test('lookup includes only future start times, with exact half-hour boundaries', () => {
  const cutoff = getAppointmentCutoff(new Date('2026-10-24T07:30:12Z'))
  assert.equal(isUpcomingAppointment({ date: '2026-10-23', time: '20:30' }, cutoff), false)
  assert.equal(isUpcomingAppointment({ date: '2026-10-24', time: '10:00' }, cutoff), false)
  assert.equal(isUpcomingAppointment({ date: '2026-10-24', time: '10:30' }, cutoff), false)
  assert.equal(isUpcomingAppointment({ date: '2026-10-24', time: '11:00' }, cutoff), true)
  assert.equal(isUpcomingAppointment({ date: '2026-10-25', time: '10:00' }, cutoff), true)
  assert.equal(isUpcomingAppointment({ date: '2026-10-24', time: 'invalid' }, cutoff), false)
})

test('cleanup deletes past days and elapsed starts today, preserving upcoming bookings', async () => {
  const future = [{ date: '2026-10-24', time: '11:00' }, { date: '2026-10-25', time: '10:00' }]
  const store = fakeStore([
    { date: '2026-10-23', time: '20:30' },
    { date: '2026-10-24', time: '10:00' },
    { date: '2026-10-24', time: '10:30' },
    ...future,
  ])
  assert.equal(await purgePastAppointments(store.collection, store.createBatch, new Date('2026-10-24T07:30:12Z')), 3)
  assert.deepEqual([...store.docs.values()], future)
  assert.equal(await purgePastAppointments(store.collection, store.createBatch, new Date('2026-10-24T07:30:12Z')), 0)
})

test('cleanup paginates large backlogs and stays below Firestore batch limits', async () => {
  const store = fakeStore([
    ...Array.from({ length: 905 }, () => ({ date: '2026-10-23', time: '10:00' })),
    ...Array.from({ length: 451 }, () => ({ date: '2026-10-24', time: '10:00' })),
    { date: '2026-10-25', time: '10:00' },
  ])
  assert.equal(await purgePastAppointments(store.collection, store.createBatch, new Date('2026-10-24T08:00:00Z')), 1356)
  assert.deepEqual(store.batchSizes, [450, 450, 5, 450, 1])
  assert.equal(store.docs.size, 1)
})

test('cleanup skips malformed times today instead of deleting uncertain records', async () => {
  const store = fakeStore([{ date: '2026-10-24', time: 'invalid' }])
  assert.equal(await purgePastAppointments(store.collection, store.createBatch, new Date('2026-10-24T08:00:00Z')), 0)
  assert.equal(store.docs.size, 1)
})

test('failed commits reject instead of reporting successful deletion', async () => {
  const store = fakeStore([{ date: '2026-10-23', time: '10:00' }])
  const createBatch = () => ({ delete() {}, async commit() { throw new Error('offline') } })
  await assert.rejects(purgePastAppointments(store.collection, createBatch, new Date('2026-10-24T08:00:00Z')), /offline/)
  assert.equal(store.docs.size, 1)
})
