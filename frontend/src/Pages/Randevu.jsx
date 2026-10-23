import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FaChevronLeft, FaChevronRight, FaSpinner } from 'react-icons/fa6'
import { formatLocalDate } from '../utils/date'
import BookingNav from '../components/BookingNav'
import { formatTurkishMobileInput, getTurkishMobileDigits, isValidTurkishMobileNumber } from '../utils/phone'

const defaultServices = [
  { id: 'sac-sakal-yikama', name: 'Saç, Sakal Kesimi ve Yıkama', price: '500 TL', time: '55 dk' },
  { id: 'sac-kesimi', name: 'Saç kesimi', price: '350 TL', time: '35 dk' },
  { id: 'sakal-tirasi', name: 'Sakal tıraşı', price: '200 TL', time: '20 dk' },
  { id: 'cocuk-kesimi', name: 'Çocuk kesimi', price: '250 TL', time: '25 dk' },
  { id: 'damat-bakimi', name: 'Damat bakımı', price: '900 TL', time: '75 dk' },
]

const apiBaseUrl = import.meta.env.VITE_API_URL || ''

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
  '19:30'
]

const serviceSkeletonItems = [0, 1, 2, 3, 4]
const dateSkeletonItems = [0, 1, 2, 3, 4, 5, 6]
const bookingSteps = [
  { label: 'Hizmet', hint: 'Sana uygun bakımı seç. Süre ve ücretleri aşağıda görebilirsin.' },
  { label: 'Tarih', hint: 'Sana uygun günü seç. Kapalı günler seçime açık değildir.' },
  { label: 'Saat', hint: 'Günün müsait saatlerinden birini seç.' },
  { label: 'Özet', hint: 'Devam etmeden önce hizmet, tarih ve saatini kontrol et.' },
  { label: 'Bilgilerin', hint: 'Son bir adım: iletişim bilgilerini ekleyerek randevunu tamamla.' },
]

const pageReveal = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
}

function getDateOptions(baseDate = new Date()) {
  const weekdayFormatter = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' })
  const monthFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'short' })

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + index)

    return {
      value: formatLocalDate(date),
      weekday: index === 0 ? 'Bugun' : weekdayFormatter.format(date),
      day: date.getDate(),
      month: monthFormatter.format(date),
      isSunday: date.getDay() === 0,
    }
  })
}

function Randevu() {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [services, setServices] = useState(defaultServices)
  const [isServicesLoading, setIsServicesLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const serviceParam = params ? params.get('service') : null
    if (serviceParam) {
      const matched = defaultServices.find((s) => s.id === serviceParam)
      if (matched) return matched
    }
    return defaultServices[0]
  })
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [bookedTimes, setBookedTimes] = useState([])
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const [closedDays, setClosedDays] = useState([])
  const [isClosedDaysLoading, setIsClosedDaysLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerNote, setCustomerNote] = useState('')
  const [isKvkkAccepted, setIsKvkkAccepted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [createdAppointment, setCreatedAppointment] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [appointmentError, setAppointmentError] = useState('')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 10000)

    return () => clearInterval(timer)
  }, [])

  const todayString = formatLocalDate(currentTime)
  const isPastSlot = (time) => {
    if (!selectedDate) return false
    if (selectedDate < todayString) return true
    if (selectedDate === todayString) {
      const slotHour = parseInt(time.split(':')[0], 10)
      const currentHour = currentTime.getHours()
      return slotHour < currentHour
    }
    return false
  }

  const dateOptions = useMemo(() => getDateOptions(currentTime), [todayString])
  const closedDayValues = useMemo(() => new Set(closedDays.map((day) => day.date)), [closedDays])
  const visibleDateOptions = useMemo(
    () => dateOptions.map((date) => ({ ...date, isClosed: date.isSunday || closedDayValues.has(date.value) })),
    [closedDayValues, dateOptions],
  )
  const isSelectedDateAvailable = visibleDateOptions.some((date) => date.value === selectedDate && !date.isClosed)
  const isReadyToConfirm = selectedService && selectedDate && selectedTime && isSelectedDateAvailable
  const selectedDateInfo = visibleDateOptions.find((date) => date.value === selectedDate)
  const selectedDateLabel = selectedDateInfo
    ? `${selectedDateInfo.weekday} ${selectedDateInfo.day} ${selectedDateInfo.month}`
    : ''
  const customerPhoneDigits = useMemo(() => getTurkishMobileDigits(customerPhone), [customerPhone])
  const isCustomerPhoneValid = isValidTurkishMobileNumber(customerPhone)
  const isCustomerReady = customerName.trim() && isCustomerPhoneValid
  const canContinue =
    (step === 1 && selectedService) ||
    (step === 2 && selectedDate && isSelectedDateAvailable) ||
    (step === 3 && selectedTime) ||
    (step === 4 && isReadyToConfirm)

  useEffect(() => {
    let isMounted = true

    setIsServicesLoading(true)

    fetch(`${apiBaseUrl}/api/services`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Hizmetler alinamadi.')
        }

        return response.json()
      })
      .then((data) => {
        if (!isMounted || !Array.isArray(data.services) || data.services.length === 0) {
          return
        }

        setServices(data.services)
        setSelectedService((current) => {
          const params = new URLSearchParams(window.location.search)
          const serviceParam = params.get('service')
          if (serviceParam) {
            const matched = data.services.find((service) => service.id === serviceParam)
            if (matched) return matched
          }
          return data.services.find((service) => service.id === current?.id) || data.services[0]
        })
      })
      .catch(() => {
        if (isMounted) {
          setServices(defaultServices)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsServicesLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    setIsClosedDaysLoading(true)

    fetch(`${apiBaseUrl}/api/closed-days`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Kapali gunler alinamadi.')
        }

        return response.json()
      })
      .then((data) => {
        if (!isMounted || !Array.isArray(data.closedDays)) {
          return
        }

        setClosedDays(data.closedDays)
      })
      .catch(() => {
        if (isMounted) {
          setClosedDays([])
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsClosedDaysLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (selectedDate && !isSelectedDateAvailable) {
      setSelectedDate('')
      setSelectedTime('')
    }
  }, [isSelectedDateAvailable, selectedDate])

  useEffect(() => {
    if (!selectedDate) {
      setBookedTimes([])
      setIsAvailabilityLoading(false)
      return undefined
    }

    let isMounted = true

    setIsAvailabilityLoading(true)

    fetch(`${apiBaseUrl}/api/availability?date=${selectedDate}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Musaitlik alinamadi.')
        }

        return response.json()
      })
      .then((data) => {
        if (!isMounted || !Array.isArray(data.slots)) {
          return
        }

        const nextBookedTimes = data.slots.filter((slot) => slot.isBooked).map((slot) => slot.time)
        setBookedTimes(nextBookedTimes)
        setSelectedTime((current) => (nextBookedTimes.includes(current) || isPastSlot(current) ? '' : current))
      })
      .catch(() => {
        if (isMounted) {
          setBookedTimes([])
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAvailabilityLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedDate])

  useEffect(() => {
    if (selectedTime && isPastSlot(selectedTime)) {
      setSelectedTime('')
    }
  }, [currentTime, selectedDate, selectedTime])

  const createAppointment = async () => {
    if (!isCustomerPhoneValid) {
      setAppointmentError('Telefon numarasi 5xx xxx xx xx formatinda olmali.')
      return
    }

    setIsSubmitting(true)
    setAppointmentError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceId: selectedService.id,
          date: selectedDate,
          time: selectedTime,
          customerName,
          customerPhone: customerPhoneDigits,
          customerNote,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Randevu oluşturulamadı.')
      }

      setCreatedAppointment(data.appointment)
      setBookedTimes((current) => [...new Set([...current, selectedTime])])
      setIsCompleted(true)
      setStep(6)
    } catch (error) {
      setAppointmentError(error.message)

      if (error.message.includes('dolu')) {
        setBookedTimes((current) => [...new Set([...current, selectedTime])])
        setSelectedTime('')
        setStep(3)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="appointment-page">
      <BookingNav current="book" />
      <motion.section className="appointment-shell" {...pageReveal}>
        <span className="appointment-brand">Muhammed Barber</span>
        <h1>Stilin için yer ayır.</h1>
        <p>Hizmetini seç, sana uygun zamanı belirle. Gerisini bize bırak.</p>

        {step > 1 && !isCompleted && (
        <button className="selected-service-bar" type="button" onClick={() => setStep(1)}>
          <div>
            <span>Seçimleriniz</span>
            <strong>
              {selectedService.name} - {selectedService.price} - {selectedService.time}
            </strong>
          </div>
          <FaChevronRight aria-hidden="true" />
        </button>
        )}

        <div className="appointment-card">
          <ol className="booking-steps" aria-label="Randevu adımları">
            {bookingSteps.map((item, index) => (
              <li className={index + 1 < step ? 'is-done' : index + 1 === step ? 'is-current' : ''}
                aria-current={index + 1 === step ? 'step' : undefined} key={item.label}>
                <span>{index + 1 < step ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <strong>{item.label}</strong>
              </li>
            ))}
          </ol>
          {!isCompleted && <p className="booking-step-hint" aria-live="polite">{bookingSteps[step - 1].hint}</p>}

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                className="appointment-panel"
                key="service"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2>İşlem Seçin</h2>
                <div className="appointment-services">
                  {isServicesLoading
                    ? serviceSkeletonItems.map((item) => (
                        <div className="appointment-service appointment-service-skeleton" key={item}>
                          <div>
                            <i className="appointment-skeleton appointment-skeleton-title" />
                            <i className="appointment-skeleton appointment-skeleton-text" />
                          </div>
                          <i className="appointment-skeleton appointment-skeleton-price" />
                        </div>
                      ))
                    : services.map((service) => (
                        <button
                          className={`appointment-service ${selectedService.name === service.name ? 'is-selected' : ''}`}
                          type="button"
                          aria-pressed={selectedService.name === service.name}
                          key={service.name}
                          onClick={() => {
                            setSelectedService(service)
                            setSelectedDate('')
                            setSelectedTime('')
                          }}
                        >
                          <div>
                            <strong>{service.name}</strong>
                            <span>{service.time}</span>
                          </div>
                          <b>{service.price}</b>
                        </button>
                      ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                className="appointment-panel"
                key="date"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2>Tarih Seçin</h2>
                <div className="date-grid">
                  {isClosedDaysLoading
                    ? dateSkeletonItems.map((item) => (
                        <i className="appointment-skeleton appointment-date-skeleton" key={item} />
                      ))
                    : visibleDateOptions.map((date) => (
                        <button
                          className={`${selectedDate === date.value ? 'is-selected' : ''} ${
                            date.isClosed ? 'is-closed' : ''
                          }`}
                          type="button"
                          aria-pressed={selectedDate === date.value}
                          disabled={date.isClosed}
                          key={date.value}
                          onClick={() => {
                            setSelectedDate(date.value)
                            setSelectedTime('')
                          }}
                        >
                          <span>{date.weekday}</span>
                          <strong>{date.day}</strong>
                          <i>{date.month}</i>
                          {date.isClosed && <b aria-hidden="true">-</b>}
                        </button>
                      ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                className="appointment-panel"
                key="time"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2>Saat Seçin</h2>
                <div className="time-grid">
                  {isAvailabilityLoading
                    ? timeSlots.map((time) => <i className="appointment-skeleton appointment-time-skeleton" key={time} />)
                    : timeSlots.map((time) => {
                        const isUnavailable = bookedTimes.includes(time) || isPastSlot(time)
                        return (
                          <button
                            className={`${selectedTime === time ? 'is-selected' : ''} ${
                              isUnavailable ? 'is-booked' : ''
                            }`}
                            type="button"
                            aria-pressed={selectedTime === time}
                            disabled={isUnavailable}
                            key={time}
                            onClick={() => setSelectedTime(time)}
                          >
                            <span>{time}</span>
                            {isUnavailable && <i>-</i>}
                          </button>
                        )
                      })}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                className="appointment-panel"
                key="summary"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2>Seçimlerin</h2>
                <div className="appointment-review-list">
                  <div>
                    <span>İşlem</span>
                    <strong>{selectedService.name}</strong>
                  </div>
                  <div>
                    <span>Fiyat / sure</span>
                    <strong>
                      {selectedService.price} - {selectedService.time}
                    </strong>
                  </div>
                  <div>
                    <span>Tarih</span>
                    <strong>{selectedDateLabel}</strong>
                  </div>
                  <div>
                    <span>Saat</span>
                    <strong>{selectedTime}</strong>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                className="appointment-panel"
                key="customer"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <h2>Bilgilerin</h2>
                <div className="customer-form">
                  <label>
                    <span>Ad Soyad</span>
                    <input
                      type="text"
                      autoComplete="name"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      placeholder="Adinizi ve soyadinizi yazin"
                      required
                    />
                  </label>
                  <label>
                    <span>Telefon numaran</span>
                    <div className="phone-input">
                      <button type="button">TR +90</button>
                      <input
                        type="tel"
                        autoComplete="tel-national"
                        value={customerPhone}
                        onChange={(event) => setCustomerPhone(formatTurkishMobileInput(event.target.value))}
                        placeholder="5xx xxx xx xx"
                        inputMode="numeric"
                        pattern="5[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}"
                        title="5xx xxx xx xx formatinda girin"
                        aria-invalid={customerPhone ? !isCustomerPhoneValid : undefined}
                        required
                      />
                    </div>
                    <small className={`phone-format-hint ${customerPhone && !isCustomerPhoneValid ? 'is-invalid' : ''}`}>
                      5xx xxx xx xx formatinda olmalidir.
                    </small>
                  </label>
                  <label>
                    <span>Not (Opsiyonel)</span>
                    <textarea
                      value={customerNote}
                      onChange={(event) => setCustomerNote(event.target.value)}
                      placeholder="Eklemek istediginiz bir sey var mi?"
                    />
                  </label>

                  <label className="kvkk-check">
                    <input
                      type="checkbox"
                      checked={isKvkkAccepted}
                      onChange={(event) => setIsKvkkAccepted(event.target.checked)}
                    />
                    <span>
                      <a href="/kvkk" target="_blank" rel="noreferrer">
                        KVKK Aydınlatma Metni
                      </a>
                      ni okudum; bilgilerimin randevu amaciyla islenmesini onayliyorum.
                    </span>
                  </label>
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                className="appointment-panel completion-panel"
                key="complete"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <span>Tamamlandi</span>
                <h2>Randevun Alindi</h2>
                <p>
                  {createdAppointment?.customerName || customerName}, {selectedDateLabel} tarihinde saat {selectedTime} icin
                  randevu talebin oluşturuldu.
                </p>
                <div className="appointment-number-id">
                  <span>Sorgu numaran</span>
                  <strong>
                    {formatTurkishMobileInput(createdAppointment?.numberId || createdAppointment?.customerPhone || customerPhone)}
                  </strong>
                </div>
                <a className="booking-complete-link" href="/randevu-sorgula">Randevumu görüntüle <FaChevronRight aria-hidden="true" /></a>
              </motion.div>
            )}
          </AnimatePresence>

          {appointmentError && <p className="appointment-error" role="alert">{appointmentError}</p>}

          {!isCompleted && (
            <div className="appointment-bottom">
              <button
                className="wizard-back"
                type="button"
                disabled={step === 1}
                onClick={() => setStep((current) => Math.max(1, current - 1))}
              >
                <FaChevronLeft aria-hidden="true" />
                Geri
              </button>
              {step < 5 ? (
                <button
                  className="wizard-next"
                  type="button"
                  disabled={!canContinue}
                  onClick={() => setStep((current) => Math.min(5, current + 1))}
                >
                  Devam
                  <FaChevronRight aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="wizard-next"
                  type="button"
                  disabled={!isReadyToConfirm || !isCustomerReady || !isKvkkAccepted || isSubmitting}
                  onClick={createAppointment}
                >
                  {isSubmitting ? (
                    <>
                      Tamamlaniyor
                      <FaSpinner className="wizard-spinner" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Randevuyu Tamamla
                      <FaChevronRight aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.section>
    </main>
  )
}

export default Randevu
