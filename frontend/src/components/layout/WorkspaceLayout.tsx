import React, { useCallback, useEffect, useRef, useState } from 'react'
import { FolderGit2, Plus, Sparkles } from 'lucide-react'
import { api } from '../../services/api'
import type {
  AtomicFact,
  ContextExpansionRequest,
  ProjectSummary,
  ProjectVision,
  SourceMetadata,
  SynthesizedGuide,
  SynthesisJob,
  ToastItem,
  VideoEpisode,
} from '../../types'
import { ContextExtender } from '../expand/ContextExtender'
import { FactInspector } from '../facts/FactInspector'
import { SourceList } from '../sources/SourceList'
import { SourceFactTree } from '../vault/SourceFactTree'
import { CurriculumStudio } from '../curriculum/CurriculumStudio'
import { ScriptStudio } from '../scripts/ScriptStudio'
import { MediaStudio } from '../media/MediaStudio'
import { PresentationStudio } from '../presentation/PresentationStudio'
import { CreateProjectModal } from '../projects/CreateProjectModal'
import { ProjectVisionModal } from '../projects/ProjectVisionModal'
import { ExpressWizard } from '../wizard/ExpressWizard'
import { AutonomousPipelineModal } from '../wizard/AutonomousPipelineModal'
import { ToastContainer } from '../ui/Toast'
import { Header } from './Header'

export const WorkspaceLayout: React.FC = () => {
  const [activeModule, setActiveModule] = useState<
    'vault' | 'curriculum' | 'script' | 'media' | 'presentation'
  >('vault')
  const [vaultLayout, setVaultLayout] = useState<'tree' | 'split'>('tree')
  const [selectedTopicForCurriculum, setSelectedTopicForCurriculum] = useState<string | undefined>(undefined)
  const [selectedEpisodeForScript, setSelectedEpisodeForScript] = useState<{
    episode: VideoEpisode
    arcId?: string
  } | null>(null)
  const [sources, setSources] = useState<SourceMetadata[]>([])
  const [facts, setFacts] = useState<AtomicFact[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [currentGuide, setCurrentGuide] = useState<SynthesizedGuide | null>(null)
  const [extractingSourceId, setExtractingSourceId] = useState<string | null>(null)
  const [loadingSources, setLoadingSources] = useState(false)
  const [loadingFacts, setLoadingFacts] = useState(false)
  const [activeRespondingModel, setActiveRespondingModel] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Background synthesis job state (persists across tab navigation, views, and page reloads)
  const [activeSynthesisJob, setActiveSynthesisJob] = useState<SynthesisJob | null>(() => {
    try {
      const cached = localStorage.getItem('yt_active_synthesis_job')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.status === 'running') return parsed
      }
    } catch {}
    return null
  })

  // Live second ticker for active background synthesis job
  useEffect(() => {
    if (!activeSynthesisJob || activeSynthesisJob.status !== 'running') return
    const interval = setInterval(() => {
      setActiveSynthesisJob((prev) => {
        if (!prev || prev.status !== 'running') return prev
        const elapsed = Math.max(0, Math.floor((Date.now() - prev.startedAt) / 1000))
        return {
          ...prev,
          elapsedSeconds: elapsed,
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSynthesisJob?.status, activeSynthesisJob?.startedAt])

  // Project Sandbox & Vision state
  const [activeProject, setActiveProject] = useState<ProjectSummary | null>(null)
  const [activeVision, setActiveVision] = useState<ProjectVision | null>(null)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false)
  const [projectsRefreshTrigger, setProjectsRefreshTrigger] = useState(0)

  // Experience Mode: Express (4-step linear flow) vs Studio (full 5-module workspace)
  const [experienceMode, setExperienceModeState] = useState<'express' | 'studio'>(() => {
    try {
      const stored = localStorage.getItem('yt_experience_mode')
      if (stored === 'express' || stored === 'studio') return stored
    } catch {}
    return 'express'
  })

  // Auto-Pilot Autonomous Pipeline modal state (triggered from Header or Express Wizard)
  const [isAutoPilotModalOpen, setIsAutoPilotModalOpen] = useState(false)

  const handleToggleExperienceMode = useCallback((mode: 'express' | 'studio') => {
    setExperienceModeState(mode)
    try {
      localStorage.setItem('yt_experience_mode', mode)
    } catch {}
  }, [])

  const MODULE_TO_STAGE: Record<string, 1 | 2 | 3 | 4> = {
    vault: 1,
    curriculum: 2,
    script: 3,
    presentation: 4,
    media: 1,
  }

  const STAGE_TO_MODULE: Record<1 | 2 | 3 | 4, 'vault' | 'curriculum' | 'script' | 'presentation'> = {
    1: 'vault',
    2: 'curriculum',
    3: 'script',
    4: 'presentation',
  }

  // Shared script selection across Script Studio and Slide Engine
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)

  const handleNavigateToPresentation = useCallback((scriptId?: string) => {
    if (scriptId) {
      setSelectedScriptId(scriptId)
    }
    setActiveModule('presentation')
  }, [])


  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastItem = { ...toast, id }
    setToasts((prev) => [...prev, newToast])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 6000)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Load all facts
  const loadFacts = useCallback(async () => {
    setLoadingFacts(true)
    try {
      const data = await api.listFacts()
      setFacts(data)
      return data
    } catch (err) {
      console.error('Failed to load facts:', err)
      return []
    } finally {
      setLoadingFacts(false)
    }
  }, [])

  // Load all sources and compute fact counts
  const loadSources = useCallback(async (allFacts?: AtomicFact[]) => {
    setLoadingSources(true)
    try {
      const sourcesData = await api.listSources()
      const factsList = allFacts ?? (await api.listFacts().catch(() => []))

      // Enrich sources with fact counts
      const enriched = sourcesData.map((src) => {
        const count = factsList.filter((f) => f.source_id === src.source_id).length
        return {
          ...src,
          fact_count: count,
        }
      })
      setSources(enriched)
    } catch (err) {
      console.error('Failed to load sources:', err)
      addToast({
        type: 'error',
        title: 'Backend Error',
        message: 'Failed to connect to backend vault storage.',
      })
    } finally {
      setLoadingSources(false)
    }
  }, [addToast])

  // Select active project and reload sandbox data
  const handleSelectProject = useCallback(async (project: ProjectSummary | null) => {
    if (!project) {
      setActiveProject(null)
      setActiveVision(null)
      api.setActiveProjectId(null)
      setSelectedSourceId(null)
      setCurrentGuide(null)
      setSelectedTopicForCurriculum(undefined)
      setSelectedEpisodeForScript(null)
      setSources([])
      setFacts([])
      setRefreshTrigger((prev) => prev + 1)
      return
    }
    setActiveProject(project)
    api.setActiveProjectId(project.project_id)
    try {
      const vision = await api.getProject(project.project_id)
      setActiveVision(vision)
    } catch {
      setActiveVision({
        project_id: project.project_id,
        title: project.title,
        target_audience: project.target_audience,
        technical_depth: project.technical_depth,
        core_thesis: project.core_thesis || '',
        target_format: project.target_format,
        tone_and_style: 'Trench practitioner scar-tissue tone. Direct, no-fluff engineering insights.',
        key_questions_to_answer: [],
        created_at: project.created_at,
        updated_at: project.updated_at,
      })
    }
    // Clear selections from previous project
    setSelectedSourceId(null)
    setCurrentGuide(null)
    setSelectedTopicForCurriculum(undefined)
    setSelectedEpisodeForScript(null)
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  const handleProjectCreated = useCallback((project: ProjectVision) => {
    const summary: ProjectSummary = {
      project_id: project.project_id,
      title: project.title,
      target_audience: project.target_audience,
      technical_depth: project.technical_depth,
      target_format: project.target_format,
      core_thesis: project.core_thesis,
      sources_count: 0,
      facts_count: 0,
      arcs_count: 0,
      scripts_count: 0,
      decks_count: 0,
      created_at: project.created_at,
      updated_at: project.updated_at,
    }
    setActiveProject(summary)
    setActiveVision(project)
    api.setActiveProjectId(project.project_id)
    setProjectsRefreshTrigger((prev) => prev + 1)
    setSelectedSourceId(null)
    setCurrentGuide(null)
    setSelectedTopicForCurriculum(undefined)
    setSelectedEpisodeForScript(null)
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  const handleProjectUpdated = useCallback((project: ProjectVision) => {
    setActiveVision(project)
    setActiveProject((prev) =>
      prev
        ? {
            ...prev,
            title: project.title,
            target_audience: project.target_audience,
            technical_depth: project.technical_depth,
            target_format: project.target_format,
            core_thesis: project.core_thesis,
            updated_at: project.updated_at,
          }
        : null
    )
    setProjectsRefreshTrigger((prev) => prev + 1)
  }, [])

  // Initial load
  useEffect(() => {
    const init = async () => {
      // Check for project sandboxes first
      try {
        const projectList = await api.listProjects()
        if (projectList.length > 0) {
          const storedId = api.getActiveProjectId()
          const matched = projectList.find((p) => p.project_id === storedId) || projectList[0]
          await handleSelectProject(matched)
          return
        }
      } catch (err) {
        console.warn('Projects listing check on startup:', err)
      }

      const factsData = await loadFacts()
      await loadSources(factsData)
      try {
        const guides = await api.listGuides()
        if (guides.length > 0) {
          const latest = await api.getGuide(guides[0].guide_id)
          setCurrentGuide(latest)
          if (latest.ai_metadata?.model) {
            setActiveRespondingModel(latest.ai_metadata.model)
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load synthesized guides on startup.'
        addToast({
          type: 'error',
          title: 'Guide Load Error',
          message: msg,
        })
      }
    }
    init()
  }, [handleSelectProject, loadFacts, loadSources, addToast])

  // Reload sandbox data whenever refreshTrigger increments
  useEffect(() => {
    if (refreshTrigger > 0) {
      const reload = async () => {
        const factsData = await loadFacts()
        await loadSources(factsData)
        try {
          const guides = await api.listGuides()
          if (guides.length > 0) {
            const latest = await api.getGuide(guides[0].guide_id)
            setCurrentGuide(latest)
          } else {
            setCurrentGuide(null)
          }
        } catch {
          setCurrentGuide(null)
        }
      }
      reload()
    }
  }, [refreshTrigger, loadFacts, loadSources])


  // Extract facts trigger with AI Failover Telemetry
  const handleExtractFacts = async (sourceId: string) => {
    setExtractingSourceId(sourceId)
    try {
      const result = await api.extractFacts({ source_id: sourceId })

      // Telemetry & Failover Toast
      if (result.ai_metadata?.fallback_occurred) {
        addToast({
          type: 'fallback',
          title: '⚡ Model Switched: Failover Active',
          message: `Primary provider failed. Extracted ${result.facts.length} facts using fallback model.`,
          model: result.ai_metadata.model,
          reason: result.ai_metadata.fallback_reason,
          durationMs: result.ai_metadata.duration_ms,
        })
      } else if (result.ai_metadata?.model) {
        addToast({
          type: 'success',
          title: 'Facts Extracted to Vault',
          message: `Extracted ${result.facts.length} atomic facts from ${sourceId}.`,
          model: result.ai_metadata.model,
          durationMs: result.ai_metadata.duration_ms,
        })
      } else {
        addToast({
          type: 'success',
          title: 'Facts Extracted',
          message: `Extracted ${result.facts.length} atomic facts from ${sourceId}.`,
        })
      }

      if (result.ai_metadata?.model) {
        setActiveRespondingModel(result.ai_metadata.model)
      }

      const updatedFacts = await loadFacts()
      await loadSources(updatedFacts)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fact extraction failed.'
      addToast({
        type: 'error',
        title: 'Extraction Error',
        message: msg,
      })
    } finally {
      setExtractingSourceId(null)
    }
  }

  // Handle synthesized guide with AI Failover Telemetry
  const handleGuideSynthesized = useCallback((guide: SynthesizedGuide) => {
    setCurrentGuide(guide)

    if (guide.ai_metadata?.fallback_occurred) {
      addToast({
        type: 'fallback',
        title: '⚡ Model Switched: Failover Active',
        message: `Primary provider failed. Guide synthesized successfully using fallback model.`,
        model: guide.ai_metadata.model,
        reason: guide.ai_metadata.fallback_reason,
        durationMs: guide.ai_metadata.duration_ms,
      })
    } else if (guide.ai_metadata?.model) {
      addToast({
        type: 'success',
        title: 'Research Guide Synthesized',
        message: `Generated guide for "${guide.topic}" with Obsidian citations.`,
        model: guide.ai_metadata.model,
        durationMs: guide.ai_metadata.duration_ms,
      })
    } else {
      addToast({
        type: 'success',
        title: 'Guide Synthesized',
        message: `Generated research guide for "${guide.topic}".`,
      })
    }

    if (guide.ai_metadata?.model) {
      setActiveRespondingModel(guide.ai_metadata.model)
    }
  }, [addToast])

  // Polling ref to clear any background interval
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const handleDismissFailedJob = useCallback(() => {
    stopPolling()
    setActiveSynthesisJob(null)
    try {
      localStorage.removeItem('yt_active_synthesis_job')
    } catch {}
  }, [stopPolling])

  const startPollingJob = useCallback(
    (jobId: string) => {
      stopPolling()
      pollTimerRef.current = setInterval(async () => {
        try {
          const status = await api.getSynthesisJob(jobId)
          if (status.status === 'completed' && status.guide) {
            stopPolling()
            setActiveSynthesisJob(null)
            try {
              localStorage.removeItem('yt_active_synthesis_job')
            } catch {}
            handleGuideSynthesized(status.guide)
          } else if (status.status === 'failed') {
            stopPolling()
            try {
              localStorage.removeItem('yt_active_synthesis_job')
            } catch {}
            setActiveSynthesisJob({
              id: status.job_id,
              job_id: status.job_id,
              project_id: status.project_id,
              topic: status.topic,
              detailLevel: status.detail_level,
              targetAudience: status.target_audience,
              startedAt: status.started_at * 1000,
              status: 'failed',
              elapsedSeconds: status.elapsed_seconds,
              error: status.error || 'Guide synthesis failed.',
            })
            addToast({
              type: 'error',
              title: 'Synthesis Failed',
              message: status.error || 'Guide synthesis failed in the background.',
            })
          } else {
            // Running: update elapsed seconds and sync to localStorage
            setActiveSynthesisJob((prev) => {
              const updated: SynthesisJob = {
                id: status.job_id,
                job_id: status.job_id,
                project_id: status.project_id,
                topic: status.topic,
                detailLevel: status.detail_level,
                targetAudience: status.target_audience,
                startedAt: prev?.startedAt || status.started_at * 1000,
                status: 'running',
                elapsedSeconds: status.elapsed_seconds,
              }
              try {
                localStorage.setItem('yt_active_synthesis_job', JSON.stringify(updated))
              } catch {}
              return updated
            })
          }
        } catch (err) {
          console.warn('Synthesis job polling error:', err)
        }
      }, 1500)
    },
    [handleGuideSynthesized, stopPolling, addToast]
  )

  // Global background guide synthesis (persists across tab changes and browser reloads)
  const handleStartSynthesis = useCallback(
    async (req: ContextExpansionRequest) => {
      try {
        const jobStatus = await api.startSynthesisJob(req)
        const job: SynthesisJob = {
          id: jobStatus.job_id,
          job_id: jobStatus.job_id,
          project_id: jobStatus.project_id,
          topic: jobStatus.topic,
          detailLevel: jobStatus.detail_level,
          targetAudience: jobStatus.target_audience,
          startedAt: jobStatus.started_at * 1000,
          status: 'running',
          elapsedSeconds: jobStatus.elapsed_seconds,
        }
        setActiveSynthesisJob(job)
        try {
          localStorage.setItem('yt_active_synthesis_job', JSON.stringify(job))
        } catch {}

        addToast({
          type: 'info',
          title: 'Guide Synthesis Started',
          message: `Synthesizing "${req.topic}" in background. Safe to navigate between tabs or reload the page.`,
        })

        startPollingJob(jobStatus.job_id)
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Guide synthesis failed to launch.'
        addToast({
          type: 'error',
          title: 'Synthesis Launch Failed',
          message: errorMsg,
        })
        throw err
      }
    },
    [addToast, startPollingJob]
  )

  // Reconnect to active background job on mount or project switch
  useEffect(() => {
    const checkActiveJob = async () => {
      let cachedJobId: string | null = null
      try {
        const raw = localStorage.getItem('yt_active_synthesis_job')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.job_id) cachedJobId = parsed.job_id
          else if (parsed?.id) cachedJobId = parsed.id
        }
      } catch {}

      try {
        const active = await api.getActiveSynthesisJob(activeProject?.project_id)
        if (active && active.status === 'running') {
          const jobObj: SynthesisJob = {
            id: active.job_id,
            job_id: active.job_id,
            project_id: active.project_id,
            topic: active.topic,
            detailLevel: active.detail_level,
            targetAudience: active.target_audience,
            startedAt: active.started_at * 1000,
            status: 'running',
            elapsedSeconds: active.elapsed_seconds,
          }
          setActiveSynthesisJob(jobObj)
          try {
            localStorage.setItem('yt_active_synthesis_job', JSON.stringify(jobObj))
          } catch {}
          startPollingJob(active.job_id)
          return
        } else if (active && active.status === 'completed' && active.guide && (cachedJobId === active.job_id || !cachedJobId)) {
          try {
            localStorage.removeItem('yt_active_synthesis_job')
          } catch {}
          setActiveSynthesisJob(null)
          handleGuideSynthesized(active.guide)
          return
        }
      } catch (err) {
        console.warn('Checking active synthesis job on reconnect:', err)
      }

      if (cachedJobId) {
        try {
          const job = await api.getSynthesisJob(cachedJobId)
          if (job.status === 'running') {
            startPollingJob(job.job_id)
          } else if (job.status === 'completed' && job.guide) {
            try {
              localStorage.removeItem('yt_active_synthesis_job')
            } catch {}
            setActiveSynthesisJob(null)
            handleGuideSynthesized(job.guide)
          } else {
            try {
              localStorage.removeItem('yt_active_synthesis_job')
            } catch {}
            setActiveSynthesisJob(null)
          }
        } catch {
          try {
            localStorage.removeItem('yt_active_synthesis_job')
          } catch {}
        }
      }
    }

    checkActiveJob()
    return () => stopPolling()
  }, [activeProject?.project_id, handleGuideSynthesized, startPollingJob, stopPolling])

  // Delete source
  const handleDeleteSource = async (sourceId: string) => {
    try {
      await api.deleteSource(sourceId)
      addToast({
        type: 'info',
        title: 'Source Removed',
        message: `Source ${sourceId} deleted from vault.`,
      })
      if (selectedSourceId === sourceId) {
        setSelectedSourceId(null)
      }
      const updatedFacts = await loadFacts()
      await loadSources(updatedFacts)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete source.'
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    }
  }

  // Delete fact
  const handleDeleteFact = async (factId: string) => {
    try {
      await api.deleteFact(factId)
      addToast({
        type: 'info',
        title: 'Fact Note Deleted',
        message: `Fact ${factId} deleted from vault.`,
      })
      const updatedFacts = await loadFacts()
      await loadSources(updatedFacts)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete fact.'
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    }
  }

  // Delete guide
  const handleDeleteGuide = async (guideId: string) => {
    try {
      await api.deleteGuide(guideId)
      addToast({
        type: 'info',
        title: 'Guide Deleted',
        message: `Guide ${guideId} removed.`,
      })
      if (currentGuide?.guide_id === guideId) {
        setCurrentGuide(null)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete guide.'
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    }
  }

  const handleRefreshAll = useCallback(async () => {
    const factsData = await loadFacts()
    await loadSources(factsData)
    setRefreshTrigger((prev) => prev + 1)
  }, [loadFacts, loadSources])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090a0f] text-zinc-100 relative">
      {/* Top Bar Header with Module Tabs, Project Selector and Dynamic Model Display */}
      <Header
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        activeModel={activeRespondingModel}
        vaultLayout={vaultLayout}
        onToggleVaultLayout={setVaultLayout}
        activeProject={activeProject}
        onSelectProject={handleSelectProject}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        onOpenProjectVision={() => setIsVisionModalOpen(true)}
        projectsRefreshTrigger={projectsRefreshTrigger}
        onRefreshAll={async () => {
          await handleRefreshAll()
          addToast({
            type: 'info',
            title: 'Vault Refreshed',
            message: 'All sources, facts, and providers synchronized.',
          })
        }}
        onToast={addToast}
        activeSynthesisJob={activeSynthesisJob}
        experienceMode={experienceMode}
        onToggleExperienceMode={handleToggleExperienceMode}
        onTriggerAutoPilot={() => setIsAutoPilotModalOpen(true)}
      />

      {/* Lightweight Toast Notification System */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Empty State when no Project Arc is active */}
      {activeProject === null ? (
        <main className="flex-1 flex items-center justify-center p-6 bg-[#090a0f]">
          <div className="max-w-md w-full p-8 rounded-2xl bg-[#11131c] border border-[#232738] text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-white tracking-tight">No Project Arc Active</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                All research sources, atomic facts, curriculum arcs, scripts, and presentation decks are strictly isolated within project workspaces.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateProjectOpen(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project Arc</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const sample = await api.seedSampleProject()
                    addToast({
                      type: 'success',
                      title: 'Cloudflare SRE Sample Loaded',
                      message: `Loaded "${sample.title}".`,
                    })
                    const list = await api.listProjects()
                    const found = list.find((p) => p.project_id === sample.project_id) || list[0]
                    if (found) {
                      await handleSelectProject(found)
                    }
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Failed to seed sample project'
                    addToast({ type: 'error', title: 'Seed Failed', message: msg })
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-[#181b28] hover:bg-[#202538] border border-[#262a3f] text-zinc-300 hover:text-white text-xs font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Load SRE Sample</span>
              </button>
            </div>
          </div>
        </main>
      ) : experienceMode === 'express' ? (
        /* Express Mode: Streamlined 4-stage Linear Flow */
        <main className="flex-1 overflow-hidden">
          <ExpressWizard
            activeProject={activeProject}
            activeVision={activeVision}
            sources={sources}
            facts={facts}
            onRefreshAll={handleRefreshAll}
            onAddToast={addToast}
            onToggleExperienceMode={handleToggleExperienceMode}
            selectedScriptId={selectedScriptId}
            onSelectScriptId={setSelectedScriptId}
            onOpenProjectVision={() => setIsVisionModalOpen(true)}
            activeStage={MODULE_TO_STAGE[activeModule] || 1}
            onSelectStage={(stage) => setActiveModule(STAGE_TO_MODULE[stage])}
          />
        </main>
      ) : activeModule === 'vault' ? (
        vaultLayout === 'tree' ? (
          /* 2-Column Unified Collapsible Tree View (Merged Sources & Facts + Context Extender) */
          <main
            key={activeProject?.project_id || 'vault-tree-default'}
            className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#202436]"
          >
            {/* Left Column: Source & Fact Tree Explorer (44% on desktop) */}
            <section className="w-full md:w-[46%] lg:w-[44%] flex flex-col h-1/2 md:h-full shrink-0">
              <SourceFactTree
                sources={sources}
                facts={facts}
                selectedSourceId={selectedSourceId}
                onSelectSource={setSelectedSourceId}
                onExtractFacts={handleExtractFacts}
                onDeleteSource={handleDeleteSource}
                onDeleteFact={handleDeleteFact}
                onRefreshSources={() => loadSources()}
                extractingSourceId={extractingSourceId}
                isLoadingSources={loadingSources}
                isLoadingFacts={loadingFacts}
                onToast={addToast}
                onRefreshAll={handleRefreshAll}
              />
            </section>

            {/* Right Column: Context Extender (56% on desktop) */}
            <section className="w-full md:w-[54%] lg:w-[56%] flex flex-col h-1/2 md:h-full">
              <ContextExtender
                sources={sources}
                selectedSourceId={selectedSourceId}
                currentGuide={currentGuide}
                onGuideSynthesized={handleGuideSynthesized}
                onDeleteGuide={handleDeleteGuide}
                onToast={addToast}
                onPlanCurriculum={(topic) => {
                  setSelectedTopicForCurriculum(topic)
                  setActiveModule('curriculum')
                }}
                activeSynthesisJob={activeSynthesisJob}
                onStartSynthesis={handleStartSynthesis}
                onDismissFailedJob={handleDismissFailedJob}
              />
            </section>
          </main>
        ) : (
          /* Classic 3-Column Split View */
          <main
            key={activeProject?.project_id || 'vault-split-default'}
            className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#202436]"
          >
            {/* Column 1: Sources (24% on desktop) */}
            <section className="w-full md:w-[26%] lg:w-[24%] flex flex-col h-1/3 md:h-full shrink-0">
              <SourceList
                sources={sources}
                selectedSourceId={selectedSourceId}
                onSelectSource={setSelectedSourceId}
                onExtractFacts={handleExtractFacts}
                onDeleteSource={handleDeleteSource}
                onRefreshSources={() => loadSources()}
                extractingSourceId={extractingSourceId}
                isLoading={loadingSources}
                onToast={addToast}
                onRefreshAll={handleRefreshAll}
              />
            </section>

            {/* Column 2: Fact Inspector (42% on desktop) */}
            <section className="w-full md:w-[40%] lg:w-[42%] flex flex-col h-1/3 md:h-full">
              <FactInspector
                facts={facts}
                sources={sources}
                selectedSourceId={selectedSourceId}
                onSelectSource={setSelectedSourceId}
                onExtractFacts={handleExtractFacts}
                onDeleteFact={handleDeleteFact}
                extractingSourceId={extractingSourceId}
                isLoading={loadingFacts}
              />
            </section>

            {/* Column 3: Context Extender (34% on desktop) */}
            <section className="w-full md:w-[34%] lg:w-[34%] flex flex-col h-1/3 md:h-full">
              <ContextExtender
                sources={sources}
                selectedSourceId={selectedSourceId}
                currentGuide={currentGuide}
                onGuideSynthesized={handleGuideSynthesized}
                onDeleteGuide={handleDeleteGuide}
                onToast={addToast}
                onPlanCurriculum={(topic) => {
                  setSelectedTopicForCurriculum(topic)
                  setActiveModule('curriculum')
                }}
                activeSynthesisJob={activeSynthesisJob}
                onStartSynthesis={handleStartSynthesis}
                onDismissFailedJob={handleDismissFailedJob}
              />
            </section>
          </main>
        )
      ) : activeModule === 'curriculum' ? (
        /* Module 2: Curriculum Arc Studio */
        <main
          key={activeProject?.project_id || 'curriculum-default'}
          className="flex-1 overflow-hidden"
        >
          <CurriculumStudio
            sources={sources}
            onAddToast={addToast}
            onModelUsed={(model) => setActiveRespondingModel(model)}
            onCreateScript={(episode, arcId) => {
              setSelectedEpisodeForScript({ episode, arcId })
              setActiveModule('script')
            }}
            initialTopic={selectedTopicForCurriculum}
            activeProject={activeProject}
            activeVision={activeVision}
            facts={facts}
            experienceMode={experienceMode}
          />
        </main>
      ) : activeModule === 'script' ? (
        /* Module 3: Script Studio & Teleprompter */
        <main
          key={activeProject?.project_id || 'script-default'}
          className="flex-1 overflow-hidden"
        >
          <ScriptStudio
            preSelectedEpisode={selectedEpisodeForScript}
            sources={sources}
            onAddToast={addToast}
            onModelUsed={(model) => setActiveRespondingModel(model)}
            onNavigateToCurriculum={() => setActiveModule('curriculum')}
            onNavigateToMedia={() => setActiveModule('media')}
            selectedScriptId={selectedScriptId}
            onSelectScriptId={setSelectedScriptId}
            onNavigateToPresentation={handleNavigateToPresentation}
          />
        </main>
      ) : activeModule === 'media' ? (
        /* Module 4: A/V Sync, Audio Smoothing & Jump-Cut Editor */
        <main
          key={activeProject?.project_id || 'media-default'}
          className="flex-1 overflow-hidden"
        >
          <MediaStudio onToast={addToast} />
        </main>
      ) : (
        /* Module 5: Slide Engine & Synced Presentation Studio */
        <main
          key={activeProject?.project_id || 'presentation-default'}
          className="flex-1 overflow-hidden"
        >
          <PresentationStudio
            onToast={addToast}
            refreshTrigger={refreshTrigger}
            activeScriptId={selectedScriptId}
          />
        </main>
      )}

      {/* Project Sandbox Creation Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={handleProjectCreated}
        onToast={addToast}
      />

      {/* Project Vision & North Star Modal */}
      <ProjectVisionModal
        isOpen={isVisionModalOpen}
        onClose={() => setIsVisionModalOpen(false)}
        project={activeVision}
        onProjectUpdated={handleProjectUpdated}
        onToast={addToast}
      />

      {/* Autonomous Pipeline Runner Modal */}
      <AutonomousPipelineModal
        isOpen={isAutoPilotModalOpen}
        onClose={() => setIsAutoPilotModalOpen(false)}
        activeProject={activeProject}
        activeVision={activeVision}
        sources={sources}
        onComplete={async (data) => {
          setSelectedScriptId(data.script.script_id)
          await handleRefreshAll()
          setActiveModule('presentation')
          setIsAutoPilotModalOpen(false)
        }}
        onToast={addToast}
      />
    </div>
  )
}
