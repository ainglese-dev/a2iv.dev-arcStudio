import { useEffect } from 'react'
import { DirectorLayout } from './components/director/DirectorLayout'

export function App() {
  // Theme persistence initialization
  useEffect(() => {
    try {
      const theme = (localStorage.getItem('yt_theme') as 'dark' | 'light') || 'dark'
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
    } catch {}
  }, [])

  return <DirectorLayout />
}

export default App
