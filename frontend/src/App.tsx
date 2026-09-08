import { useEffect, useState } from 'react'
import { DirectorLayout } from './components/director/DirectorLayout'
import { WorkspaceLayout } from './components/layout/WorkspaceLayout'

export function App() {
  const [viewMode, setViewMode] = useState<'director' | 'studio'>(() => {
    try {
      const saved = localStorage.getItem('yt_app_view_mode')
      if (saved === 'studio' || saved === 'director') return saved
    } catch {}
    return 'director'
  })

  // Theme persistence initialization
  useEffect(() => {
    try {
      const theme = (localStorage.getItem('yt_theme') as 'dark' | 'light') || 'dark'
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(theme)
    } catch {}
  }, [])

  const handleSwitchToStudio = () => {
    setViewMode('studio')
    try {
      localStorage.setItem('yt_app_view_mode', 'studio')
    } catch {}
  }

  const handleSwitchToDirector = () => {
    setViewMode('director')
    try {
      localStorage.setItem('yt_app_view_mode', 'director')
    } catch {}
  }

  if (viewMode === 'studio') {
    return (
      <div className="relative min-h-screen">
        <WorkspaceLayout />
        {/* Floating shortcut button to return to Director's Cut */}
        <button
          type="button"
          onClick={handleSwitchToDirector}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-sans font-semibold text-xs shadow-2xl transition-all cursor-pointer border border-indigo-400/40"
          title="Return to Director's Cut"
        >
          <span>🎬 Return to Director's Cut</span>
        </button>
      </div>
    )
  }

  return <DirectorLayout onSwitchToStudio={handleSwitchToStudio} />
}

export default App
