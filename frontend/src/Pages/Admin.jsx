import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  FaArrowRightFromBracket,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUpRightFromSquare,
  FaBan,
  FaCalendarDays,
  FaCheck,
  FaCircleCheck,
  FaCircleExclamation,
  FaCircleInfo,
  FaClock,
  FaEye,
  FaEyeSlash,
  FaFilePdf,
  FaFloppyDisk,
  FaLock,
  FaMagnifyingGlass,
  FaPhone,
  FaPlus,
  FaRotateRight,
  FaTags,
  FaTrash,
  FaTrashCan,
  FaUserTie,
  FaXmark,
} from 'react-icons/fa6'
import { formatLocalDate } from '../utils/date'
import { ADMIN_SESSION_DAYS, getStoredAdminToken, isAdminSessionExpired } from '../utils/admin-session'
import AdminAppointmentList from '../components/AdminAppointmentList'
import AppointmentActions from '../components/AppointmentActions'
import AdminNotice from '../components/AdminNotice'
import './Admin.css'
import './AdminStudio.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || ''

const sections = {
  '/admin': {
    title: 'Randevular',
    eyebrow: 'Randevu Takibi',
    description: 'Günlük randevuları takip et, telefon numarasını gör ve gelmeyen müşteriyi tek tıkla engelle.',
  },
  '/admin/gun-kapat': {
    title: 'Gün Kapat',
    eyebrow: 'Takvim Yönetimi',
    description: 'Randevu alınmayacak tarihleri belirle.',
  },
  '/admin/saat-kapat': {
    title: 'Saat Kapat',
    eyebrow: 'Saat Yönetimi',
    description: 'Seçili günün kapalı saatlerini düzenle.',
  },
  '/admin/numara-engelle': {
    title: 'Numara Engelle',
    eyebrow: 'Müşteri Kontrolü',
    description: 'Engellenen telefon numaralarını yönet.',
  },
  '/admin/fiyatlar': {
    title: 'Fiyatlar',
    eyebrow: 'Hizmet Yönetimi',
    description: 'Hizmet fiyatlarını ve sürelerini güncelle.',
  },
  '/admin/islem-ekle': {
    title: 'İşlem Ekle',
    eyebrow: 'Yeni Hizmet',
    description: 'Hizmet listesine yeni işlem ekle.',
  },
  '/admin/islem-sil': {
    title: 'İşlem Sil',
    eyebrow: 'Hizmet Temizliği',
    description: 'Listeden kaldırılacak hizmeti seç.',
  },
}

const navItems = [
  { to: '/admin', label: 'Randevular', icon: FaCalendarDays },
  { to: '/admin/gun-kapat', label: 'Gün Kapat', icon: FaBan },
  { to: '/admin/saat-kapat', label: 'Saat Kapat', icon: FaClock },
  { to: '/admin/numara-engelle', label: 'Numara Engelle', icon: FaPhone },
  { to: '/admin/fiyatlar', label: 'Fiyatlar', icon: FaTags },
  { to: '/admin/islem-ekle', label: 'İşlem Ekle', icon: FaPlus },
  { to: '/admin/islem-sil', label: 'İşlem Sil', icon: FaTrash },
]

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

const skeletonRows = [0, 1, 2, 3]
const serviceSkeletonRows = [0, 1, 2, 3, 4]
const chipSkeletonRows = [0, 1, 2]

function Admin() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentPath = sections[location.pathname] ? location.pathname : '/admin'
  const currentSection = sections[currentPath]
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [token, setToken] = useState(getStoredAdminToken)
  const [dashboard, setDashboard] = useState({
    services: [],
    closedDays: [],
    blockedSlots: [],
    blockedPhones: [],
    appointments: [],
  })
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()))
  const [selectedSlotTime, setSelectedSlotTime] = useState(timeSlots[0])
  const [blockedSlotNote, setBlockedSlotNote] = useState('')
  const [closedDayNote, setClosedDayNote] = useState('')
  const [blockedPhone, setBlockedPhone] = useState('')
  const [blockedPhoneNote, setBlockedPhoneNote] = useState('')
  const [newService, setNewService] = useState({ name: '', price: '', time: '', detail: '' })
  const [status, setStatus] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileNavigation, setIsMobileNavigation] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches,
  )
  const menuButtonRef = useRef(null)
  const sidebarRef = useRef(null)
  const closeMenuRef = useRef(null)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const onChange = () => {
      setIsMobileNavigation(media.matches)
      if (!media.matches) setIsSidebarOpen(false)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!token || !isSidebarOpen || !isMobileNavigation) return undefined
    const previousOverflow = document.body.style.overflow
    const menuTrigger = menuButtonRef.current
    document.body.style.overflow = 'hidden'
    closeMenuRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsSidebarOpen(false)
      if (event.key !== 'Tab') return
      const controls = [...sidebarRef.current.querySelectorAll('a[href], button:not(:disabled)')]
        .filter((element) => element.getClientRects().length)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      menuTrigger?.focus({ preventScroll: true })
    }
  }, [token, isSidebarOpen, isMobileNavigation])
  const [isDashboardLoading, setIsDashboardLoading] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null)
  const [isConfirmLoading, setIsConfirmLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR')
    return dashboard.appointments.filter((appointment) =>
      [appointment.customerName, appointment.customerPhone, appointment.serviceName, appointment.time]
        .some((value) => String(value || '').toLocaleLowerCase('tr-TR').includes(query)),
    )
  }, [dashboard.appointments, searchQuery])
  const selectedDayLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', weekday: 'long',
  })
  const shiftSelectedDate = (offset) => {
    const date = new Date(`${selectedDate}T12:00:00`)
    date.setDate(date.getDate() + offset)
    setSelectedDate(formatLocalDate(date))
    setSearchQuery('')
  }

  const showToast = useCallback((type, message) => {
    setToast({ type, message })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => {
      setToast(null)
    }, 3800)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!token || !status || status.endsWith('...')) return undefined
    const timer = window.setTimeout(() => setStatus(''), 3800)
    return () => window.clearTimeout(timer)
  }, [token, status])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && confirmModal && !isConfirmLoading) {
        setConfirmModal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [confirmModal, isConfirmLoading])

  const isAuthenticated = Boolean(token)
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const isStatusLoading = status.endsWith('...')
  const notification = isStatusLoading ? { type: 'loading', message: status } :
    toast || (status ? { type: 'info', message: status } : null)

  // Keep the login screen and active-session expiry consistent.
  useEffect(() => {
    if (!isAuthenticated) return

    const checkSession = () => {
      const loginTime = localStorage.getItem('adminLoginTime')
      if (isAdminSessionExpired(loginTime)) {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminLoginTime')
        setToken('')
        setPassword('')
        setStatus('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
      }
    }

    checkSession()
    const interval = setInterval(checkSession, 15000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated) return

    setIsDashboardLoading(true)
    setStatus('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/dashboard?date=${selectedDate}`, {
        headers: authHeaders,
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminLoginTime')
          setToken('')
          throw new Error('Oturum süresi doldu veya şifre geçersiz.')
        }
        throw new Error(data.message || 'Admin bilgileri alınamadı.')
      }

      setDashboard({
        ...data,
        services: data.services || [],
        closedDays: data.closedDays || [],
        blockedSlots: data.blockedSlots || [],
        blockedPhones: data.blockedPhones || [],
        appointments: [...(data.appointments || [])].sort((a, b) => a.time.localeCompare(b.time)),
      })
      setStatus('')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsDashboardLoading(false)
    }
  }, [authHeaders, isAuthenticated, selectedDate])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard, location.pathname])

  const login = async (event) => {
    event.preventDefault()
    const trimmed = password.trim()
    if (!trimmed) {
      setStatus('Lütfen şifrenizi girin.')
      return
    }

    setIsLoginLoading(true)
    setStatus('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/dashboard?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${trimmed}` },
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error('Şifre yanlış')
      }

      const now = Date.now()
      localStorage.setItem('adminToken', trimmed)
      localStorage.setItem('adminLoginTime', String(now))
      setToken(trimmed)
      setDashboard({
        ...data,
        services: data.services || [],
        closedDays: data.closedDays || [],
        blockedSlots: data.blockedSlots || [],
        blockedPhones: data.blockedPhones || [],
        appointments: [...(data.appointments || [])].sort((a, b) => a.time.localeCompare(b.time)),
      })
      setStatus('')
    } catch (error) {
      if (
        error.message === 'Şifre yanlış' ||
        error.message.includes('Admin yetkisi') ||
        error.message.includes('yetki') ||
        error.message.includes('geçersiz') ||
        error.message.includes('hatalı')
      ) {
        setStatus('Şifre yanlış')
      } else {
        setStatus(error.message || 'Şifre yanlış')
      }
    } finally {
      setIsLoginLoading(false)
    }
  }

  const logout = () => {
    setIsSidebarOpen(false)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminLoginTime')
    setToken('')
    setPassword('')
    setStatus('')
    navigate('/admin')
  }

  const updateService = async (service) => {
    setStatus('Fiyat guncelleniyor...')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/services/${service.id}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(service),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Hizmet guncellenemedi.')
      }

      setDashboard((current) => ({
        ...current,
        services: current.services.map((item) => (item.id === data.service.id ? data.service : item)),
      }))
      setStatus('Fiyat guncellendi.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  const closeSelectedDay = async (event) => {
    event.preventDefault()
    setStatus('Gun kapatiliyor...')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/closed-days`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedDate, note: closedDayNote }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Gun kapatilamadi.')
      }

      setClosedDayNote('')
      await loadDashboard()
      setStatus('Gun randevuya kapatildi.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  const openClosedDay = (date) => {
    setConfirmModal({
      title: 'Günü Randevuya Aç',
      subtitle: `${date} tarihli günün randevu engelini kaldırmak istediğinize emin misiniz?`,
      itemName: `${date} Tarihli Gün`,
      warning: 'Bu gün tekrar müşteriler tarafından randevu alınabilir hale gelecektir.',
      confirmText: 'Evet, Günü Aç',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setIsConfirmLoading(true)
        setStatus('Gün açılıyor...')

        try {
          const response = await fetch(`${apiBaseUrl}/api/admin/closed-days/${date}`, {
            method: 'DELETE',
            headers: authHeaders,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Gün açılamadı.')
          }

          await loadDashboard()
          setStatus('Gün tekrar açıldı.')
          showToast('success', `${date} günü tekrar randevuya açıldı.`)
          setConfirmModal(null)
        } catch (error) {
          setStatus(error.message)
          showToast('error', error.message || 'Gün açılamadı.')
        } finally {
          setIsConfirmLoading(false)
        }
      },
    })
  }

  const closeSelectedSlot = async (event) => {
    event.preventDefault()
    setStatus('Saat kapatiliyor...')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/blocked-slots`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedDate, time: selectedSlotTime, note: blockedSlotNote }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Saat kapatilamadi.')
      }

      setBlockedSlotNote('')
      await loadDashboard()
      setStatus('Saat randevuya kapatildi.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  const openBlockedSlot = (slot) => {
    const slotId = typeof slot === 'object' ? slot.id : slot
    const slotLabel = typeof slot === 'object' && slot.time ? `${slot.date} • ${slot.time}` : 'Seçilen saat'

    setConfirmModal({
      title: 'Saat Engelini Kaldır',
      subtitle: 'Bu saatin randevu engelini kaldırmak istediğinize emin misiniz?',
      itemName: slotLabel,
      warning: 'Bu saat dilimi tekrar müşteriler tarafından seçilebilir olacaktır.',
      confirmText: 'Evet, Saati Aç',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setIsConfirmLoading(true)
        setStatus('Saat açılıyor...')

        try {
          const response = await fetch(`${apiBaseUrl}/api/admin/blocked-slots/${slotId}`, {
            method: 'DELETE',
            headers: authHeaders,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Saat açılamadı.')
          }

          await loadDashboard()
          setStatus('Saat tekrar açıldı.')
          showToast('success', 'Saat engeli başarıyla kaldırıldı.')
          setConfirmModal(null)
        } catch (error) {
          setStatus(error.message)
          showToast('error', error.message || 'Saat açılamadı.')
        } finally {
          setIsConfirmLoading(false)
        }
      },
    })
  }

  const blockPhone = async (phone, note = '') => {
    setStatus('Numara engelleniyor...')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/blocked-phones`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, note }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Numara engellenemedi.')
      }

      setBlockedPhone('')
      setBlockedPhoneNote('')
      await loadDashboard()
      setStatus('Numara engellendi.')
      showToast('success', `${phone} başarıyla engellendi.`)
    } catch (error) {
      setStatus(error.message)
      showToast('error', error.message || 'Numara engellenemedi.')
    }
  }

  const blockSelectedPhone = async (event) => {
    event.preventDefault()
    await blockPhone(blockedPhone, blockedPhoneNote)
  }

  const blockAppointmentPhone = async (appointment) => {
    await blockPhone(
      appointment.customerPhone,
      `Randevuya gelmedi: ${appointment.customerName} - ${appointment.date} ${appointment.time}`,
    )
  }

  const deleteSelectedAppointment = (appointment) => {
    const appointmentId = typeof appointment === 'object' ? appointment.id : appointment
    const customerTitle =
      typeof appointment === 'object'
        ? `${appointment.customerName} (${appointment.customerPhone})`
        : 'Seçilen Randevu'
    const tags =
      typeof appointment === 'object'
        ? [appointment.date, appointment.time, appointment.serviceName].filter(Boolean)
        : []

    setConfirmModal({
      title: 'Randevuyu Sil',
      subtitle: 'Bu randevuyu kalıcı olarak silmek istediğinize emin misiniz?',
      itemName: customerTitle,
      itemTags: tags,
      warning: 'Bu işlem geri alınamaz. Randevu takvimden kalıcı olarak silinecektir.',
      confirmText: 'Evet, Randevuyu Sil',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setIsConfirmLoading(true)
        setStatus('Randevu siliniyor...')

        try {
          const response = await fetch(`${apiBaseUrl}/api/admin/appointments/${appointmentId}`, {
            method: 'DELETE',
            headers: authHeaders,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Randevu silinemedi.')
          }

          setDashboard((current) => ({
            ...current,
            appointments: current.appointments.filter((a) => a.id !== appointmentId),
          }))
          setStatus('Randevu silindi.')
          showToast('success', 'Randevu başarıyla silindi.')
          setConfirmModal(null)
        } catch (error) {
          setStatus(error.message)
          showToast('error', error.message || 'Randevu silinemedi.')
        } finally {
          setIsConfirmLoading(false)
        }
      },
    })
  }

  const unblockSelectedPhone = (phone) => {
    setConfirmModal({
      title: 'Numara Engelini Kaldır',
      subtitle: `${phone} numarasının engelini kaldırmak istediğinize emin misiniz?`,
      itemName: phone,
      warning: 'Bu numara sahibi yeniden online randevu oluşturabilecektir.',
      confirmText: 'Evet, Engeli Kaldır',
      confirmVariant: 'primary',
      onConfirm: async () => {
        setIsConfirmLoading(true)
        setStatus('Engel kaldırılıyor...')

        try {
          const response = await fetch(`${apiBaseUrl}/api/admin/blocked-phones/${phone}`, {
            method: 'DELETE',
            headers: authHeaders,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'Engel kaldırılamadı.')
          }

          await loadDashboard()
          setStatus('Numara engeli kaldırıldı.')
          showToast('success', `${phone} numarasının engeli kaldırıldı.`)
          setConfirmModal(null)
        } catch (error) {
          setStatus(error.message)
          showToast('error', error.message || 'Engel kaldırılamadı.')
        } finally {
          setIsConfirmLoading(false)
        }
      },
    })
  }

  const downloadDailyPdf = async () => {
    setStatus('PDF hazirlaniyor...')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/appointments/pdf?date=${selectedDate}`, {
        headers: authHeaders,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'PDF indirilemedi.')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `randevular-${selectedDate}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      setStatus('PDF indirildi.')
      showToast('success', 'PDF indirildi.')
    } catch (error) {
      setStatus(error.message)
      showToast('error', error.message || 'PDF indirilemedi.')
    }
  }

  const setServiceValue = (serviceId, key, value) => {
    setDashboard((current) => ({
      ...current,
      services: current.services.map((service) => (service.id === serviceId ? { ...service, [key]: value } : service)),
    }))
  }

  const setNewServiceValue = (key, value) => {
    setNewService((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const createNewService = async (event) => {
    event.preventDefault()
    setStatus('Islem ekleniyor...')

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/services`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newService),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Islem eklenemedi.')
      }

      setDashboard((current) => ({
        ...current,
        services: [...current.services, data.service],
      }))
      setNewService({ name: '', price: '', time: '', detail: '' })
      setStatus('Yeni islem eklendi.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  const deleteSelectedService = (service) => {
    const serviceObj =
      typeof service === 'object'
        ? service
        : dashboard.services.find((s) => s.id === service) || { id: service, name: 'Hizmet' }
    const serviceId = serviceObj.id

    setConfirmModal({
      title: 'İşlemi Sil',
      subtitle: `"${serviceObj.name}" işlemini kalıcı olarak silmek istediğinize emin misiniz?`,
      itemName: serviceObj.name,
      itemTags: [serviceObj.price, serviceObj.time].filter(Boolean),
      warning: 'Bu işlem geri alınamaz. Bu hizmet ana sayfadan ve randevu alma sisteminden tamamen kaldırılacaktır.',
      confirmText: 'Evet, İşlemi Sil',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setIsConfirmLoading(true)
        setStatus('İşlem siliniyor...')

        try {
          const response = await fetch(`${apiBaseUrl}/api/admin/services/${serviceId}`, {
            method: 'DELETE',
            headers: authHeaders,
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(data.message || 'İşlem silinemedi.')
          }

          setDashboard((current) => ({
            ...current,
            services: current.services.filter((s) => s.id !== serviceId),
          }))
          setStatus('İşlem silindi.')
          showToast('success', `"${serviceObj.name}" işlemi başarıyla silindi.`)
          setConfirmModal(null)
        } catch (error) {
          setStatus(error.message)
          showToast('error', error.message || 'İşlem silinemedi.')
        } finally {
          setIsConfirmLoading(false)
        }
      },
    })
  }

  if (!isAuthenticated) {
    const isError = status === 'Şifre yanlış' || status.includes('şifre') || status.includes('Şifre')
    const isSessionExpired = status.includes('Oturum süreniz doldu')

    return (
      <main className="admin-login-page admin-studio-login">
        <header className="admin-signin-topbar">
          <Link to="/" className="admin-signin-brand"><img src="/logo.png" alt="" /><span>Muhammed Barber</span></Link>
          <Link to="/" className="admin-signin-back">Siteye dön <FaArrowUpRightFromSquare aria-hidden="true" /></Link>
        </header>
        <div className="admin-login-form-area">
        <form className="admin-login-card" onSubmit={login}>
          <div className="admin-login-header">
            <div className="admin-login-logo-wrap">
              <img className="admin-login-logo" src="/logo.png" alt="Muhammed Barber logo" />
            </div>
            <span className="admin-login-badge">Yönetici Girişi</span>
            <h1>Yönetici girişi</h1>
            <p>Panele erişmek için şifreni gir.</p>
          </div>

          <div className="admin-login-field">
            <label htmlFor="admin-password-input">Şifre</label>
            <div className="admin-login-input-wrap">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  if (status === 'Şifre yanlış') {
                    setStatus('')
                  }
                }}
                placeholder="Yönetici şifreniz"
                autoFocus
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="admin-login-eye-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button className="admin-login-submit" type="submit" disabled={isLoginLoading}>
            {isLoginLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            <FaArrowRight aria-hidden="true" />
          </button>

          {status && (
            <div
              className={`admin-login-alert ${isError ? 'is-error' : ''} ${isSessionExpired ? 'is-warning' : ''}`}
              role="alert"
            >
              {isError ? (
                <FaCircleExclamation aria-hidden="true" />
              ) : isSessionExpired ? (
                <FaClock aria-hidden="true" />
              ) : (
                <FaCircleInfo aria-hidden="true" />
              )}
              <span>{status}</span>
            </div>
          )}

          <div className="admin-login-footer">
            <span><FaLock aria-hidden="true" /> Bu cihazda {ADMIN_SESSION_DAYS} gün açık kalır.</span>
          </div>
        </form>
        </div>
      </main>
    )
  }

  return (
    <main className={`admin-dashboard admin-studio ${isSidebarOpen ? 'is-sidebar-open' : ''}`}>
      <header className="admin-mobile-topbar" inert={isMobileNavigation && isSidebarOpen ? true : undefined}>
        <Link to="/admin" className="admin-mobile-identity">
          <img src="/logo.png" alt="" />
          <span><small>Muhammed Barber</small><strong>{currentSection.title}</strong></span>
        </Link>
        <button
          className="admin-mobile-menu-button"
          ref={menuButtonRef}
          type="button"
          onClick={() => setIsSidebarOpen((current) => !current)}
          aria-label="Yönetim menüsünü aç"
          aria-expanded={isSidebarOpen}
          aria-controls="admin-navigation"
        >
          <span>Menü</span>
          <span className="admin-menu-glyph" aria-hidden="true"><i /><i /></span>
        </button>
      </header>

      <button
        className="admin-sidebar-backdrop"
        type="button"
        onClick={() => setIsSidebarOpen(false)}
        aria-label="Menuyu kapat"
        tabIndex={-1}
        aria-hidden="true"
      />

      <aside className="admin-dashboard-sidebar" id="admin-navigation" ref={sidebarRef}
        role={isMobileNavigation && isSidebarOpen ? 'dialog' : undefined}
        aria-modal={isMobileNavigation && isSidebarOpen ? true : undefined}
        aria-label="Yönetim menüsü"
        inert={isMobileNavigation && !isSidebarOpen ? true : undefined}>
        <div className="admin-drawer-heading">
          <div><span>Muhammed Barber</span><h2>Menü</h2></div>
          <button type="button" ref={closeMenuRef} onClick={() => setIsSidebarOpen(false)} aria-label="Menüyü kapat"><FaXmark aria-hidden="true" /></button>
        </div>
        <div className="admin-sidebar-brand">
          <img className="admin-brand-logo" src="/logo.png" alt="Muhammed Barber logo" />
          <div>
            <strong>Muhammed Barber</strong>
            <span>Yönetim alanı</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item, index) => {
            const Icon = item.icon

            return (
              <div className="admin-nav-entry" key={item.to}>
              {(index === 0 || index === 1 || index === 4) && <span className="admin-nav-caption">{index === 0 ? 'GENEL BAKIŞ' : index === 1 ? 'TAKVİM & MÜŞTERİLER' : 'HİZMETLER'}</span>}
              <Link
                className={currentPath === item.to ? 'is-active' : ''}
                to={item.to}
                aria-current={currentPath === item.to ? 'page' : undefined}
                onClick={() => setIsSidebarOpen(false)}
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
              </div>
            )
          })}
        </nav>

        <a className="admin-drawer-site-link" href="/" target="_blank" rel="noreferrer">Siteyi görüntüle <FaArrowUpRightFromSquare aria-hidden="true" /></a>
        <div className="admin-sidebar-footer"><div className="admin-user-avatar">MB</div><div><strong>Salon yöneticisi</strong><span>Muhammed Barber</span></div></div>
        <button className="admin-logout-button" type="button" onClick={logout}>
          <FaArrowRightFromBracket aria-hidden="true" />
          Çıkış
        </button>
      </aside>

      <section className="admin-dashboard-main" inert={isMobileNavigation && isSidebarOpen ? true : undefined}>
        <div className="admin-workspace-bar">
          <span>Muhammed Barber</span>
          <a href="/" target="_blank" rel="noreferrer">Siteyi görüntüle <FaArrowUpRightFromSquare aria-hidden="true" /></a>
        </div>
        <header className="admin-topbar">
          <div>
            <h1>{currentSection.title}</h1>
            <p>{currentPath === '/admin' ? selectedDayLabel : currentSection.description}</p>
          </div>
        </header>

        {currentPath === '/admin' && (
          <section className="admin-content-card admin-appointments-card" aria-label="Randevu listesi">
            <div className="admin-card-toolbar">
              <div className="admin-date-controls">
              <button type="button" className="admin-date-arrow" aria-label="Önceki gün" onClick={() => shiftSelectedDate(-1)}><FaArrowLeft aria-hidden="true" /></button>
              <label className="admin-toolbar-date">
                <span>Tarih Seç</span>
                <input type="date" value={selectedDate} required onChange={(event) => { if (event.target.value) { setSelectedDate(event.target.value); setSearchQuery('') } }} />
              </label>
              <button type="button" className="admin-date-arrow" aria-label="Sonraki gün" onClick={() => shiftSelectedDate(1)}><FaArrowRight aria-hidden="true" /></button>
              <button type="button" className="admin-today-button" onClick={() => { setSelectedDate(formatLocalDate(new Date())); setSearchQuery('') }}>Bugün</button>
              </div>
              <div className="admin-toolbar-actions">
                <button type="button" className="admin-btn-refresh" onClick={loadDashboard} disabled={isDashboardLoading}>
                  <FaRotateRight aria-hidden="true" />
                  Yenile
                </button>
                <button type="button" className="admin-btn-pdf" onClick={downloadDailyPdf}>
                  <FaFilePdf aria-hidden="true" />
                  PDF 
                </button>
              </div>
            </div>
            <div className="admin-search-row">
              <label className="admin-appointment-search"><FaMagnifyingGlass aria-hidden="true" /><input type="search" aria-label="Randevularda ara" placeholder="Müşteri, telefon veya hizmet ara…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></label>
              <span aria-live="polite">{isDashboardLoading ? 'Yükleniyor…' : `${filteredAppointments.length} kayıt`}</span>
            </div>

            {isDashboardLoading ? (
              <div className="admin-table-skeleton">
                {skeletonRows.map((row) => (
                  <div className="admin-skeleton-row" key={row}>
                    <i className="admin-skeleton admin-skeleton-time" />
                    <i className="admin-skeleton admin-skeleton-name" />
                    <i className="admin-skeleton admin-skeleton-phone" />
                    <i className="admin-skeleton admin-skeleton-action" />
                  </div>
                ))}
              </div>
            ) : (
              <>
              <AdminAppointmentList appointments={filteredAppointments} selectedDate={selectedDate}
                searchQuery={searchQuery} onClearSearch={() => setSearchQuery('')}
                onBlock={blockAppointmentPhone} onDelete={deleteSelectedAppointment} />
              <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Saat</th>
                    <th>Müşteri</th>
                    <th>Telefon</th>
                    <th>Hizmet</th>
                    <th>Not</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length === 0 && (
                    <tr className="admin-empty-row">
                      <td colSpan="6" className="admin-empty-cell">
                        <div className="admin-empty-state"><FaCalendarDays aria-hidden="true" /><strong>{searchQuery ? 'Eşleşen randevu bulunamadı.' : 'Bu gün için randevu yok.'}</strong><p>{searchQuery ? 'Farklı bir isim veya telefon numarası deneyebilirsin.' : 'Yeni randevular alındıkça burada listelenecek.'}</p>{searchQuery && <button type="button" onClick={() => setSearchQuery('')}>Aramayı temizle</button>}</div>
                      </td>
                    </tr>
                  )}
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td data-label="Saat" className="admin-time-cell">
                        {appointment.time}
                      </td>
                      <td data-label="Musteri">
                        <strong>{appointment.customerName}</strong>
                      </td>
                      <td data-label="Telefon">
                        <a className="admin-phone-link" href={`tel:${appointment.customerPhone}`}>
                          <FaPhone aria-hidden="true" />
                          {appointment.customerPhone}
                        </a>
                      </td>
                      <td data-label="Hizmet">{appointment.serviceName}</td>
                      <td data-label="Not">{appointment.customerNote || '-'}</td>
                      <td data-label="Aksiyon">
                        <AppointmentActions appointment={appointment} onBlock={blockAppointmentPhone} onDelete={deleteSelectedAppointment} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </>
            )}
          </section>
        )}

        {currentPath === '/admin/gun-kapat' && (
          <section className="admin-two-column">
            <form className="admin-content-card admin-form-card" onSubmit={closeSelectedDay}>
              <h2>Gün Kapat</h2>
              <div className="admin-form-fields">
                <label>
                  <span>Tarih</span>
                  <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                </label>
                <label>
                  <span>Not</span>
                  <input value={closedDayNote} onChange={(event) => setClosedDayNote(event.target.value)} placeholder="Örn. İzin günü" />
                </label>
                <button type="submit" className="admin-submit-btn">
                  <FaBan aria-hidden="true" />
                  Günü Kapat
                </button>
              </div>
            </form>

            <section className="admin-content-card">
              <h2>Kapalı Günler</h2>
              <div className="admin-chip-list">
                {isDashboardLoading
                  ? chipSkeletonRows.map((row) => <i className="admin-skeleton admin-chip-skeleton" key={row} />)
                  : dashboard.closedDays.length === 0 && <p>Kapalı gün yok.</p>}
                {!isDashboardLoading &&
                  dashboard.closedDays.map((day) => (
                    <button type="button" key={day.date} onClick={() => openClosedDay(day.date)}>
                      {day.date}
                      <span>
                        <FaCheck aria-hidden="true" />
                        Aç
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          </section>
        )}

        {currentPath === '/admin/saat-kapat' && (
          <section className="admin-two-column">
            <form className="admin-content-card admin-form-card" onSubmit={closeSelectedSlot}>
              <h2>Saat Kapat</h2>
              <div className="admin-form-fields">
                <label>
                  <span>Tarih</span>
                  <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                </label>
                <label>
                  <span>Saat</span>
                  <select value={selectedSlotTime} onChange={(event) => setSelectedSlotTime(event.target.value)}>
                    {timeSlots.map((time) => {
                      const isToday = selectedDate === formatLocalDate(new Date())
                      const isPast = isToday && parseInt(time.split(':')[0], 10) < new Date().getHours()
                      return (
                        <option value={time} key={time}>
                          {time} {isPast ? '(-)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <label>
                  <span>Not</span>
                  <input
                    value={blockedSlotNote}
                    onChange={(event) => setBlockedSlotNote(event.target.value)}
                    placeholder="Örn. Mola / Özel iş"
                  />
                </label>
                <button type="submit" className="admin-submit-btn">
                  <FaClock aria-hidden="true" />
                  Saati Kapat
                </button>
              </div>
            </form>

            <section className="admin-content-card">
              <h2>Kapalı Saatler</h2>
              <div className="admin-chip-list">
                {isDashboardLoading
                  ? chipSkeletonRows.map((row) => <i className="admin-skeleton admin-chip-skeleton" key={row} />)
                  : dashboard.blockedSlots.length === 0 && <p>Bu tarih için kapalı saat yok.</p>}
                {!isDashboardLoading &&
                  dashboard.blockedSlots.map((slot) => (
                    <button type="button" key={slot.id} onClick={() => openBlockedSlot(slot)}>
                      {slot.date} / {slot.time}
                      <span>
                        <FaCheck aria-hidden="true" />
                        Aç
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          </section>
        )}

        {currentPath === '/admin/numara-engelle' && (
          <section className="admin-two-column">
            <form className="admin-content-card admin-form-card" onSubmit={blockSelectedPhone}>
              <h2>Numara Engelle</h2>
              <div className="admin-form-fields">
                <label>
                  <span>Telefon</span>
                  <input
                    type="tel"
                    value={blockedPhone}
                    onChange={(event) => setBlockedPhone(event.target.value)}
                    placeholder="0536 415 97 42"
                    required
                  />
                </label>
                <label>
                  <span>Not</span>
                  <input value={blockedPhoneNote} onChange={(event) => setBlockedPhoneNote(event.target.value)} placeholder="Engelleme sebebi" />
                </label>
                <button type="submit" className="admin-submit-btn admin-danger-button">
                  <FaBan aria-hidden="true" />
                  Engelle
                </button>
              </div>
            </form>

            <section className="admin-content-card">
              <h2>Engelli Numaralar</h2>
              <div className="admin-chip-list">
                {isDashboardLoading
                  ? chipSkeletonRows.map((row) => <i className="admin-skeleton admin-chip-skeleton" key={row} />)
                  : dashboard.blockedPhones.length === 0 && <p>Engelli numara yok.</p>}
                {!isDashboardLoading &&
                  dashboard.blockedPhones.map((item) => (
                    <button type="button" key={item.phone} onClick={() => unblockSelectedPhone(item.phone)}>
                      {item.phone}
                      <span>
                        <FaTrashCan aria-hidden="true" />
                        Kaldır
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          </section>
        )}

        {currentPath === '/admin/fiyatlar' && (
          <section className="admin-content-card admin-price-list-card">
            <h2>Fiyat ve Süre Güncelle</h2>
            <div className="admin-service-list">
              {isDashboardLoading
                ? serviceSkeletonRows.map((row) => (
                    <article className="admin-service-row admin-service-row-skeleton" key={row}>
                      <i className="admin-skeleton admin-skeleton-name" />
                      <i className="admin-skeleton admin-skeleton-field" />
                      <i className="admin-skeleton admin-skeleton-field" />
                      <i className="admin-skeleton admin-skeleton-action" />
                    </article>
                  ))
                : dashboard.services.map((service) => (
                    <article className="admin-service-row" key={service.id}>
                      <strong>
                        <FaUserTie aria-hidden="true" />
                        {service.name}
                      </strong>
                      <label>
                        <span>Fiyat</span>
                        <input
                          value={service.price}
                          onChange={(event) => setServiceValue(service.id, 'price', event.target.value)}
                          aria-label={`${service.name} fiyat`}
                        />
                      </label>
                      <label>
                        <span>Süre</span>
                        <input
                          value={service.time}
                          onChange={(event) => setServiceValue(service.id, 'time', event.target.value)}
                          aria-label={`${service.name} süre`}
                        />
                      </label>
                      <button type="button" onClick={() => updateService(service)}>
                        <FaFloppyDisk aria-hidden="true" />
                        Kaydet
                      </button>
                    </article>
                  ))}
            </div>
          </section>
        )}

        {currentPath === '/admin/islem-ekle' && (
          <form className="admin-content-card admin-form-card" onSubmit={createNewService}>
            <h2>Yeni İşlem Ekle</h2>
            <div className="admin-form-fields admin-form-grid-4">
              <label>
                <span>İşlem Adı</span>
                <input
                  value={newService.name}
                  onChange={(event) => setNewServiceValue('name', event.target.value)}
                  placeholder="Örn. Keratin bakım"
                  required
                />
              </label>
              <label>
                <span>Fiyat</span>
                <input
                  value={newService.price}
                  onChange={(event) => setNewServiceValue('price', event.target.value)}
                  placeholder="Örn. 750 TL"
                  required
                />
              </label>
              <label>
                <span>Süre</span>
                <input
                  value={newService.time}
                  onChange={(event) => setNewServiceValue('time', event.target.value)}
                  placeholder="Örn. 60 dk"
                  required
                />
              </label>
              <label>
                <span>Açıklama</span>
                <input
                  value={newService.detail}
                  onChange={(event) => setNewServiceValue('detail', event.target.value)}
                  placeholder="Opsiyonel"
                />
              </label>
              <button type="submit" className="admin-submit-btn">
                <FaPlus aria-hidden="true" />
                İşlem Ekle
              </button>
            </div>
          </form>
        )}

        {currentPath === '/admin/islem-sil' && (
          <section className="admin-content-card admin-price-list-card">
            <h2>İşlem Sil</h2>
            <div className="admin-service-list">
              {isDashboardLoading
                ? serviceSkeletonRows.map((row) => (
                    <article className="admin-service-row admin-service-row-skeleton" key={row}>
                      <i className="admin-skeleton admin-skeleton-name" />
                      <i className="admin-skeleton admin-skeleton-field" />
                      <i className="admin-skeleton admin-skeleton-action" />
                    </article>
                  ))
                : dashboard.services.map((service) => (
                    <article className="admin-service-row admin-service-delete-row" key={service.id}>
                      <strong>
                        <FaUserTie aria-hidden="true" />
                        {service.name}
                      </strong>
                      <span className="admin-service-meta">{service.price}</span>
                      <span className="admin-service-meta">{service.time}</span>
                      <button className="admin-danger-button" type="button" onClick={() => deleteSelectedService(service)}>
                        <FaTrashCan aria-hidden="true" />
                        Sil
                      </button>
                    </article>
                  ))}
            </div>
          </section>
        )}


      </section>

      {confirmModal && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!isConfirmLoading) setConfirmModal(null)
          }}
        >
          <div
            className="admin-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`admin-modal-icon-badge ${
                confirmModal.confirmVariant === 'primary' ? 'is-primary' : 'is-danger'
              }`}
            >
              {confirmModal.confirmVariant === 'primary' ? (
                <FaCircleCheck aria-hidden="true" />
              ) : (
                <FaTrashCan aria-hidden="true" />
              )}
            </div>

            <h3 className="admin-modal-title">{confirmModal.title}</h3>
            <p className="admin-modal-subtitle">{confirmModal.subtitle}</p>

            {confirmModal.itemName && (
              <div className="admin-modal-item-card">
                <span className="admin-modal-item-name">{confirmModal.itemName}</span>
                {confirmModal.itemTags && confirmModal.itemTags.length > 0 && (
                  <div className="admin-modal-item-tags">
                    {confirmModal.itemTags.map((tag, idx) => (
                      <span key={idx} className="admin-modal-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {confirmModal.warning && (
              <p className="admin-modal-warning">
                <FaCircleExclamation aria-hidden="true" />
                <span>{confirmModal.warning}</span>
              </p>
            )}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-modal-btn-cancel"
                disabled={isConfirmLoading}
                onClick={() => setConfirmModal(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className={`admin-modal-btn-confirm ${
                  confirmModal.confirmVariant === 'primary' ? 'is-primary' : 'is-danger'
                }`}
                disabled={isConfirmLoading}
                onClick={confirmModal.onConfirm}
              >
                {isConfirmLoading ? (
                  <>
                    <FaRotateRight className="admin-spin" aria-hidden="true" />
                    Siliniyor...
                  </>
                ) : (
                  confirmModal.confirmText || 'Sil'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && <AdminNotice {...notification} onClose={() => { setToast(null); setStatus('') }} />}
    </main>
  )
}

export default Admin
