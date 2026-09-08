import React, { useCallback, useEffect, useState } from 'react'
import {
  X,
  Database,
  Trash2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  FileText,
  BrainCircuit,
  ListVideo,
  ScrollText,
  Scissors,
  Layers,
  HardDrive,
  Bell,
  MonitorPlay,
  FolderGit2,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  ToastItem,
  VaultResetTarget,
  VaultStatsResponse,
} from '../../types'

interface VaultDevToolsModalProps {
  isOpen: boolean
  onClose: () => void
  onRefreshAll?: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0 || isNaN(bytes)) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const VaultDevToolsModal: React.FC<VaultDevToolsModalProps> = ({
  isOpen,
  onClose,
  onRefreshAll,
  onToast,
}) => {
  const [stats, setStats] = useState<VaultStatsResponse | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isResetting, setIsResetting] = useState<string | null>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const [confirmFullReset, setConfirmFullReset] = useState(false)

  // Fetch vault stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const data = await api.getVaultStats()
      setStats(data)
    } catch {
      // If endpoint is not ready yet or errors, keep graceful fallback
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchStats()
      setConfirmFullReset(false)
    }
  }, [isOpen, fetchStats])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Selective Purge Handler
  const handlePurge = async (target: VaultResetTarget, label: string) => {
    setIsResetting(target)
    try {
      const res = await api.resetVault(target)
      onToast?.({
        type: 'info',
        title: 'Vault Category Purged',
        message: res.message || `Deleted ${res.deleted_count} items from ${label}.`,
      })
      await fetchStats()
      onRefreshAll?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed'
      onToast?.({
        type: 'error',
        title: 'Purge Failed',
        message: msg,
      })
    } finally {
      setIsResetting(null)
    }
  }

  // Full Vault Soft-Reset Handler
  const handleFullReset = async () => {
    if (!confirmFullReset) {
      setConfirmFullReset(true)
      setTimeout(() => setConfirmFullReset(false), 5000)
      return
    }

    setIsResetting('all')
    try {
      const res = await api.resetVault('all')
      onToast?.({
        type: 'info',
        title: 'Vault Soft-Reset Complete',
        message: res.message || `Purged ${res.deleted_count} total files. Vault restored to pristine state.`,
      })
      setConfirmFullReset(false)
      await fetchStats()
      onRefreshAll?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Full reset failed'
      onToast?.({
        type: 'error',
        title: 'Reset Failed',
        message: msg,
      })
    } finally {
      setIsResetting(null)
    }
  }

  // Seed Verified Sample Data Handler
  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const res = await api.seedVault()
      onToast?.({
        type: 'success',
        title: 'Sample Data Seeded',
        message: res.message || `Created ${res.sources_created} sources and ${res.facts_created} facts.`,
      })
      await fetchStats()
      onRefreshAll?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sample data seeding failed'
      onToast?.({
        type: 'error',
        title: 'Seed Failed',
        message: msg,
      })
    } finally {
      setIsSeeding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="bg-[#0e101a] border border-[#232738] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#202436] px-5 py-3.5 bg-[#121422] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Vault Management & Dev Tools
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  Storage Inspector
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Live storage metrics, selective content purging, and testing presets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161828] border border-[#262a40] text-xs font-mono text-zinc-300">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span>{formatBytes(stats.total_size_bytes)}</span>
                <span className="text-zinc-600">&bull;</span>
                <span className="text-zinc-400">{stats.total_files} files</span>
              </div>
            )}

            <button
              type="button"
              onClick={fetchStats}
              disabled={isLoadingStats}
              className="p-1.5 rounded-lg bg-[#161828] hover:bg-[#1e2238] border border-[#262a40] text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh Vault Statistics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#161828] hover:bg-[#1e2238] border border-[#262a40] text-zinc-400 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick-Start Testing Presets Bar */}
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-700/40 flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Seed Verified Practitioner Test Data</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Instantly injects sample Containerlab & modern networking raw articles + extracted atomic facts for smoke-testing.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-md transition-colors shrink-0"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin text-amber-300' : ''}`} />
              <span>{isSeeding ? 'Seeding Sample Data...' : 'Seed Practitioner Vault'}</span>
            </button>
          </div>

          {/* Toast Notification Theme Diagnostic Bar */}
          <div className="p-3.5 rounded-xl bg-[#121522] border border-[#23273b] flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                <span>Toast Notification Theme Diagnostic</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Trigger live toast notifications to test readability in both Dark & Daylight soft modes.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onToast?.({
                  type: 'info',
                  title: 'Model Pipeline Initialized',
                  message: 'Whisper Large-v3 and Gemini 2.5 Flash ready for video sync.',
                  durationMs: 42,
                })}
                className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 text-indigo-300 font-mono text-[11px] transition-colors"
              >
                Info
              </button>
              <button
                type="button"
                onClick={() => onToast?.({
                  type: 'success',
                  title: 'A/V Jump-Cut Rendered',
                  message: 'Successfully exported 0.33ms aligned MP4 video with micro-fades.',
                  model: 'VideoToolbox',
                  durationMs: 1420,
                })}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 font-mono text-[11px] transition-colors"
              >
                Success
              </button>
              <button
                type="button"
                onClick={() => onToast?.({
                  type: 'fallback',
                  title: 'AI Provider Failover Triggered',
                  message: 'Primary provider timed out; switched to remote Qwen 3.8 backup.',
                  model: 'Qwen 3.8',
                  reason: 'HTTP 504 Gateway Timeout on primary Gemini endpoint',
                  durationMs: 3120,
                })}
                className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-700/50 text-amber-300 font-mono text-[11px] transition-colors"
              >
                Fallback
              </button>
              <button
                type="button"
                onClick={() => onToast?.({
                  type: 'error',
                  title: 'FFmpeg Transcode Error',
                  message: 'Audio sample rate mismatch: expected 48000Hz, received 44100Hz.',
                })}
                className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 font-mono text-[11px] transition-colors"
              >
                Error
              </button>
            </div>
          </div>

          {/* Section: Category Storage Telemetry Cards */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-300 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vault Storage Categories & Purge Controls</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {/* Sources Card */}
              <div className="p-3 rounded-xl bg-[#121522] border border-[#23273b] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Sources
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {stats ? formatBytes(stats.sources.size_bytes) : '...'}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-zinc-100">
                  {stats?.sources.count ?? 0}{' '}
                  <span className="text-[11px] font-normal text-zinc-500 font-sans">files</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurge('sources', 'Raw Sources')}
                  disabled={isResetting === 'sources' || (stats?.sources.count ?? 0) === 0}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded bg-[#181b2a] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-[#262b3f] text-zinc-400 text-[11px] font-mono transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isResetting === 'sources' ? 'Purging...' : 'Purge Sources'}</span>
                </button>
              </div>

              {/* Atomic Facts Card */}
              <div className="p-3 rounded-xl bg-[#121522] border border-[#23273b] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" />
                    Atomic Facts
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {stats ? formatBytes(stats.facts.size_bytes) : '...'}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-cyan-300">
                  {stats?.facts.count ?? 0}{' '}
                  <span className="text-[11px] font-normal text-zinc-500 font-sans">notes</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurge('facts', 'Atomic Facts')}
                  disabled={isResetting === 'facts' || (stats?.facts.count ?? 0) === 0}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded bg-[#181b2a] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-[#262b3f] text-zinc-400 text-[11px] font-mono transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isResetting === 'facts' ? 'Purging...' : 'Purge Facts'}</span>
                </button>
              </div>

              {/* Curriculum Arcs Card */}
              <div className="p-3 rounded-xl bg-[#121522] border border-[#23273b] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <ListVideo className="w-3.5 h-3.5 text-purple-400" />
                    Curriculum Arcs
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {stats ? formatBytes(stats.curriculum.size_bytes) : '...'}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-purple-300">
                  {stats?.curriculum.count ?? 0}{' '}
                  <span className="text-[11px] font-normal text-zinc-500 font-sans">arcs</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurge('curriculum', 'Curriculum Arcs')}
                  disabled={isResetting === 'curriculum' || (stats?.curriculum.count ?? 0) === 0}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded bg-[#181b2a] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-[#262b3f] text-zinc-400 text-[11px] font-mono transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isResetting === 'curriculum' ? 'Purging...' : 'Purge Arcs'}</span>
                </button>
              </div>

              {/* Video Scripts Card */}
              <div className="p-3 rounded-xl bg-[#121522] border border-[#23273b] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <ScrollText className="w-3.5 h-3.5 text-amber-400" />
                    Video Scripts
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {stats ? formatBytes(stats.scripts.size_bytes) : '...'}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-amber-300">
                  {stats?.scripts.count ?? 0}{' '}
                  <span className="text-[11px] font-normal text-zinc-500 font-sans">scripts</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurge('scripts', 'Video Scripts')}
                  disabled={isResetting === 'scripts' || (stats?.scripts.count ?? 0) === 0}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded bg-[#181b2a] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-[#262b3f] text-zinc-400 text-[11px] font-mono transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isResetting === 'scripts' ? 'Purging...' : 'Purge Scripts'}</span>
                </button>
              </div>

              {/* Media Cuts & Renders Card */}
              <div className="p-3 rounded-xl bg-[#121522] border border-[#23273b] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                    Media Renders
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {stats ? formatBytes(stats.media.size_bytes) : '...'}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-300">
                  {stats?.media.count ?? 0}{' '}
                  <span className="text-[11px] font-normal text-zinc-500 font-sans">files</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurge('media', 'Media Renders')}
                  disabled={isResetting === 'media' || (stats?.media.count ?? 0) === 0}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded bg-[#181b2a] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-[#262b3f] text-zinc-400 text-[11px] font-mono transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isResetting === 'media' ? 'Purging...' : 'Purge Media'}</span>
                </button>
              </div>

              {/* Presentation Slide Decks Card */}
              <div className="p-3 rounded-xl bg-[#121522] border border-[#23273b] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <MonitorPlay className="w-3.5 h-3.5 text-indigo-400" />
                    Slide Decks
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {stats ? formatBytes(stats.presentations?.size_bytes ?? 0) : '...'}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-indigo-300">
                  {stats?.presentations?.count ?? 0}{' '}
                  <span className="text-[11px] font-normal text-zinc-500 font-sans">decks</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurge('presentations', 'Slide Decks')}
                  disabled={isResetting === 'presentations' || (stats?.presentations?.count ?? 0) === 0}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded bg-[#181b2a] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-[#262b3f] text-zinc-400 text-[11px] font-mono transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isResetting === 'presentations' ? 'Purging...' : 'Purge Slides'}</span>
                </button>
              </div>

              {/* Research Guides Card */}
              <div className="p-3 rounded-xl bg-[#121522] border border-[#23273b] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    Guides & Context
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {stats ? formatBytes(stats.guides.size_bytes) : '...'}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-indigo-300">
                  {stats?.guides.count ?? 0}{' '}
                  <span className="text-[11px] font-normal text-zinc-500 font-sans">guides</span>
                </div>
                <div className="py-1 text-[10px] text-zinc-500 font-mono text-center">
                  Part of context extensions
                </div>
              </div>

              {/* Project Sandboxes Card */}
              <div className="p-3 rounded-xl bg-[#121522] border border-[#23273b] flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-200 flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                    Project Arcs
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {stats?.projects ? formatBytes(stats.projects.size_bytes) : '...'}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-indigo-300">
                  {stats?.projects?.count ?? 0}{' '}
                  <span className="text-[11px] font-normal text-zinc-500 font-sans">sandboxes</span>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurge('projects', 'Project Sandboxes')}
                  disabled={isResetting === 'projects' || (stats?.projects?.count ?? 0) === 0}
                  className="w-full flex items-center justify-center gap-1 py-1 rounded bg-[#181b2a] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800/60 border border-[#262b3f] text-zinc-400 text-[11px] font-mono transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isResetting === 'projects' ? 'Purging...' : 'Purge Projects'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Nuclear Reset Zone */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Nuclear Zone: Full Vault Soft-Reset (Wipe All)</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Purges all generated scripts, synced presentation decks, curriculum arcs, processed media, extracted atomic facts, and ingested source articles from the Obsidian vault disk storage. Does not delete software source code or configurations.
            </p>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <span className="text-[10px] font-mono text-zinc-500">
                Requires 2 clicks to confirm. Cannot be undone.
              </span>

              <button
                type="button"
                onClick={handleFullReset}
                disabled={isResetting === 'all'}
                className={`px-4 py-2 rounded-lg font-bold text-xs font-mono transition-all shadow-md ${
                  confirmFullReset
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-900/50'
                    : 'bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/60 text-rose-300'
                }`}
              >
                {isResetting === 'all'
                  ? 'Wiping Vault Storage...'
                  : confirmFullReset
                  ? '⚠️ Click Again to Confirm Full Wipe'
                  : '💣 Full Vault Soft-Reset (Wipe All)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
