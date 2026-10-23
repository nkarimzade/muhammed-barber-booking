import { FaChevronDown, FaBan, FaTrashCan } from 'react-icons/fa6'

function AppointmentActions({ appointment, onBlock, onDelete }) {
  return (
    <details className="admin-appointment-actions">
      <summary aria-label={`${appointment.customerName} için işlemler`}>İşlemler <FaChevronDown aria-hidden="true" /></summary>
      <div>
        <button type="button" onClick={() => onBlock(appointment)}><FaBan aria-hidden="true" /> Numarayı engelle</button>
        <button type="button" onClick={() => onDelete(appointment)}><FaTrashCan aria-hidden="true" /> Randevuyu sil</button>
      </div>
    </details>
  )
}

export default AppointmentActions
