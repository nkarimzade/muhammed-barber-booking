import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { FaCalendarDays, FaClock, FaMagnifyingGlass, FaPhone, FaScissors, FaTag, FaXmark } from 'react-icons/fa6'
import { formatTurkishMobileInput, getTurkishMobileDigits, isValidTurkishMobileNumber } from '../utils/phone'
import BookingNav from '../components/BookingNav'

const apiBaseUrl = import.meta.env.VITE_API_URL || ''
const lookupSkeletonItems = ['first', 'second', 'third']

function formatAppointmentDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  })
}

function RandevuSorgula() {
  const [numberId, setNumberId] = useState('')
  const [lookupNumberId, setLookupNumberId] = useState('')
  const [allAppointments, setAppointments] = useState([])
  const [now, setNow] = useState(Date.now)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState('')
  const [pendingCancelAppointment, setPendingCancelAppointment] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const normalizedNumberId = useMemo(() => getTurkishMobileDigits(numberId), [numberId])
  const isNumberIdValid = isValidTurkishMobileNumber(numberId)
  const canSearch = isNumberIdValid && !isLoading
  const appointments = useMemo(() => allAppointments.filter((appointment) => {
    const startsAt = Date.parse(`${appointment.date}T${appointment.time}:00+03:00`)
    return Number.isFinite(startsAt) && startsAt > now
  }), [allAppointments, now])

  useEffect(() => {
    const refreshClock = () => setNow(Date.now())
    const timer = window.setInterval(refreshClock, 30_000)
    window.addEventListener('focus', refreshClock)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshClock)
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!canSearch) {
      setError('Randevunu sorgulamak icin numarani 5xx xxx xx xx formatinda yaz.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccessMessage('')
    setHasSearched(true)

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/appointments/lookup?numberId=${encodeURIComponent(normalizedNumberId)}`,
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Randevu sorgulanamadi.')
      }

      setNow(Date.now())
      setAppointments(data.appointments || [])
      setLookupNumberId(formatTurkishMobileInput(data.numberId || normalizedNumberId))
    } catch (requestError) {
      setAppointments([])
      setLookupNumberId('')
      setError(requestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  const openCancelDialog = (appointment) => {
    if (!appointment?.id || !lookupNumberId) {
      setError('Randevuyu iptal etmek icin once numaranla sorgulama yap.')
      return
    }

    setError('')
    setSuccessMessage('')
    setPendingCancelAppointment(appointment)
  }

  const closeCancelDialog = () => {
    if (!cancellingAppointmentId) {
      setPendingCancelAppointment(null)
    }
  }

  const cancelAppointment = async () => {
    const appointment = pendingCancelAppointment

    if (!appointment?.id) {
      return
    }

    setCancellingAppointmentId(appointment.id)
    setError('')
    setSuccessMessage('')

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/appointments/${encodeURIComponent(appointment.id)}?numberId=${encodeURIComponent(getTurkishMobileDigits(lookupNumberId))}`,
        {
          method: 'DELETE',
        },
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Randevu iptal edilemedi.')
      }

      setAppointments((current) => current.filter((item) => item.id !== appointment.id))
      setSuccessMessage('Randevun iptal edildi.')
      setPendingCancelAppointment(null)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setCancellingAppointmentId('')
    }
  }

  return (
    <main className="lookup-page">
      <BookingNav current="lookup" />
      <motion.section
        className="lookup-shell"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="lookup-entry">
        <div className="lookup-heading">
          <span>Muhammed Barber</span>
          <h1>Randevun burada.</h1>
          <p>Telefon numaranla yaklaşan randevularını görüntüle. Tarih, saat ve hizmet bilgilerini kontrol et; gerekirse randevunu iptal et.</p>
          <a className="lookup-new-booking" href="/randevu">Henüz randevun yok mu? <strong>Yerini ayır →</strong></a>
        </div>

        <form className="lookup-form" onSubmit={handleSubmit}>
          <div className="lookup-form-heading"><FaCalendarDays aria-hidden="true" /><h2>Randevumu bul</h2></div>
          <label>
            <span>Telefon numaran</span>
            <div className="lookup-input">
              <FaPhone aria-hidden="true" />
              <input
                type="tel"
                value={numberId}
                onChange={(event) => setNumberId(formatTurkishMobileInput(event.target.value))}
                placeholder="5xx xxx xx xx"
                autoComplete="tel"
                inputMode="numeric"
                pattern="5[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}"
                title="5xx xxx xx xx formatinda girin"
                aria-invalid={numberId ? !isNumberIdValid : undefined}
                aria-describedby="lookup-phone-hint"
                required
              />
            </div>
            <small id="lookup-phone-hint" className={`phone-format-hint ${numberId && !isNumberIdValid ? 'is-invalid' : ''}`}>
              Başında 0 olmadan, 10 haneli numaranı yaz.
            </small>
          </label>
          <button type="submit" disabled={!canSearch}>
            <FaMagnifyingGlass aria-hidden="true" />
            {isLoading ? 'Randevun aranıyor…' : 'Randevumu Bul'}
          </button>
        </form>
        </div>

        {error && <p className="lookup-error" role="alert">{error}</p>}
        {successMessage && <p className="lookup-success" role="status">{successMessage}</p>}

        <section className="lookup-results" aria-live="polite">
          {isLoading &&
            lookupSkeletonItems.map((item) => (
              <article className="lookup-appointment-card lookup-appointment-skeleton" key={item}>
                <i className="appointment-skeleton lookup-skeleton-title" />
                <i className="appointment-skeleton lookup-skeleton-line" />
                <i className="appointment-skeleton lookup-skeleton-line is-short" />
              </article>
            ))}

          {!isLoading && hasSearched && appointments.length === 0 && !error && (
            <div className="lookup-empty">
              <FaMagnifyingGlass aria-hidden="true" />
              <strong>Yaklaşan randevun yok</strong>
              <p>Bu telefon numarasıyla gelecekte bir randevu görünmüyor. Numaranı kontrol edebilir veya yeni bir randevu alabilirsin.</p>
              <a href="/randevu">Yeni randevu al</a>
            </div>
          )}

          {!isLoading && appointments.length > 0 && (
            <>
              <div className="lookup-result-meta">
                <span>{appointments.length} randevu bulundu</span>
                <strong>{lookupNumberId}</strong>
              </div>

              {appointments.map((appointment) => (
                <article className="lookup-appointment-card" key={appointment.id}>
                  <header>
                    <div>
                      <span>{formatAppointmentDate(appointment.date)}</span>
                      <strong>{appointment.time}</strong>
                    </div>
                    <small>{appointment.status === 'booked' ? 'Aktif randevu' : appointment.status}</small>
                  </header>

                  <div className="lookup-detail-grid">
                    <div>
                      <FaScissors aria-hidden="true" />
                      <span>{appointment.serviceName}</span>
                    </div>
                    <div>
                      <FaClock aria-hidden="true" />
                      <span>{appointment.serviceTime}</span>
                    </div>
                    <div>
                      <FaTag aria-hidden="true" />
                      <span>{appointment.servicePrice}</span>
                    </div>
                  </div>

                  {appointment.status === 'booked' && (
                    <div className="lookup-actions">
                      <button
                        type="button"
                        className="lookup-cancel-button"
                        onClick={() => openCancelDialog(appointment)}
                        disabled={cancellingAppointmentId === appointment.id}
                      >
                        <FaXmark aria-hidden="true" />
                        {cancellingAppointmentId === appointment.id ? 'Iptal ediliyor' : 'Randevuyu iptal et'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </>
          )}
        </section>

        {pendingCancelAppointment && (
          <div className="lookup-modal-backdrop" role="presentation" onClick={closeCancelDialog}>
            <div
              className="lookup-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-appointment-title"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="lookup-modal-close"
                onClick={closeCancelDialog}
                aria-label="Pencereyi kapat"
                disabled={Boolean(cancellingAppointmentId)}
              >
                <FaXmark aria-hidden="true" />
              </button>
              <span>Randevu iptali</span>
              <h2 id="cancel-appointment-title">Randevunu iptal edelim mi?</h2>
              <p>
                {formatAppointmentDate(pendingCancelAppointment.date)} saat {pendingCancelAppointment.time} randevusu
                iptal edilecek.
              </p>
              <div className="lookup-modal-actions">
                <button type="button" className="lookup-modal-secondary" onClick={closeCancelDialog} disabled={Boolean(cancellingAppointmentId)}>
                  Vazgec
                </button>
                <button type="button" className="lookup-modal-danger" onClick={cancelAppointment} disabled={Boolean(cancellingAppointmentId)}>
                  {cancellingAppointmentId ? 'Iptal ediliyor' : 'Iptal et'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.section>
    </main>
  )
}

export default RandevuSorgula
