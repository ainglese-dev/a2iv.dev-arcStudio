import React, { useEffect, useRef, useState } from 'react'
import {
  FolderGit2,
  ChevronDown,
  Plus,
  Compass,
  Check,
  Trash2,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  ProjectSummary,
  ProjectVision,
  TechnicalDepth,
  ToastItem,
  VideoFormatPreset,
} from '../../types'

interface ProjectSelectorProps {
  activeProject: ProjectSummary | ProjectVision | null
  onSelectProject: (project: ProjectSummary | null) => void
  onOpenCreateModal: () => void
  onOpenVisionModal: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
  refreshTrigger?: number
}

const getDepthBadge = (depth?: TechnicalDepth) => {
  switch (depth) {
    case 'practitioner_deep':
      return {
        label: 'Practitioner Deep',
        className: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60',
      }
    case 'applied_engineering':
      return {
        label: 'Applied Eng',
        className: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
      }
    case 'conceptual_overview':
      return {
        label: 'Conceptual',
        className: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
      }
    default:
      return {
        label: 'General',
        className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
      }
  }
}

const getFormatLabel = (format?: VideoFormatPreset) => {
  switch (format) {
    case 'multi_episode_arc':
      return 'Series'
    case 'deep_dive_standalone':
      return 'Deep Dive'
    case 'quick_explainer':
      return 'Explainer'
    default:
      return 'Video'
  }
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  activeProject,
  onSelectProject,
  onOpenCreateModal,
  onOpenVisionModal,
  onToast,
  refreshTrigger = 0,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const list = await api.listProjects()
      setProjects(list)
      if (list.length > 0) {
        const storedId = api.getActiveProjectId()
        const found = list.find((p) => p.project_id === storedId)
        if (found) {
          if (!activeProject || activeProject.project_id !== found.project_id) {
            onSelectProject(found)
          }
        } else if (!activeProject) {
          onSelectProject(list[0])
          api.setActiveProjectId(list[0].project_id)
        }
      } else {
        // Zero projects exist (user started from scratch)
        onSelectProject(null)
        api.setActiveProjectId(null)
      }
    } catch {
      // Backend may be starting or offline
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [refreshTrigger])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to delete project sandbox "${projectId}"? This will erase all vault sources and scripts in this sandbox.`)) {
      return
    }

    setDeletingId(projectId)
    try {
      await api.deleteProject(projectId)
      onToast?.({
        type: 'info',
        title: 'Project Sandbox Deleted',
        message: `Deleted project "${projectId}".`,
      })
      const updatedList = projects.filter((p) => p.project_id !== projectId)
      setProjects(updatedList)

      if (activeProject?.project_id === projectId) {
        if (updatedList.length > 0) {
          onSelectProject(updatedList[0])
          api.setActiveProjectId(updatedList[0].project_id)
        } else {
          onSelectProject(null)
          api.setActiveProjectId(null)
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete project'
      onToast?.({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleSeedSample = async () => {
    try {
      const sample = await api.seedSampleProject()
      onToast?.({
        type: 'success',
        title: 'Sample Project Loaded',
        message: `Loaded "${sample.title}".`,
      })
      await fetchProjects()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample project'
      onToast?.({
        type: 'error',
        title: 'Load Failed',
        message: msg,
      })
    }
  }

  const depthBadge = getDepthBadge(activeProject?.technical_depth)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Project Pill Trigger */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition-all shadow-sm ${
            isOpen
              ? 'bg-[#1b2034] border-indigo-500/60 text-white ring-1 ring-indigo-500/30'
              : 'bg-[#131625] border-[#252a3f] hover:border-zinc-700 text-zinc-200'
          }`}
          title="Switch Active Project Arc Sandbox"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />

          {activeProject ? (
            <div className="flex items-center gap-1.5 max-w-[200px] truncate">
              <span className="font-semibold text-white truncate">
                {activeProject.title}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded border font-mono shrink-0 hidden xl:inline-block ${depthBadge.className}`}
              >
                {depthBadge.label}
              </span>
            </div>
          ) : (
            <span className="text-indigo-400 font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" />
              <span>New Project Arc</span>
            </span>
          )}

          <ChevronDown
            className={`w-3 h-3 text-zinc-400 transition-transform ${
              isOpen ? 'rotate-180 text-indigo-400' : ''
            }`}
          />
        </button>

        {/* Project Vision Quick Button (Compass icon) */}
        {activeProject && (
          <button
            type="button"
            onClick={onOpenVisionModal}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#131625] hover:bg-[#1a1f33] border border-[#252a3f] hover:border-indigo-500/50 text-xs text-indigo-300 transition-all shadow-sm"
            title="Inspect & Edit Project North Star Vision"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline text-[11px] font-medium">Vision</span>
          </button>
        )}
      </div>

      {/* Project Selector Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-96 bg-[#0e111a] border border-[#272c40] rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#202538] bg-[#121522]">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Project Sandboxes</span>
              <span className="text-[10px] text-zinc-500 font-mono">
                ({projects.length})
              </span>
            </div>
            <button
              type="button"
              onClick={fetchProjects}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Refresh project list"
            >
              <RefreshCw
                className={`w-3 h-3 ${loading ? 'animate-spin text-indigo-400' : ''}`}
              />
            </button>
          </div>

          {/* Project List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
            {projects.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 space-y-3">
                <Sparkles className="w-5 h-5 mx-auto text-indigo-400/60" />
                <p className="text-xs text-zinc-300 font-medium">No project sandboxes active.</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Start fresh with a new project arc, or restore the Cloudflare SRE sample data.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onOpenCreateModal()
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Project Arc</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedSample}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#161a2b] hover:bg-[#1e233d] border border-[#262c44] text-zinc-300 hover:text-white font-medium text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Load Cloudflare SRE Sample</span>
                  </button>
                </div>
              </div>
            ) : (
              projects.map((proj) => {
                const isSelected = activeProject?.project_id === proj.project_id
                const badge = getDepthBadge(proj.technical_depth)
                return (
                  <div
                    key={proj.project_id}
                    onClick={() => {
                      onSelectProject(proj)
                      api.setActiveProjectId(proj.project_id)
                      setIsOpen(false)
                    }}
                    className={`group flex items-start justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-[#181d30] border-indigo-500/50 text-white'
                        : 'border-transparent hover:bg-[#141725] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0 pr-2">
                      <div className="pt-0.5 shrink-0">
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-indigo-400 font-bold" />
                        ) : (
                          <FolderGit2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs truncate">
                            {proj.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {getFormatLabel(proj.target_format)}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            • {proj.sources_count ?? 0} sources • {proj.scripts_count ?? 0} scripts
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(e, proj.project_id)}
                        disabled={deletingId === proj.project_id}
                        className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-950/30 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete project sandbox"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Actions: + New Project Arc */}
          <div className="p-2 border-t border-[#202538] bg-[#121522] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onOpenCreateModal()
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project Arc</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
