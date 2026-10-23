import { FaCheck, FaCircleExclamation, FaCircleInfo, FaRotateRight, FaXmark } from 'react-icons/fa6'

function AdminNotice({ type = 'info', message, onClose }) {
  const Icon = type === 'success' ? FaCheck : type === 'error' ? FaCircleExclamation : type === 'loading' ? FaRotateRight : FaCircleInfo
  return (
    <div className="admin-toast-container">
      <div className={`admin-toast is-${type}`} role={type === 'error' ? 'alert' : 'status'} aria-atomic="true">
        <span className="admin-notice-icon" aria-hidden="true"><Icon className={type === 'loading' ? 'admin-spin' : undefined} /></span>
        <span className="admin-notice-message">{message}</span>
        <button type="button" className="admin-toast-close" aria-label="Bildirimi kapat" onClick={onClose}><FaXmark aria-hidden="true" /></button>
      </div>
    </div>
  )
}

export default AdminNotice
