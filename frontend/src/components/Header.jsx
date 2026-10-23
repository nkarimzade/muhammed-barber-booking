import { useEffect, useState } from 'react'
import { HiOutlineMenuAlt4 } from 'react-icons/hi'
import { IoCloseOutline } from 'react-icons/io5'
import { FiMoon, FiSun } from 'react-icons/fi'

function Header({ theme, onToggleTheme }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuLinks = [
    { label: 'Hakkimizda', href: '/#next-section' },
    { label: 'Hizmetler', href: '/#randevu-al' },
    { label: 'Galeri', href: '/#galeri' },
    { label: 'İletişim', href: '/#iletisim' },
  ]

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const scrollY = window.scrollY
    const { body } = document
    const previousStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = previousStyles.position
      body.style.top = previousStyles.top
      body.style.left = previousStyles.left
      body.style.right = previousStyles.right
      body.style.width = previousStyles.width
      body.style.overflow = previousStyles.overflow
      window.scrollTo(0, scrollY)
    }
  }, [isMenuOpen])

  return (
    <header className="site-header">
      <a className="site-logo" href="/" aria-label="Ana sayfa">
        <img src="/logo.png" alt="Logo" />
      </a>

      <div className="header-actions">
        <button
          className="theme-toggle"
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
        >
          {theme === 'dark' ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}
        </button>
      <button
        className="menu-button"
        type="button"
        aria-label={isMenuOpen ? 'Menuyu kapat' : 'Menuyu ac'}
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        {isMenuOpen ? <IoCloseOutline /> : <HiOutlineMenuAlt4 />}
      </button>
      </div>

      <nav className={`header-menu ${isMenuOpen ? 'is-open' : ''}`} aria-hidden={!isMenuOpen}>
        <div className="header-menu-content">
          <a className="menu-logo" href="/" aria-label="Ana sayfa">
            <img src="/logo.png" alt="Logo" />
          </a>

          <div className="header-menu-links">
            {menuLinks.map((link) => (
              <a key={link.label} href={link.href} onClick={() => setIsMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="menu-footer">
            <div className="menu-footer-links">
              <a href="/">Ana Sayfa</a>
              <span>-</span>
              <a href="/randevu">Randevu Al</a>
              <span>-</span>
              <a href="/randevu-sorgula">Randevu Sorgula</a>
            </div>
            <div className="menu-contact">
              <span>+90 536 415 97 42</span>
              <span>-</span>
              <span>@zmamix1</span>
            </div>
          </div>

          <a className="appointment-link" href="/randevu">
            Randevu Al
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </nav>
    </header>
  )
}

export default Header
