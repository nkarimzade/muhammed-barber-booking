import { useEffect, useState } from 'react'

const storageKey = 'barber-theme'
const isTheme = (value) => value === 'light' || value === 'dark'

function readPreference() {
  try {
    return localStorage.getItem(storageKey)
  } catch {
    return null
  }
}

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = readPreference()
    return isTheme(saved) ? saved : systemTheme()
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    const themeColor = document.querySelector('meta[name="theme-color"]')
    if (themeColor) themeColor.content = theme === 'dark' ? '#000000' : '#faf9f6'
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      if (!isTheme(readPreference())) setTheme(systemTheme())
    }
    const onStorageChange = (event) => {
      if (event.key === storageKey || event.key === null) {
        const saved = readPreference()
        setTheme(isTheme(saved) ? saved : systemTheme())
      }
    }
    media.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorageChange)
    return () => {
      media.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorageChange)
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // The theme still works when browser storage is unavailable.
    }
    setTheme(next)
  }

  return { theme, toggleTheme }
}
