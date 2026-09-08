import React, { useEffect, useRef, useState } from 'react'
import {
  BrainCircuit,
  Cpu,
  RefreshCw,
  Server,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Zap,
  ListVideo,
  ScrollText,
  Scissors,
  Wrench,
  Sun,
  Moon,
  FolderTree,
  Columns3,
  MonitorPlay,
  Menu,
  Compass,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  CircuitBreakerStatus,
  ProjectSummary,
  ProjectVision,
  ProviderDetail,
  ProviderStatusResponse,
  SynthesisJob,
  ToastItem,
} from '../../types'
import { VaultDevToolsModal } from '../dev/VaultDevToolsModal'
import { ProjectSelector } from '../projects/ProjectSelector'

interface HeaderProps {
  activeModule?: 'vault' | 'curriculum' | 'script' | 'media' | 'presentation'
  onSelectModule?: (module: 'vault' | 'curriculum' | 'script' | 'media' | 'presentation') => void
  activeModel?: string | null
  onRefreshAll?: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
  vaultLayout?: 'tree' | 'split'
  onToggleVaultLayout?: (layout: 'tree' | 'split') => void
  activeProject?: ProjectSummary | ProjectVision | null
  onSelectProject?: (project: ProjectSummary | null) => void
  onOpenCreateProject?: () => void
  onOpenProjectVision?: () => void
  projectsRefreshTrigger?: number
  activeSynthesisJob?: SynthesisJob | null
  experienceMode?: 'express' | 'studio'
  onToggleExperienceMode?: (mode: 'express' | 'studio') => void
  onTriggerAutoPilot?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  activeModule = 'vault',
  onSelectModule,
  activeModel: propActiveModel,
  onRefreshAll,
  onToast,
  vaultLayout = 'tree',
  onToggleVaultLayout,
  activeProject,
  onSelectProject,
  onOpenCreateProject,
  onOpenProjectVision,
  projectsRefreshTrigger = 0,
  activeSynthesisJob,
  experienceMode = 'express',
  onToggleExperienceMode,
  onTriggerAutoPilot,
}) => {
  const [showDevTools, setShowDevTools] = useState(false)

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('yt_theme') as 'dark' | 'light') || 'dark'
    } catch {
      return 'dark'
    }
  })

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    try {
      localStorage.setItem('yt_theme', nextTheme)
    } catch {}
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(nextTheme)
  }

  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [backendAlive, setBackendAlive] = useState<boolean | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const telemetryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (telemetryRef.current && !telemetryRef.current.contains(e.target as Node)) {
        setShowDetails(false)
      }
    }
    if (menuOpen || showDetails) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen, showDetails])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const [providers, health] = await Promise.allSettled([
        api.getProviderStatus(),
        api.getHealth(),
      ])

      if (providers.status === 'fulfilled') {
        setProviderStatus(providers.value)
      }
      if (health.status === 'fulfilled') {
        setBackendAlive(true)
      } else {
        setBackendAlive(false)
      }
    } catch {
      setBackendAlive(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const timer = setInterval(fetchStatus, 30000)
    return () => clearInterval(timer)
  }, [])

  // Parse providers and circuit breaker from providerStatus
  let providersMap: Record<string, ProviderDetail> = {}
  let circuitBreaker: CircuitBreakerStatus | null = null

  if (providerStatus?.providers) {
    const raw = providerStatus.providers as Record<string, unknown>
    if (raw.providers && typeof raw.providers === 'object') {
      providersMap = raw.providers as Record<string, ProviderDetail>
      circuitBreaker = (raw.circuit_breaker as CircuitBreakerStatus) || null
    } else {
      providersMap = raw as Record<string, ProviderDetail>
    }
  }

  const primaryKey = providerStatus?.primary_provider || 'gemini'
  const fallbackKey = providerStatus?.fallback_provider || 'openai_compatible'

  const primaryDetail = providersMap[primaryKey]
  const fallbackDetail = providersMap[fallbackKey]

  const primaryAvailable = primaryDetail?.available ?? false
  const hasTrippedModels = circuitBreaker?.has_tripped_models ?? false

  // Compute currently displayed active model
  const activeModelDisplay =
    propActiveModel ||
    primaryDetail?.active_model ||
    primaryDetail?.model ||
    (primaryAvailable ? primaryKey : fallbackDetail?.model || fallbackKey)

  // Compact model name formatter for clean status chip
  const getCompactModelName = (name: string | null | undefined, alive: boolean | null): string => {
    if (alive === false) return 'Offline'
    if (!name) return 'AI Router'
    const lower = name.toLowerCase()
    if (lower.includes('3.8')) return 'Gemini 3.8'
    if (lower.includes('3.6')) return 'Gemini 3.6'
    if (lower.includes('2.5')) return 'Gemini 2.5'
    if (lower.includes('gemini')) return 'Gemini'
    if (lower.includes('openai')) return 'OpenAI Fallback'
    if (lower.includes('llama')) return 'Llama 3.3'
    if (lower.includes('claude')) return 'Claude'
    return name.length > 14 ? name.slice(0, 12) + '…' : name
  }

  const EXPRESS_STEPS: {
    id: 'vault' | 'curriculum' | 'script' | 'presentation'
    num: number
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    { id: 'vault', num: 1, label: 'Research', icon: BrainCircuit },
    { id: 'curriculum', num: 2, label: 'Curriculum', icon: ListVideo },
    { id: 'script', num: 3, label: 'Script', icon: ScrollText },
    { id: 'presentation', num: 4, label: 'Slides', icon: MonitorPlay },
  ]

  return (
    <header className="h-14 border-b border-[#232738] bg-[#0c0e15] px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Module Switcher Tabs */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white font-sans">
                yt-research-gen
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                v0.4
              </span>
            </div>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

        {/* Project Sandbox & North Star Selector */}
        {onSelectProject && (
          <div className="flex items-center gap-2">
            <ProjectSelector
              activeProject={activeProject || null}
              onSelectProject={onSelectProject}
              onOpenCreateModal={onOpenCreateProject || (() => {})}
              onOpenVisionModal={onOpenProjectVision || (() => {})}
              onToast={onToast}
              refreshTrigger={projectsRefreshTrigger}
            />
            <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />
          </div>
        )}

        {/* Module Navigation Stepper / Tabs & Mode Toggle */}
        {onSelectModule && (
          <div className="flex items-center gap-2.5">
            {experienceMode === 'express' ? (
              <>
                {/* Express Mode Stepper: 4 sequential steps with clean Chevrons */}
                <nav aria-label="Express workflow" className="flex items-center bg-[#131522] p-1 rounded-lg border border-[#25293d] gap-1">
                {EXPRESS_STEPS.map((step, idx) => {
                  const isActive = activeModule === step.id
                  const StepIcon = step.icon
                  return (
                    <React.Fragment key={step.id}>
                      <button
                        type="button"
                        onClick={() => onSelectModule(step.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#181b2c]'
                        }`}
                        title={`Express Step ${step.num}: ${step.label}`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                            isActive ? 'bg-white/25 text-white' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {step.num}
                        </span>
                        <StepIcon className="w-3.5 h-3.5" />
                        <span>{step.label}</span>
                        {step.id === 'vault' && activeSynthesisJob?.status === 'running' && (
                          <span
                            className="flex items-center gap-1 ml-1 px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono animate-pulse"
                            title={`Context Extender synthesizing: "${activeSynthesisJob.topic}" (${activeSynthesisJob.elapsedSeconds}s)`}
                          >
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          </span>
                        )}
                      </button>
                      {idx < EXPRESS_STEPS.length - 1 && (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0 select-none" />
                      )}
                    </React.Fragment>
                  )
                })}
              </nav>
              {onTriggerAutoPilot && (
                <button
                  type="button"
                  onClick={onTriggerAutoPilot}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  title="Run 4-stage Express pipeline autonomously"
                >
                  <Zap className="w-3 h-3 fill-white/20" />
                  <span className="hidden sm:inline">Auto-Pilot</span>
                </button>
              )}
            </>
          ) : (
            /* Studio Mode Full 5-Tab Bar */
            <nav aria-label="Studio modules" className="flex items-center bg-[#131522] p-0.5 rounded-lg border border-[#25293d]">
                <button
                  onClick={() => onSelectModule('vault')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeModule === 'vault'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>Fact Vault & Research</span>
                  {activeSynthesisJob?.status === 'running' && (
                    <span
                      className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono animate-pulse"
                      title={`Context Extender synthesizing: "${activeSynthesisJob.topic}" (${activeSynthesisJob.elapsedSeconds}s)`}
                    >
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      <span>{activeSynthesisJob.elapsedSeconds}s</span>
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onSelectModule('curriculum')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeModule === 'curriculum'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ListVideo className="w-3.5 h-3.5" />
                  <span>Curriculum Arc Studio</span>
                </button>
                <button
                  onClick={() => onSelectModule('script')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeModule === 'script'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ScrollText className="w-3.5 h-3.5" />
                  <span>Script Studio & Teleprompter</span>
                </button>
                <button
                  onClick={() => onSelectModule('media')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeModule === 'media'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Module 4: A/V Sync & Audio Smoothing"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Jump-Cut Studio</span>
                </button>
                <button
                  onClick={() => onSelectModule('presentation')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeModule === 'presentation'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Module 5: Synced Presentation Studio & Slide Engine"
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Slide Engine</span>
                </button>
              </nav>
            )}

            {/* Sleek Mode Toggle Segmented Pill */}
            <div className="flex items-center bg-[#10121d] p-0.5 rounded-lg border border-[#23273c]">
              <button
                type="button"
                onClick={() => onToggleExperienceMode?.('express')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  experienceMode === 'express'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Express Mode: 4-step streamlined workflow (Research -> Curriculum -> Script -> Slides)"
              >
                <span>⚡</span>
                <span>Express</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleExperienceMode?.('studio')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  experienceMode === 'studio'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Studio Mode: Full 5-module workspace with Jump-Cut Studio & all tools"
              >
                <span>🛠</span>
                <span>Studio</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: Consolidated Telemetry Status Chip + Dropdown + Refresh */}
      <div className="flex items-center gap-2">
        {/* Consolidated AI Telemetry Chip: [● {compactModelName}] */}
        <div className="relative" ref={telemetryRef}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors shadow-sm cursor-pointer ${
              hasTrippedModels
                ? 'bg-[#191522] border-amber-500/60 hover:border-amber-400 text-amber-200'
                : backendAlive === false
                ? 'bg-[#1b1216] border-rose-500/50 hover:border-rose-400 text-rose-200'
                : 'bg-[#151826] border-[#272c40] hover:border-zinc-700 text-zinc-200'
            }`}
            title="Click to view AI Router, active model cascade & failover telemetry"
          >
            <span className="relative flex h-2 w-2">
              {primaryAvailable && !hasTrippedModels ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </>
              ) : hasTrippedModels ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </>
              ) : backendAlive === false ? (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              )}
            </span>

            {/* Clean compact model status tag */}
            <span className="font-mono text-[11px] font-medium truncate max-w-[140px]">
              {getCompactModelName(activeModelDisplay, backendAlive)}
            </span>

            <ChevronDown
              className={`w-3 h-3 text-zinc-400 ml-0.5 transition-transform ${
                showDetails ? 'rotate-180 text-indigo-400' : ''
              }`}
            />
          </button>

          {/* Provider Details Dropdown */}
          {showDetails && (
            <div className="absolute right-0 mt-2 w-80 bg-[#12141f] border border-[#272c40] rounded-xl shadow-2xl p-3.5 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" /> AI Router & Failover
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Real-Time</span>
              </div>

              <div className="space-y-3">
                {/* Active Responding Model */}
                <div className="bg-[#181b2a] rounded-lg p-2.5 border border-indigo-900/40">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                    <span className="flex items-center gap-1 text-indigo-300">
                      <Zap className="w-3 h-3" /> Responding Model
                    </span>
                    <span className="text-emerald-400 text-[10px] font-mono">READY</span>
                  </div>
                  <div className="font-mono text-xs text-white font-semibold truncate">
                    {activeModelDisplay}
                  </div>
                </div>

                {/* Primary Provider & Cascade */}
                <div>
                  <div className="flex items-center justify-between text-zinc-400 text-[11px] mb-1 font-mono">
                    <span>PRIMARY: {primaryKey.toUpperCase()}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        primaryAvailable
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                      }`}
                    >
                      {primaryAvailable ? 'Healthy' : 'Unavailable'}
                    </span>
                  </div>
                  {primaryDetail?.cascade && primaryDetail.cascade.length > 0 && (
                    <div className="bg-[#181b28] rounded p-2 text-[10px] font-mono text-zinc-300 space-y-1">
                      <span className="text-zinc-500 block text-[9px]">Model Cascade Order:</span>
                      {primaryDetail.cascade.map((m, idx) => (
                        <div key={m} className="flex items-center gap-1 text-zinc-300 truncate">
                          <span className="text-zinc-500">{idx + 1}.</span>
                          <span className={m === activeModelDisplay ? 'text-indigo-400 font-semibold' : ''}>
                            {m}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fallback Provider */}
                <div>
                  <div className="flex items-center justify-between text-zinc-400 text-[11px] mb-1 font-mono">
                    <span>FALLBACK: {fallbackKey.toUpperCase()}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        fallbackDetail?.available
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {fallbackDetail?.available ? 'Standby' : 'Offline'}
                    </span>
                  </div>
                  {fallbackDetail?.model && (
                    <div className="bg-[#181b28] rounded p-2 text-[10px] font-mono text-zinc-300 truncate">
                      Model: {fallbackDetail.model}
                    </div>
                  )}
                </div>

                {/* Circuit Breaker Telemetry */}
                {circuitBreaker && (
                  <div className="pt-2 border-t border-zinc-800">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <AlertTriangle className="w-3 h-3 text-amber-400" /> Circuit Breaker
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${
                          hasTrippedModels
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'text-zinc-500'
                        }`}
                      >
                        {hasTrippedModels ? 'TRIPPED' : 'All Clear'}
                      </span>
                    </div>
                    {hasTrippedModels && circuitBreaker.tripped_models && (
                      <div className="bg-amber-950/30 border border-amber-900/40 rounded p-2 text-[10px] font-mono text-amber-300/90 space-y-1">
                        {Object.entries(circuitBreaker.tripped_models).map(([mod, data]) => (
                          <div key={mod} className="flex justify-between items-center">
                            <span className="truncate">{mod}</span>
                            <span className="text-zinc-400 text-[9px]">
                              {data.cooldown_remaining_sec}s cooldown
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Backend Connection */}
                <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Server className="w-3 h-3" /> Backend (:8000)
                  </span>
                  <span className={backendAlive ? 'text-emerald-400' : 'text-rose-400'}>
                    {backendAlive ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Background Synthesis Job Pill */}
        {activeSynthesisJob?.status === 'running' && (
          <button
            type="button"
            onClick={() => onSelectModule?.('vault')}
            className="synthesis-active-pill flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/60 hover:border-indigo-400 text-indigo-200 text-xs font-medium transition-all shadow-md group cursor-pointer"
            title="Context Extender job running in background. Click to jump to Fact Vault."
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin group-hover:text-indigo-300" />
            <span className="hidden sm:inline text-zinc-300 font-normal text-[11px]">Synthesizing:</span>
            <span className="font-semibold text-white truncate max-w-[100px] md:max-w-[150px]">
              "{activeSynthesisJob.topic}"
            </span>
            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-900/80 border border-indigo-700/50 px-1.5 py-0.5 rounded">
              {activeSynthesisJob.elapsedSeconds}s
            </span>
          </button>
        )}

        {/* Consolidated Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all shadow-sm ${
              menuOpen
                ? 'bg-[#1b2034] border-indigo-500/60 text-white ring-1 ring-indigo-500/30'
                : 'bg-[#151826] border-[#272c40] hover:border-zinc-700 text-zinc-200'
            }`}
            title="App Menu & Preferences"
          >
            <Menu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-medium">Menu</span>
            <ChevronDown
              className={`w-3 h-3 text-zinc-400 transition-transform ${
                menuOpen ? 'rotate-180 text-indigo-400' : ''
              }`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#0e111a] border border-[#272c40] rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
              {/* 1. Theme Switcher */}
              <button
                type="button"
                onClick={() => {
                  toggleTheme()
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d30] text-zinc-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  )}
                  <span className="font-medium">Theme Mode</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#131625] border border-[#252a3f] text-zinc-300">
                  {theme === 'dark' ? 'Daylight Soft' : 'Dark Mode'}
                </span>
              </button>

              {/* 2. Vault Layout (if on vault module) */}
              {activeModule === 'vault' && onToggleVaultLayout && (
                <div className="p-2 border-t border-[#202538] space-y-1.5">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    Vault View Layout
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleVaultLayout('tree')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                        vaultLayout === 'tree'
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-[#141725] text-zinc-300 hover:text-white border border-[#23283c]'
                      }`}
                      title="Collapsible Tree View (2-column layout)"
                    >
                      <FolderTree className="w-3.5 h-3.5" />
                      <span>Tree</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleVaultLayout('split')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                        vaultLayout === 'split'
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-[#141725] text-zinc-300 hover:text-white border border-[#23283c]'
                      }`}
                      title="Classic 3-Column Split View"
                    >
                      <Columns3 className="w-3.5 h-3.5" />
                      <span>Split</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Project Vision */}
              {activeProject && onOpenProjectVision && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onOpenProjectVision()
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d30] text-zinc-200 transition-colors border-t border-[#202538]"
                >
                  <span className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <span>Project Vision (North Star)</span>
                  </span>
                  <span className="text-[10px] text-indigo-400 font-mono">Edit</span>
                </button>
              )}

              {/* 4. Vault Management & Dev Tools */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setShowDevTools(true)
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d30] text-zinc-200 transition-colors border-t border-[#202538]"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-400" />
                  <span>Vault & Dev Tools</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Storage</span>
              </button>

              {/* 5. AI Router & Provider Telemetry */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setShowDetails(true)
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d30] text-zinc-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  <span>AI Router & Telemetry</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Cascade</span>
              </button>

              {/* 6. Sync / Refresh */}
              <div className="pt-1 border-t border-[#202538]">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    fetchStatus()
                    onRefreshAll?.()
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#181d30] text-zinc-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : 'text-zinc-400'}`}
                    />
                    <span>Sync & Refresh All</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Sync</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vault Dev Tools Modal */}
      <VaultDevToolsModal
        isOpen={showDevTools}
        onClose={() => setShowDevTools(false)}
        onRefreshAll={onRefreshAll}
        onToast={onToast}
      />
    </header>
  )
}
