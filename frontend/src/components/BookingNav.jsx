function BookingNav({ current }) {
  return (
    <nav className="booking-page-nav" aria-label="Randevu sayfaları">
      <a href="/" className="booking-home-link">← Ana sayfa</a>
      <div>
        <a href="/randevu" aria-current={current === 'book' ? 'page' : undefined}>Randevu Al</a>
        <a href="/randevu-sorgula" aria-current={current === 'lookup' ? 'page' : undefined}>Randevumu Bul</a>
      </div>
    </nav>
  )
}

export default BookingNav
