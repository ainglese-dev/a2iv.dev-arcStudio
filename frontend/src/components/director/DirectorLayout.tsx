import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  FolderGit2,
  ChevronDown,
  Plus,
  Sun,
  Moon,
  Sparkles,
  Sliders,
  Check,
  Archive,
  Trash2,
  Loader2,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  ProjectSummary,
  ProjectVision,
  ToastItem,
} from '../../types'
import { DirectorStream } from './DirectorStream'
import { CreateProjectModal } from '../projects/CreateProjectModal'
import { VaultManagerModal } from './VaultManagerModal'
import { ToastContainer } from '../ui/Toast'

export interface DirectorLayoutProps {
  onSwitchToStudio?: () => void
}

export const DirectorLayout: React.FC<DirectorLayoutProps> = ({
  onSwitchToStudio,
}) => {
  // Theme state persisted in localStorage
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

  // Project state
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [activeProject, setActiveProject] = useState<ProjectSummary | null>(null)
  const [activeVision, setActiveVision] = useState<ProjectVision | null>(null)
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isVaultManagerOpen, setIsVaultManagerOpen] = useState(false)
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null)
  const [isDeletingProjectId, setIsDeletingProjectId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Toast notifications
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = { ...toast, id }
    setToasts((prev) => [...prev, newToast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Load projects
  const refreshProjects = useCallback(async () => {
    try {
      const list = await api.listProjects()
      setProjects(list)
      if (list.length > 0) {
        const storedId = api.getActiveProjectId()
        // If storedId points to legacy sample or is not set, prefer the fresh non-tech showcase
        const matched = (storedId && storedId !== 'proj_cloudflare_origin_incident' ? list.find((p) => p.project_id === storedId) : null) ||
                        list.find((p) => p.project_id === 'proj_nolans_chronology') ||
                        list[0]
        setActiveProject(matched)
        api.setActiveProjectId(matched.project_id)
        try {
          const vision = await api.getProject(matched.project_id)
          setActiveVision(vision)
        } catch {
          setActiveVision(null)
        }
      }
    } catch (err) {
      console.warn('Failed to load projects:', err)
    }
  }, [])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false)
      }
    }
    if (isProjectDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProjectDropdownOpen])

  const handleSelectProject = async (proj: ProjectSummary | null) => {
    setIsProjectDropdownOpen(false)
    if (!proj) {
      setActiveProject(null)
      setActiveVision(null)
      api.setActiveProjectId(null)
      return
    }
    setActiveProject(proj)
    api.setActiveProjectId(proj.project_id)
    try {
      const vision = await api.getProject(proj.project_id)
      setActiveVision(vision)
    } catch {
      setActiveVision(null)
    }
  }

  const handleProjectCreated = (newProject: ProjectVision) => {
    setIsCreateProjectOpen(false)
    refreshProjects()
    addToast({
      type: 'success',
      title: 'Project Created',
      message: `Created sandbox "${newProject.title}".`,
    })
  }

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (confirmDeleteProjectId !== projectId) {
      setConfirmDeleteProjectId(projectId)
      setTimeout(() => setConfirmDeleteProjectId(null), 4000)
      return
    }

    setIsDeletingProjectId(projectId)
    try {
      await api.deleteProject(projectId)
      addToast({
        type: 'info',
        title: 'Project Deleted',
        message: `Project ${projectId} deleted.`,
      })
      setConfirmDeleteProjectId(null)
      const list = await api.listProjects()
      setProjects(list)
      if (activeProject?.project_id === projectId) {
        const nextProject = list.length > 0 ? list[0] : null
        handleSelectProject(nextProject)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete project'
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    } finally {
      setIsDeletingProjectId(null)
    }
  }

  return (
    <div className="director-layout min-h-screen flex flex-col bg-[#090a0f] text-zinc-100 font-sans selection:bg-indigo-500/30">
      {/* Minimal Top Bar - Zero Clutter, Zero Multi-Layer Tabs */}
      <header className="director-topbar sticky top-0 z-40 h-14 border-b border-[#1b1f2e] bg-[#0c0e15]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Brand + Director's Cut Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/30 text-xs font-mono">
              arc
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                ArcStudio
              </span>
              <a
                href="https://a2iv.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-zinc-400 hover:text-indigo-300 font-medium transition-colors hidden sm:inline underline underline-offset-2 decoration-zinc-700 hover:decoration-indigo-400"
                title="Visit a2iv.dev"
              >
                a2iv.dev
              </a>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60 shadow-sm flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
            <span>Director's Cut</span>
          </span>
        </div>

        {/* Center: Active Project Selector Dropdown & Vault Button */}
        <div className="flex items-center gap-2">
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141826] hover:bg-[#1a2033] border border-[#232a3f] text-xs font-medium text-zinc-200 transition-all cursor-pointer max-w-[200px] sm:max-w-xs"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">
                {activeProject?.title || 'Default Sandbox'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0 ml-0.5" />
            </button>

            {/* Project Dropdown Menu */}
            {isProjectDropdownOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-80 bg-[#0e111d] border border-[#242c44] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Switch Project Sandbox
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {projects.map((p) => {
                    const isSelected = activeProject?.project_id === p.project_id
                    const isConfirming = confirmDeleteProjectId === p.project_id
                    const isDeleting = isDeletingProjectId === p.project_id

                    return (
                      <div
                        key={p.project_id}
                        onClick={() => handleSelectProject(p)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-indigo-950/80 text-indigo-200 font-semibold'
                            : 'text-zinc-300 hover:bg-[#161a2b] hover:text-white'
                        }`}
                      >
                        <span className="truncate flex-1">{p.title}</span>

                        <div className="flex items-center gap-1 shrink-0">
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}

                          {/* Subtle Delete Project Button with 2-step confirmation */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteProject(e, p.project_id)}
                            disabled={isDeleting}
                            title={isConfirming ? 'Click again to confirm deletion' : 'Delete Project'}
                            className={`p-1 rounded transition-all cursor-pointer ${
                              isConfirming
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3 h-3 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-1.5 border-t border-[#1c2237]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectDropdownOpen(false)
                      setIsCreateProjectOpen(true)
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vault Button in Top Bar */}
          <button
            type="button"
            onClick={() => setIsVaultManagerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141826] hover:bg-[#1b2136] border border-[#232a3f] text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
            title="Open Vault Manager & Erase Controls"
          >
            <Archive className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Vault</span>
          </button>
        </div>

        {/* Right: Theme Toggle & Optional Legacy Studio Link */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle (Dark / Daylight) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-[#141826] hover:bg-[#1b2136] border border-[#232a3f] text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Daylight' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
          </button>

          {/* Minimal Link to Legacy Studio */}
          {onSwitchToStudio && (
            <button
              type="button"
              onClick={onSwitchToStudio}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#141826] hover:bg-[#1b2136] border border-[#232a3f] text-zinc-400 hover:text-zinc-200 text-xs font-mono transition-colors cursor-pointer"
              title="Open full 5-module workspace studio"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Classic Studio</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Director Stream Area */}
      <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col justify-start">
        <DirectorStream
          activeProject={activeProject}
          activeVision={activeVision}
          onRefreshProjects={refreshProjects}
          onToast={addToast}
        />
      </main>

      {/* Create Project Modal */}
      {isCreateProjectOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={handleProjectCreated}
          onToast={addToast}
        />
      )}

      {/* Vault Manager Modal */}
      {isVaultManagerOpen && (
        <VaultManagerModal
          isOpen={isVaultManagerOpen}
          onClose={() => setIsVaultManagerOpen(false)}
          activeProject={activeProject}
          onRefreshProject={refreshProjects}
          onToast={addToast}
        />
      )}

      {/* Clean Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
