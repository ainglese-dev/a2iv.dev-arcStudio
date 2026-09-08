import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Play,
  Pause,
  RotateCcw,
  FlipHorizontal,
  X,
  Type,
  Gauge,
  Clock,
  Eye,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  TextAlignStart as AlignLeft,
  TextAlignCenter as AlignCenter,
  TextAlignJustify as AlignJustify,
} from 'lucide-react'
import type { VideoScript } from '../../types'

export type ContrastThemeId = 'yellow' | 'oled' | 'cyan' | 'zinc' | 'paper'

export interface TeleprompterA11yPrefs {
  textAlign: 'left' | 'center' | 'justify'
  lineHeight: number // 1.5, 1.8, 2.2, 2.6
  letterSpacing: number // 0, 0.04, 0.08, 0.14
  contrastTheme: ContrastThemeId
  columnWidth: 'compact' | 'medium' | 'wide'
}

export const DEFAULT_A11Y_PREFS: TeleprompterA11yPrefs = {
  textAlign: 'justify',
  lineHeight: 2.2,
  letterSpacing: 0.06,
  contrastTheme: 'yellow',
  columnWidth: 'medium',
}

export interface ThemeConfig {
  id: ContrastThemeId
  name: string
  desc: string
  bgColor: string
  textColor: string
  eyeLineColor: string
  headerBg: string
  headerBorder: string
  dockBg: string
  dockBorder: string
  sectionHeaderColor: string
  cueBg: string
  cueBorder: string
  cueTitleColor: string
  cueTextColor: string
  isLight?: boolean
}

export const CONTRAST_THEMES: Record<ContrastThemeId, ThemeConfig> = {
  yellow: {
    id: 'yellow',
    name: 'Optometric Yellow',
    desc: 'High-contrast broadcast standard for low vision',
    bgColor: '#000000',
    textColor: '#fde047',
    eyeLineColor: '#eab308',
    headerBg: '#09090b',
    headerBorder: '#27272a',
    dockBg: '#09090b',
    dockBorder: '#27272a',
    sectionHeaderColor: '#eab308',
    cueBg: '#1c1917',
    cueBorder: '#ca8a04',
    cueTitleColor: '#facc15',
    cueTextColor: '#fef08a',
  },
  oled: {
    id: 'oled',
    name: 'OLED White',
    desc: 'Pure pitch black with high-luminance white',
    bgColor: '#000000',
    textColor: '#ffffff',
    eyeLineColor: '#ffffff',
    headerBg: '#09090b',
    headerBorder: '#27272a',
    dockBg: '#09090b',
    dockBorder: '#27272a',
    sectionHeaderColor: '#a1a1aa',
    cueBg: '#18181b',
    cueBorder: '#52525b',
    cueTitleColor: '#ffffff',
    cueTextColor: '#e4e4e7',
  },
  cyan: {
    id: 'cyan',
    name: 'Teleprompter Cyan',
    desc: 'Cool high-visibility cyan for dark stages',
    bgColor: '#000000',
    textColor: '#38bdf8',
    eyeLineColor: '#38bdf8',
    headerBg: '#08101a',
    headerBorder: '#0c4a6e',
    dockBg: '#08101a',
    dockBorder: '#0c4a6e',
    sectionHeaderColor: '#0284c7',
    cueBg: '#082f49',
    cueBorder: '#38bdf8',
    cueTitleColor: '#7dd3fc',
    cueTextColor: '#bae6fd',
  },
  zinc: {
    id: 'zinc',
    name: 'Studio Zinc',
    desc: 'Deep zinc background with neutral soft white',
    bgColor: '#06070a',
    textColor: '#f4f4f5',
    eyeLineColor: '#6366f1',
    headerBg: '#090b10',
    headerBorder: '#18181b',
    dockBg: '#0a0c12',
    dockBorder: '#18181b',
    sectionHeaderColor: '#818cf8',
    cueBg: '#0c1524',
    cueBorder: '#38bdf8',
    cueTitleColor: '#38bdf8',
    cueTextColor: '#7dd3fc',
  },
  paper: {
    id: 'paper',
    name: 'High-Contrast Paper',
    desc: 'Daylight black on clean crisp white background',
    bgColor: '#f8fafc',
    textColor: '#09090b',
    eyeLineColor: '#2563eb',
    headerBg: '#f1f5f9',
    headerBorder: '#cbd5e1',
    dockBg: '#f1f5f9',
    dockBorder: '#cbd5e1',
    sectionHeaderColor: '#2563eb',
    cueBg: '#eff6ff',
    cueBorder: '#93c5fd',
    cueTitleColor: '#1d4ed8',
    cueTextColor: '#1e40af',
    isLight: true,
  },
}

const STORAGE_KEY = 'yt_prompter_a11y_prefs'

function loadA11yPrefs(): TeleprompterA11yPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const isLightMode = typeof document !== 'undefined' && document.documentElement.classList.contains('light')
    if (!raw) {
      return {
        ...DEFAULT_A11Y_PREFS,
        contrastTheme: isLightMode ? 'paper' : 'yellow',
      }
    }
    const parsed = JSON.parse(raw)
    return {
      textAlign: ['left', 'center', 'justify'].includes(parsed.textAlign)
        ? parsed.textAlign
        : DEFAULT_A11Y_PREFS.textAlign,
      lineHeight: typeof parsed.lineHeight === 'number' ? parsed.lineHeight : DEFAULT_A11Y_PREFS.lineHeight,
      letterSpacing:
        typeof parsed.letterSpacing === 'number' ? parsed.letterSpacing : DEFAULT_A11Y_PREFS.letterSpacing,
      contrastTheme: ['yellow', 'oled', 'cyan', 'zinc', 'paper'].includes(parsed.contrastTheme)
        ? parsed.contrastTheme
        : isLightMode
        ? 'paper'
        : DEFAULT_A11Y_PREFS.contrastTheme,
      columnWidth: ['compact', 'medium', 'wide'].includes(parsed.columnWidth)
        ? parsed.columnWidth
        : DEFAULT_A11Y_PREFS.columnWidth,
    }
  } catch {
    const isLightMode = typeof document !== 'undefined' && document.documentElement.classList.contains('light')
    return {
      ...DEFAULT_A11Y_PREFS,
      contrastTheme: isLightMode ? 'paper' : 'yellow',
    }
  }
}

const COLUMN_WIDTH_CLASSES: Record<TeleprompterA11yPrefs['columnWidth'], string> = {
  compact: 'max-w-2xl',
  medium: 'max-w-4xl',
  wide: 'max-w-6xl',
}

interface TeleprompterModalProps {
  script: VideoScript
  isOpen: boolean
  onClose: () => void
  initialWpm?: number
}

export const TeleprompterModal: React.FC<TeleprompterModalProps> = ({
  script,
  isOpen,
  onClose,
  initialWpm = 145,
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(initialWpm)
  const [fontSize, setFontSize] = useState(40) // px (expanded 24px - 84px, default 40px)
  const [isMirrored, setIsMirrored] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isReadabilityOpen, setIsReadabilityOpen] = useState(false)
  const [a11y, setA11y] = useState<TeleprompterA11yPrefs>(loadA11yPrefs)

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const animFrameIdRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const scrollPosRef = useRef<number>(0)

  const activeTheme = CONTRAST_THEMES[a11y.contrastTheme] || CONTRAST_THEMES.yellow

  // Save a11y preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(a11y))
    } catch (err) {
      console.error('Failed to persist teleprompter a11y preferences', err)
    }
  }, [a11y])

  // Calculate total spoken words and estimated total duration
  const totalWords = script.total_word_count || 800
  const totalEstimatedSeconds = Math.round((totalWords / wpm) * 60)

  // Sync accumulator ref whenever playing starts or container is mounted
  useEffect(() => {
    if (isPlaying && scrollContainerRef.current) {
      scrollPosRef.current = scrollContainerRef.current.scrollTop
    }
  }, [isPlaying])

  // Timer interval for elapsed time
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    if (isOpen && isPlaying) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isOpen, isPlaying])

  // requestAnimationFrame smooth scrolling engine
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
      lastTimeRef.current = null
      return
    }

    const container = scrollContainerRef.current
    if (!container) return

    // Ensure accumulator starts from current scroll position
    scrollPosRef.current = container.scrollTop

    const scrollStep = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime
      }
      const deltaTime = (currentTime - lastTimeRef.current) / 1000 // in seconds
      lastTimeRef.current = currentTime

      // Total scrollable height
      const maxScroll = container.scrollHeight - container.clientHeight
      if (maxScroll > 0) {
        // Speed: pixels per second = maxScroll / totalEstimatedSeconds
        const pxPerSecond = maxScroll / Math.max(30, totalEstimatedSeconds)
        scrollPosRef.current += pxPerSecond * deltaTime
        container.scrollTop = scrollPosRef.current

        // Pause automatically if reached bottom
        if (container.scrollTop >= maxScroll - 2) {
          setIsPlaying(false)
          return
        }
      }

      animFrameIdRef.current = requestAnimationFrame(scrollStep)
    }

    animFrameIdRef.current = requestAnimationFrame(scrollStep)

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current)
      }
    }
  }, [isOpen, isPlaying, totalEstimatedSeconds])

  const handleReset = () => {
    setIsPlaying(false)
    setElapsedSeconds(0)
    scrollPosRef.current = 0
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }

  // Handle clicking outside the readability drawer to dismiss it
  useEffect(() => {
    if (!isReadabilityOpen) return

    const handlePointerDown = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement
        if (target.closest('[data-readability-toggle]')) return
        setIsReadabilityOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isReadabilityOpen])

  // Keyboard shortcuts (Space = Play/Pause, R = Restart, Up/Down = WPM, Esc = Close Drawer or Exit)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      } else if (e.code === 'KeyR') {
        e.preventDefault()
        handleReset()
      } else if (e.code === 'ArrowUp') {
        e.preventDefault()
        setWpm((prev) => Math.min(220, prev + 5))
      } else if (e.code === 'ArrowDown') {
        e.preventDefault()
        setWpm((prev) => Math.max(90, prev - 5))
      } else if (e.code === 'Escape') {
        e.preventDefault()
        if (isReadabilityOpen) {
          setIsReadabilityOpen(false)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isReadabilityOpen])

  // Lock background body scroll when teleprompter is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = Math.floor(secs % 60)
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`
  }

  return createPortal(
    <div
      className={`teleprompter-modal fixed inset-0 z-[100] flex flex-col select-none overflow-hidden animate-in fade-in duration-200 transition-colors ${
        activeTheme.isLight ? 'is-light-theme' : 'is-dark-theme'
      }`}
      style={{ backgroundColor: activeTheme.bgColor, color: activeTheme.textColor }}
    >
      {/* Top Teleprompter Header / HUD */}
      <div
        className="h-12 border-b px-6 flex items-center justify-between z-30 shrink-0 transition-colors"
        style={{
          backgroundColor: activeTheme.headerBg,
          borderColor: activeTheme.headerBorder,
          color: activeTheme.isLight ? '#0f172a' : '#f4f4f5',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${
              activeTheme.isLight
                ? 'text-blue-700 bg-blue-100 border-blue-300'
                : 'text-indigo-400 bg-indigo-950/80 border-indigo-800/60'
            }`}
          >
            PROMPTER MODE
          </span>
          <span
            className="text-xs font-medium truncate max-w-md"
            style={{ color: activeTheme.isLight ? '#1e293b' : '#d4d4d8' }}
          >
            {script.title}
          </span>
        </div>

        {/* HUD Controls: Status Pill + Play/Pause Button + Live Timer + Fullscreen/Exit */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {/* Live Scrolling Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border border-transparent">
            {isPlaying ? (
              <span
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                  activeTheme.isLight
                    ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                    : 'text-emerald-300 bg-emerald-950/80 border-emerald-700/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                SCROLLING
              </span>
            ) : (
              <span
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                  activeTheme.isLight
                    ? 'text-amber-800 bg-amber-100 border-amber-300'
                    : 'text-amber-300 bg-amber-950/80 border-amber-700/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                PAUSED
              </span>
            )}
          </div>

          {/* Prominent Primary Play / Pause Button in Top Header */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
            title="Toggle Play/Pause (Space)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE (Space)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY (Space)</span>
              </>
            )}
          </button>

          {/* Live Timer HUD */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border"
            style={{
              backgroundColor: activeTheme.isLight ? '#ffffff' : '#18181b',
              borderColor: activeTheme.headerBorder,
              color: activeTheme.isLight ? '#0f172a' : '#f4f4f5',
            }}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-500 font-bold">{formatTime(elapsedSeconds)}</span>
            <span className="opacity-40">/</span>
            <span className="opacity-70">{formatTime(totalEstimatedSeconds)}</span>
          </div>

          {/* Restart Script & Timer Button */}
          <button
            type="button"
            onClick={handleReset}
            className={`teleprompter-hud-btn flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono transition-colors border shadow-sm cursor-pointer ${
              activeTheme.isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 hover:text-white border-zinc-700'
            }`}
            style={{
              color: activeTheme.isLight ? '#0f172a' : '#ffffff',
              backgroundColor: activeTheme.isLight ? '#ffffff' : '#27272a',
              borderColor: activeTheme.isLight ? '#cbd5e1' : '#3f3f46',
            }}
            title="Restart Script & Timer to Start (R)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span style={{ color: activeTheme.isLight ? '#0f172a' : '#ffffff' }}>Restart (R)</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`teleprompter-hud-btn p-1.5 rounded transition-colors cursor-pointer ${
              activeTheme.isLight
                ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                : 'hover:bg-zinc-800 text-zinc-200 hover:text-white'
            }`}
            style={{
              color: activeTheme.isLight ? '#0f172a' : '#ffffff',
            }}
            title="Toggle Browser Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" style={{ color: activeTheme.isLight ? '#0f172a' : '#ffffff' }} />
            ) : (
              <Maximize2 className="w-4 h-4" style={{ color: activeTheme.isLight ? '#0f172a' : '#ffffff' }} />
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`teleprompter-exit-btn flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors border shadow-sm cursor-pointer ${
              activeTheme.isLight
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
            }`}
            style={{
              color: activeTheme.isLight ? '#0f172a' : '#ffffff',
              backgroundColor: activeTheme.isLight ? '#ffffff' : '#27272a',
              borderColor: activeTheme.isLight ? '#cbd5e1' : '#3f3f46',
            }}
            title="Exit Teleprompter (Esc)"
          >
            <X className="w-3.5 h-3.5 shrink-0" style={{ color: activeTheme.isLight ? '#0f172a' : '#ffffff' }} />
            <span style={{ color: activeTheme.isLight ? '#0f172a' : '#ffffff' }}>Exit (Esc)</span>
          </button>
        </div>
      </div>

      {/* Center Fixed Eye-Level Focus Anchor Line */}
      <div
        className="pointer-events-none fixed left-0 right-0 top-[38%] h-[2px] z-20 flex items-center justify-between px-4 transition-all"
        style={{
          transform: 'translateY(-50%)',
          background: `linear-gradient(to right, transparent, ${activeTheme.eyeLineColor}dd, transparent)`,
          boxShadow: `0 0 16px ${activeTheme.eyeLineColor}99`,
        }}
      >
        <div
          className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border shadow-md"
          style={{
            backgroundColor: activeTheme.isLight ? '#ffffff' : '#090b10',
            borderColor: `${activeTheme.eyeLineColor}80`,
            color: activeTheme.eyeLineColor,
          }}
        >
          <Eye className="w-3 h-3" style={{ color: activeTheme.eyeLineColor }} />
          <span>CAMERA LENS EYE-LEVEL</span>
        </div>
        <div
          className="text-[10px] font-mono px-2 py-0.5 rounded border shadow-md"
          style={{
            backgroundColor: activeTheme.isLight ? '#ffffff' : '#090b10',
            borderColor: `${activeTheme.eyeLineColor}80`,
            color: activeTheme.eyeLineColor,
          }}
        >
          <span>READ HERE</span>
        </div>
      </div>

      {/* Main Scrolling Text Area */}
      <div
        ref={scrollContainerRef}
        onScroll={() => {
          if (scrollContainerRef.current) {
            scrollPosRef.current = scrollContainerRef.current.scrollTop
          }
        }}
        onClick={(e) => {
          if (isReadabilityOpen) {
            setIsReadabilityOpen(false)
            return
          }
          const target = e.target as HTMLElement
          if (target.closest('button') || target.closest('input')) return
          setIsPlaying((prev) => !prev)
        }}
        className={`flex-1 overflow-y-auto px-6 sm:px-16 md:px-28 lg:px-44 pt-[35vh] pb-[60vh] cursor-pointer ${
          isMirrored ? 'scale-x-[-1]' : ''
        }`}
        style={{ backgroundColor: activeTheme.bgColor }}
      >
        <div className={`space-y-12 mx-auto ${COLUMN_WIDTH_CLASSES[a11y.columnWidth]}`}>
          {script.sections.map((sec, idx) => (
            <div key={idx} className="space-y-4">
              {/* Section Header Marker */}
              <div
                className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest pb-1 border-b"
                style={{
                  borderColor: activeTheme.headerBorder,
                  color: activeTheme.sectionHeaderColor,
                }}
              >
                <span className="font-bold">0{idx + 1}.</span>
                <span>{sec.title}</span>
                <span className="opacity-70">({sec.target_duration_seconds}s)</span>
              </div>

              {/* Visual Cue Alert Box (Highlighted, do NOT read aloud) */}
              {sec.visual_cue && (
                <div
                  className="p-3.5 rounded-lg border font-mono text-sm leading-relaxed shadow-lg"
                  style={{
                    backgroundColor: activeTheme.cueBg,
                    borderColor: activeTheme.cueBorder,
                    color: activeTheme.cueTextColor,
                  }}
                >
                  <span
                    className="font-bold block mb-1 text-xs uppercase tracking-wider"
                    style={{ color: activeTheme.cueTitleColor }}
                  >
                    ⚡ VISUAL ACTION CUE (DO NOT SPEAK):
                  </span>
                  <span>{sec.visual_cue}</span>
                </div>
              )}

              {/* Spoken Text (High contrast, scalable font, dynamic a11y styling) */}
              <p
                className={`font-sans font-medium break-words hyphens-auto ${
                  a11y.textAlign === 'justify' ? '[text-justify:inter-word]' : ''
                }`}
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: a11y.lineHeight,
                  letterSpacing: `${a11y.letterSpacing}em`,
                  textAlign: a11y.textAlign,
                  color: activeTheme.textColor,
                }}
              >
                {sec.spoken_text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Paused Guidance Pill */}
      {!isPlaying && (
        <div
          className={`pointer-events-none fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono backdrop-blur-md shadow-2xl ${
            activeTheme.isLight
              ? 'bg-white/90 border-slate-300 text-slate-800'
              : 'bg-black/85 border-zinc-700 text-zinc-200'
          }`}
        >
          <Play className="w-3.5 h-3.5 text-emerald-500 fill-current animate-pulse" />
          <span>Tap Spacebar or Click Screen to Play</span>
        </div>
      )}

      {/* Bottom Floating Control Bar */}
      <div
        className="relative border-t backdrop-blur-md px-6 py-3 flex items-center justify-between gap-4 z-30 shrink-0 transition-colors"
        style={{
          backgroundColor: activeTheme.dockBg,
          borderColor: activeTheme.dockBorder,
        }}
      >
        {/* Readability & Accessibility Popover Drawer */}
        {isReadabilityOpen && (
          <div
            ref={drawerRef}
            className="absolute bottom-full mb-3 right-6 w-96 max-w-[calc(100vw-3rem)] max-h-[75vh] overflow-y-auto rounded-2xl p-5 border border-zinc-700/80 bg-[#0c0e14]/95 backdrop-blur-xl shadow-2xl text-zinc-100 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Title Bar */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
                  Readability & Accessibility
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsReadabilityOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Themes (Swatches for all 5) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="uppercase tracking-wider font-semibold">Contrast Theme</span>
                <span className="text-zinc-400 font-medium">{activeTheme.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.values(CONTRAST_THEMES).map((t) => {
                  const isSelected = a11y.contrastTheme === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setA11y((prev) => ({ ...prev, contrastTheme: t.id }))}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500 shadow-sm'
                          : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div
                        className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 shadow-inner"
                        style={{ backgroundColor: t.bgColor, borderColor: t.eyeLineColor }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.textColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-medium truncate ${
                            isSelected ? 'text-white font-bold' : 'text-zinc-300'
                          }`}
                        >
                          {t.name}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Text Alignment (Left / Center / Justify) */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold block">
                Text Alignment
              </span>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setA11y((prev) => ({ ...prev, textAlign: 'left' }))}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    a11y.textAlign === 'left'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span>Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setA11y((prev) => ({ ...prev, textAlign: 'center' }))}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    a11y.textAlign === 'center'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={() => setA11y((prev) => ({ ...prev, textAlign: 'justify' }))}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    a11y.textAlign === 'justify'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                  <span>Justify</span>
                </button>
              </div>
            </div>

            {/* 3. Line Spacing (1.5x / 1.8x / 2.2x / 2.6x) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="uppercase tracking-wider font-semibold">Line Spacing</span>
                <span className="text-zinc-400">{a11y.lineHeight}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
                {[1.5, 1.8, 2.2, 2.6].map((lh) => (
                  <button
                    key={lh}
                    type="button"
                    onClick={() => setA11y((prev) => ({ ...prev, lineHeight: lh }))}
                    className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      a11y.lineHeight === lh
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    {lh}x
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Character Spacing (Normal / Wide / Wider / Ultra) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="uppercase tracking-wider font-semibold">Character Spacing</span>
                <span className="text-zinc-400">+{a11y.letterSpacing}em</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
                {[
                  { label: 'Normal', value: 0 },
                  { label: 'Wide', value: 0.04 },
                  { label: 'Wider', value: 0.08 },
                  { label: 'Ultra', value: 0.14 },
                ].map((cs) => {
                  const active =
                    a11y.letterSpacing === cs.value ||
                    (cs.value === 0.04 && a11y.letterSpacing === 0.06)
                  return (
                    <button
                      key={cs.label}
                      type="button"
                      onClick={() => setA11y((prev) => ({ ...prev, letterSpacing: cs.value }))}
                      className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                    >
                      {cs.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5. Column Width (Compact / Medium / Wide) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="uppercase tracking-wider font-semibold">Column Width</span>
                <span className="text-zinc-400 capitalize">{a11y.columnWidth}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800">
                {[
                  { id: 'compact', label: 'Compact' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'wide', label: 'Wide' },
                ].map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() =>
                      setA11y((prev) => ({
                        ...prev,
                        columnWidth: col.id as TeleprompterA11yPrefs['columnWidth'],
                      }))
                    }
                    className={`py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      a11y.columnWidth === col.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
            }`}
            title="Toggle Play/Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isPlaying ? 'Pause (Space)' : 'Play (Space)'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className={`teleprompter-hud-btn flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl transition-colors font-medium text-xs font-mono border cursor-pointer ${
              activeTheme.isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-100 hover:text-white border-zinc-800'
            }`}
            style={{
              color: activeTheme.isLight ? '#0f172a' : '#ffffff',
              backgroundColor: activeTheme.isLight ? '#ffffff' : '#18181b',
              borderColor: activeTheme.isLight ? '#cbd5e1' : '#27272a',
            }}
            title="Restart Script & Timer to Start (R)"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span style={{ color: activeTheme.isLight ? '#0f172a' : '#ffffff' }}>Restart (R)</span>
          </button>
        </div>

        {/* Sliders & Controls: Speed, Font, Readability Drawer, Mirror */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono">
          {/* WPM Speed Slider */}
          <div
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${
              activeTheme.isLight
                ? 'bg-white border-slate-300 text-slate-700'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
            }`}
          >
            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
            <span>Speed:</span>
            <span
              className={`font-bold w-12 text-center ${
                activeTheme.isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {wpm} WPM
            </span>
            <input
              type="range"
              min={90}
              max={220}
              step={5}
              value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="w-20 sm:w-24 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Font Size Slider (24px to 84px, default 40px) */}
          <div
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${
              activeTheme.isLight
                ? 'bg-white border-slate-300 text-slate-700'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            <span>Font:</span>
            <span
              className={`font-bold w-10 text-center ${
                activeTheme.isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {fontSize}px
            </span>
            <input
              type="range"
              min={24}
              max={84}
              step={2}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-20 sm:w-24 accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Readability Popover Drawer Toggle Button */}
          <button
            type="button"
            data-readability-toggle
            onClick={() => setIsReadabilityOpen((prev) => !prev)}
            className={`teleprompter-hud-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isReadabilityOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : activeTheme.isLight
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                : 'bg-zinc-900 text-zinc-100 border-zinc-800 hover:text-white hover:bg-zinc-800'
            }`}
            style={
              !isReadabilityOpen
                ? {
                    color: activeTheme.isLight ? '#0f172a' : '#ffffff',
                    backgroundColor: activeTheme.isLight ? '#ffffff' : '#18181b',
                    borderColor: activeTheme.isLight ? '#cbd5e1' : '#27272a',
                  }
                : undefined
            }
            title="Readability & Visual Accessibility Settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Readability</span>
          </button>

          {/* Mirror / Beam-Splitter Flip Toggle */}
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            className={`teleprompter-hud-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              isMirrored
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : activeTheme.isLight
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:text-white'
            }`}
            style={
              !isMirrored
                ? {
                    color: activeTheme.isLight ? '#0f172a' : '#ffffff',
                    backgroundColor: activeTheme.isLight ? '#ffffff' : '#18181b',
                    borderColor: activeTheme.isLight ? '#cbd5e1' : '#27272a',
                  }
                : undefined
            }
            title="Horizontal Flip for Glass Beam-Splitter Prompters"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Mirror</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
