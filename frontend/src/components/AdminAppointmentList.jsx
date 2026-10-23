import { FaPhone } from 'react-icons/fa6'
import AppointmentActions from './AppointmentActions'
import { formatTurkishMobileInput } from '../utils/phone'

function AdminAppointmentList({ appointments, selectedDate, searchQuery, onClearSearch, onBlock, onDelete }) {
  return (
    <div className="admin-mobile-agenda">
      {appointments.length === 0 ? (
        <div className="admin-agenda-empty">
          <strong>{searchQuery ? 'Sonuç bulunamadı' : 'Randevu yok'}</strong>
          <p>{searchQuery ? 'İsim veya telefon numarasını kontrol et.' : 'Bu tarihte kayıtlı randevu bulunmuyor.'}</p>
          {searchQuery && <button type="button" onClick={onClearSearch}>Aramayı temizle</button>}
        </div>
      ) : (
        <ol className="admin-mobile-appointment-list" aria-label="Saat sırasına göre randevular">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <time className="admin-agenda-time" dateTime={`${appointment.date || selectedDate}T${appointment.time}:00+03:00`}>
                {appointment.time}
              </time>
              <div className="admin-agenda-customer">
                <h2>{appointment.customerName}</h2>
                <p className="admin-agenda-service">{appointment.serviceName}</p>
                <a className="admin-agenda-phone" href={`tel:${appointment.customerPhone}`}>
                  <FaPhone aria-hidden="true" />{formatTurkishMobileInput(appointment.customerPhone)}
                </a>
                {appointment.customerNote && <p className="admin-agenda-note">{appointment.customerNote}</p>}
                <AppointmentActions appointment={appointment} onBlock={onBlock} onDelete={onDelete} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default AdminAppointmentList
