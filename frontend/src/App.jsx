
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import './theme.css'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import useTheme from './useTheme'
import Seo from './components/Seo'
import Home from './Pages/Home'
import Randevu from './Pages/Randevu'
import RandevuSorgula from './Pages/RandevuSorgula'
import Kvkk from './Pages/Kvkk'
import Admin from './Pages/Admin'
import NotFound from './Pages/NotFound'

const loaderWords = ['Muhammed', 'Barber']
const loaderText = loaderWords.join(' ')

function PageLoader({ onComplete }) {
  const words = useMemo(() => loaderWords.map((word) => word.split('')), [])

  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3300)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="page-loader" aria-label="Sayfa yukleniyor">
      <div className="loader-progress" aria-hidden="true" />
      <div className="loader-inner">
        <div className="loader-logo-frame">
          <img className="loader-logo" src="/logo.png" alt="Muhammed Barber logo" />
        </div>
        <strong className="loader-brand" aria-label={loaderText}>
          {words.map((letters, wordIndex) => {
            const previousLetterCount = words.slice(0, wordIndex).reduce((total, word) => total + word.length, 0)

            return (
              <span className="loader-brand-word" key={loaderWords[wordIndex]}>
                {letters.map((letter, letterIndex) => (
                  <span
                    className="loader-letter"
                    key={`${letter}-${letterIndex}`}
                    style={{ animationDelay: `${0.5 + (previousLetterCount + letterIndex) * 0.065}s` }}
                    aria-hidden="true"
                  >
                    {letter}
                  </span>
                ))}
              </span>
            )
          })}
        </strong>
      </div>
    </div>
  )
}

function App() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith('/admin')
  const [hasLoaderCompleted, setHasLoaderCompleted] = useState(() => {
    if (isAdminPage) return true
    return sessionStorage.getItem('brandLoaderShown') === 'true'
  })
  const shouldShowLoader = !isAdminPage && !hasLoaderCompleted
  const completeLoader = () => {
    sessionStorage.setItem('brandLoaderShown', 'true')
    setHasLoaderCompleted(true)
  }

  return (
    <>
      <Seo pathname={location.pathname} />
      {shouldShowLoader && <PageLoader onComplete={completeLoader} />}
      {!isAdminPage && <Header theme={theme} onToggleTheme={toggleTheme} />}
      <Routes>
        <Route path="/" element={<Home theme={theme} />} />
        <Route path="/randevu" element={<Randevu />} />
        <Route path="/randevu-sorgula" element={<RandevuSorgula />} />
        <Route path="/kvkk" element={<Kvkk />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/gun-kapat" element={<Admin />} />
        <Route path="/admin/saat-kapat" element={<Admin />} />
        <Route path="/admin/numara-engelle" element={<Admin />} />
        <Route path="/admin/fiyatlar" element={<Admin />} />
        <Route path="/admin/islem-ekle" element={<Admin />} />
        <Route path="/admin/islem-sil" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
