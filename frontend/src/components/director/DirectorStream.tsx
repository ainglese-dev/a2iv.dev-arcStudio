import React, { useEffect, useRef, useState } from 'react'
import {
  Sparkles,
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  Cpu,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  AtomicFact,
  PractitionerLens,
  PresentationDeck,
  ProjectSummary,
  ProjectVision,
  ToastItem,
  VideoArc,
  VideoScript,
} from '../../types'
import { DirectorsCutCanvas } from './DirectorsCutCanvas'

export interface DirectorStreamProps {
  activeProject: ProjectSummary | null
  activeVision: ProjectVision | null
  onRefreshProjects: () => Promise<void>
  onToast: (toast: Omit<ToastItem, 'id'>) => void
}

type StreamState = 'spark' | 'autopilot' | 'directors_cut'

type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

interface StreamMilestone {
  id: number
  title: string
  detail: string
  status: StepStatus
  elapsedSeconds: number
  summary?: string
  error?: string
}

const INITIAL_MILESTONES: StreamMilestone[] = [
  {
    id: 1,
    title: 'Ingesting & Extracting Atomic Facts',
    detail: 'Extracting technical facts, exact quotes, and practitioner scars',
    status: 'pending',
    elapsedSeconds: 0,
  },
  {
    id: 2,
    title: 'Architecting 3-Tier Curriculum Arc',
    detail: 'Structuring 6-episode progressive journey (Fundamentals, Advanced, Production Lab)',
    status: 'pending',
    elapsedSeconds: 0,
  },
  {
    id: 3,
    title: 'Authoring 750–1,000w Spoken Script',
    detail: 'Drafting teleprompter script for Episode 1 with timing cues',
    status: 'pending',
    elapsedSeconds: 0,
  },
  {
    id: 4,
    title: 'Synthesizing 16:9 Dual-Variant Slide Deck',
    detail: 'Building synchronized 16:9 slides with Terminal Dark & Clean Infographic variants',
    status: 'pending',
    elapsedSeconds: 0,
  },
]

export interface CreativeAngleOption {
  id: PractitionerLens
  label: string
  hint: string
}

const CREATIVE_ANGLES: CreativeAngleOption[] = [
  {
    id: 'auto',
    label: 'Auto Angle',
    hint: 'AI auto-detects optimal domain and narrative structure',
  },
  {
    id: 'deep_dive',
    label: 'Deep Dive',
    hint: 'First-principles mechanics, underlying theory & architecture',
  },
  {
    id: 'lessons_pitfalls',
    label: 'Pitfalls & Gotchas',
    hint: 'Real-world failure modes, edge cases & non-obvious traps',
  },
  {
    id: 'case_study',
    label: 'Case Study',
    hint: 'Chronological tension, real stakes & pivotal decisions',
  },
]

const SUGGESTED_PROMPTS = [
  {
    title: "🎬 Nolan's Non-Linear Chronology: Structural Tension & Cross-Cutting",
    desc: 'Memento & Dunkirk subjective cross-cutting structures and cognitive synchronization',
    lens: 'case_study' as PractitionerLens,
    isDemo: true,
  },
  {
    title: '📈 Tulip Mania 1637: Futures Contracts & Liquidity Freezes',
    desc: '1637 Amsterdam futures panic, contract defaults & systemic liquidity cascade',
    lens: 'case_study' as PractitionerLens,
  },
  {
    title: '🏛 The Algorithmic Trolley Problem: Crash Optimization Ethics',
    desc: 'Autonomous vehicle collision ethics, sensor fusion failure modes & moral tradeoffs',
    lens: 'lessons_pitfalls' as PractitionerLens,
  },
  {
    title: '🏙 Copenhagen 5-Finger Urbanism: Transit-Oriented Development',
    desc: 'Post-war regional transit corridors, green wedge preservation & spatial planning',
    lens: 'deep_dive' as PractitionerLens,
  },
]

interface CanvasErrorBoundaryProps {
  children: React.ReactNode
  onReset: () => void
}

interface CanvasErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class CanvasErrorBoundary extends React.Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Canvas rendering error caught by ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-2xl mx-auto my-12 p-8 rounded-2xl bg-[#11131c] border border-rose-500/30 text-center space-y-4 shadow-2xl animate-in fade-in">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-white">Deliverable Rendering Error</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              An unexpected error occurred while rendering the presentation deck or curriculum deliverables. This may indicate malformed AI output.
            </p>
            {this.state.error && (
              <p className="text-xs font-mono text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/20 max-w-lg mx-auto break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              this.props.onReset()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Director's Prompt</span>
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export const DirectorStream: React.FC<DirectorStreamProps> = ({
  activeProject,
  activeVision,
  onRefreshProjects,
  onToast,
}) => {
  const [streamState, setStreamState] = useState<StreamState>('spark')
  const [promptText, setPromptText] = useState('')
  const [selectedLens, setSelectedLens] = useState<PractitionerLens>('auto')
  const [milestones, setMilestones] = useState<StreamMilestone[]>(INITIAL_MILESTONES)
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState(0)
  const [activeModel, setActiveModel] = useState('gemini-3.8-flash')
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Generated package deliverables
  const [generatedArc, setGeneratedArc] = useState<VideoArc | null>(null)
  const [generatedScript, setGeneratedScript] = useState<VideoScript | null>(null)
  const [generatedDeck, setGeneratedDeck] = useState<PresentationDeck | null>(null)
  const [groundedFacts, setGroundedFacts] = useState<AtomicFact[]>([])

  // Loading state when synchronizing project
  const [isLoadingProject, setIsLoadingProject] = useState(false)

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Synchronize project deliverables whenever activeProject changes
  useEffect(() => {
    let isMounted = true

    const syncProjectAssets = async () => {
      if (!activeProject) {
        setGeneratedArc(null)
        setGeneratedScript(null)
        setGeneratedDeck(null)
        setGroundedFacts([])
        setStreamState('spark')
        return
      }

      setIsLoadingProject(true)
      setGeneratedArc(null)
      setGeneratedScript(null)
      setGeneratedDeck(null)
      setGroundedFacts([])

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      try {
        api.setActiveProjectId(activeProject.project_id)

        // Fetch project facts, curricula, scripts, and presentations in parallel
        const [facts, arcs, scripts, decks] = await Promise.all([
          api.listFacts().catch(() => []),
          api.listCurricula().catch(() => []),
          api.listScripts().catch(() => []),
          api.listPresentationDecks().catch(() => []),
        ])

        if (!isMounted) return

        setGroundedFacts(facts || [])

        let fullArc: VideoArc | null = null
        if (arcs && arcs.length > 0) {
          try {
            fullArc = await api.getCurriculum(arcs[0].arc_id)
          } catch {
            fullArc = null
          }
        }

        let fullScript: VideoScript | null = null
        if (scripts && scripts.length > 0) {
          try {
            fullScript = await api.getScript(scripts[0].script_id)
          } catch {
            fullScript = null
          }
        }

        let fullDeck: PresentationDeck | null = null
        if (decks && decks.length > 0) {
          try {
            fullDeck = await api.getPresentation(decks[0].deck_id)
          } catch {
            fullDeck = null
          }
        }

        if (!isMounted) return

        setGeneratedArc(fullArc)
        setGeneratedScript(fullScript)
        setGeneratedDeck(fullDeck)

        // If the project already has an arc, script, and slide deck, show the Director's Cut!
        if (fullArc && fullScript && fullDeck) {
          setStreamState('directors_cut')
        } else {
          // Otherwise, show The Spark ready to direct this project
          setPromptText('')
          setMilestones(INITIAL_MILESTONES)
          setStreamState('spark')
        }
      } catch (err) {
        console.error('Failed syncing project assets:', err)
        if (isMounted) {
          setStreamState('spark')
        }
      } finally {
        if (isMounted) {
          setIsLoadingProject(false)
        }
      }
    }

    syncProjectAssets()

    return () => {
      isMounted = false
    }
  }, [activeProject?.project_id])

  const updateMilestone = (index: number, updates: Partial<StreamMilestone>) => {
    setMilestones((prev) =>
      prev.map((m, idx) => (idx === index ? { ...m, ...updates } : m))
    )
  }

  const startMilestoneTimer = (index: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setMilestones((prev) =>
        prev.map((m, idx) =>
          idx === index ? { ...m, ...elapsedSecondsCheck(m) } : m
        )
      )
    }, 1000)
  }

  const elapsedSecondsCheck = (m: StreamMilestone) => ({
    elapsedSeconds: m.elapsedSeconds + 1,
  })

  const stopMilestoneTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const toggleCardExpanded = (index: number) => {
    setExpandedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  // Primary Action: Start directing video package
  const handleStartDirecting = async (initialTopic?: string, initialLens?: PractitionerLens) => {
    const topicToDirect = (initialTopic || promptText || activeVision?.title || activeProject?.title || '').trim()

    if (!topicToDirect) {
      onToast({
        type: 'error',
        title: 'Topic Required',
        message: 'Please enter a video topic or select one of the suggested prompts.',
      })
      return
    }

    const lensToUse = initialLens || selectedLens

    // If no active project, auto-create a sandbox for clean vault isolation
    if (!activeProject) {
      try {
        const newProj = await api.createProject({
          title: topicToDirect,
          target_audience: 'Creative Thinkers & Practitioners',
          technical_depth: 'practitioner_deep',
          core_thesis: topicToDirect,
          target_format: 'multi_episode_arc',
          tone_and_style: 'Insightful, analytical, and craft-focused tone with concrete real-world examples.',
        })
        api.setActiveProjectId(newProj.project_id)
        await onRefreshProjects()
      } catch (err) {
        console.warn('Sandbox auto-creation notice:', err)
      }
    }

    setStreamState('autopilot')
    setMilestones(INITIAL_MILESTONES)
    setCurrentMilestoneIndex(0)
    executePipeline(0, topicToDirect, lensToUse)
  }

  const executePipeline = async (
    fromStep = 0,
    overrideTopic?: string,
    overrideLens?: PractitionerLens
  ) => {
    const topic = (overrideTopic || promptText || activeVision?.title || activeProject?.title || 'Creative Video Production').trim()
    const targetAudience = activeVision?.target_audience || activeProject?.target_audience || 'Creative Thinkers & Practitioners'
    const lens = overrideLens || selectedLens

    let arc = generatedArc
    let script = generatedScript
    let deck = generatedDeck

    // MILESTONE 1: Ingesting & Extracting Atomic Facts
    if (fromStep <= 0) {
      setCurrentMilestoneIndex(0)
      updateMilestone(0, { status: 'running', elapsedSeconds: 0, error: undefined })
      startMilestoneTimer(0)

      try {
        const sources = await api.listSources().catch(() => [])
        if (sources.length > 0) {
          const extractResult = await api.extractFacts({
            source_id: sources[0].source_id,
          })
          if (extractResult.ai_metadata?.model) {
            setActiveModel(extractResult.ai_metadata.model)
          }
          setGroundedFacts(extractResult.facts)
          updateMilestone(0, {
            status: 'completed',
            summary: `Extracted ${extractResult.facts.length} atomic facts with verbatim quotes from "${sources[0].title}".`,
          })
        } else {
          const seedResult = await api.seedPractitioner({
            topic,
            lens,
            target_audience: targetAudience,
          })
          if (seedResult.ai_metadata?.model) {
            setActiveModel(seedResult.ai_metadata.model)
          }
          setGroundedFacts(seedResult.facts)
          updateMilestone(0, {
            status: 'completed',
            summary: `Seeded ${seedResult.facts.length} practitioner scar facts and negative constraints for "${topic}".`,
          })
        }
        stopMilestoneTimer()
      } catch (err: unknown) {
        stopMilestoneTimer()
        const msg = err instanceof Error ? err.message : 'Fact extraction failed.'
        updateMilestone(0, { status: 'failed', error: msg })
        return
      }
    }

    // MILESTONE 2: Architecting 3-Tier Curriculum Arc
    if (fromStep <= 1) {
      setCurrentMilestoneIndex(1)
      updateMilestone(1, { status: 'running', elapsedSeconds: 0, error: undefined })
      startMilestoneTimer(1)

      try {
        const genArc = await api.generateCurriculum({
          topic,
          target_episode_count: 6,
          target_audience: targetAudience,
        })
        arc = genArc
        setGeneratedArc(genArc)
        if (genArc.ai_metadata?.model) {
          setActiveModel(genArc.ai_metadata.model)
        }
        updateMilestone(1, {
          status: 'completed',
          summary: `Curriculum arc generated: "${genArc.title}" (${genArc.episodes.length} progressive episodes).`,
        })
        stopMilestoneTimer()
      } catch (err: unknown) {
        stopMilestoneTimer()
        const msg = err instanceof Error ? err.message : 'Curriculum generation failed.'
        updateMilestone(1, { status: 'failed', error: msg })
        return
      }
    }

    // MILESTONE 3: Authoring 750–1,000w Spoken Script
    if (fromStep <= 2) {
      setCurrentMilestoneIndex(2)
      updateMilestone(2, { status: 'running', elapsedSeconds: 0, error: undefined })
      startMilestoneTimer(2)

      try {
        const ep1 = arc?.episodes?.[0]
        const epId = ep1?.episode_id || 'ep_01'
        const genScript = await api.generateScript({
          episode_id: epId,
          arc_id: arc?.arc_id || null,
          wpm_target: 145,
          speaking_style: 'Trench practitioner engineer with high information density',
        })
        script = genScript
        setGeneratedScript(genScript)
        if (genScript.ai_metadata?.model) {
          setActiveModel(genScript.ai_metadata.model)
        }
        updateMilestone(2, {
          status: 'completed',
          summary: `Teleprompter script authored: ${genScript.total_word_count} words (~${genScript.estimated_speaking_minutes.toFixed(1)} mins spoken).`,
        })
        stopMilestoneTimer()
      } catch (err: unknown) {
        stopMilestoneTimer()
        const msg = err instanceof Error ? err.message : 'Script authoring failed.'
        updateMilestone(2, { status: 'failed', error: msg })
        return
      }
    }

    // MILESTONE 4: Synthesizing 16:9 Dual-Variant Slide Deck
    if (fromStep <= 3) {
      setCurrentMilestoneIndex(3)
      updateMilestone(3, { status: 'running', elapsedSeconds: 0, error: undefined })
      startMilestoneTimer(3)

      try {
        if (!script?.script_id) {
          throw new Error('Script generation missing script_id.')
        }
        const genDeck = await api.generatePresentation(script.script_id)
        deck = genDeck
        setGeneratedDeck(genDeck)
        if (genDeck.ai_metadata?.model) {
          setActiveModel(genDeck.ai_metadata.model)
        }
        updateMilestone(3, {
          status: 'completed',
          summary: `16:9 Slide deck synthesized: ${genDeck.total_slides} slides with dual visual variants.`,
        })
        stopMilestoneTimer()
      } catch (err: unknown) {
        stopMilestoneTimer()
        const msg = err instanceof Error ? err.message : 'Presentation slide synthesis failed.'
        updateMilestone(3, { status: 'failed', error: msg })
        return
      }
    }

    // If all 4 milestones passed, transition to State 3 ("The Director's Cut")
    if (arc && script && deck) {
      // Ensure all facts are loaded for the canvas drawer
      try {
        const latestFacts = await api.listFacts()
        if (latestFacts.length > 0) {
          setGroundedFacts(latestFacts)
        }
      } catch {}

      onToast({
        type: 'success',
        title: "Director's Cut Ready",
        message: `Synthesized complete package for "${script.title}".`,
      })

      // Short delay for visual completion, then transition
      setTimeout(() => {
        setStreamState('directors_cut')
      }, 600)
    }
  }

  const handleRetryStep = (stepIndex: number) => {
    executePipeline(stepIndex)
  }

  const handleSelectSuggestedPrompt = (prompt: (typeof SUGGESTED_PROMPTS)[0]) => {
    setPromptText(prompt.title)
    setSelectedLens(prompt.lens)
    handleStartDirecting(prompt.title, prompt.lens)
  }

  const handleResetToPrompt = () => {
    stopMilestoneTimer()
    setStreamState('spark')
    setMilestones(INITIAL_MILESTONES)
  }

  // Loading state while synchronizing active project deliverables
  if (isLoadingProject) {
    return (
      <div className="director-loading-state w-full max-w-3xl mx-auto py-28 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200">
        <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-white">Loading Project Deliverables...</p>
          <p className="text-xs font-mono text-zinc-400">
            {activeVision?.title || activeProject?.title || 'Synchronizing workspace'}
          </p>
        </div>
      </div>
    )
  }

  // STATE 3: "The Director's Cut"
  if (streamState === 'directors_cut' && generatedArc && generatedScript && generatedDeck) {
    return (
      <CanvasErrorBoundary onReset={handleResetToPrompt}>
        <DirectorsCutCanvas
          key={activeProject?.project_id || generatedScript.script_id}
          arc={generatedArc}
          script={generatedScript}
          deck={generatedDeck}
          facts={groundedFacts}
          activeProject={activeProject}
          onResetToPrompt={handleResetToPrompt}
          onToast={onToast}
        />
      </CanvasErrorBoundary>
    )
  }

  // STATE 2: "Auto-Pilot Production Stream" (Live Pipeline)
  if (streamState === 'autopilot') {
    const completedCount = milestones.filter((m) => m.status === 'completed').length
    const progressPct = Math.round((completedCount / milestones.length) * 100)

    return (
      <div className="director-stream-pipeline w-full max-w-3xl mx-auto flex flex-col space-y-6 py-6 animate-in fade-in duration-300">
        {/* Stream Status Header */}
        <div className="bg-[#0f121e] border border-[#232942] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0 shadow-sm">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  Directing Video Package...
                </h2>
                <p className="text-xs text-zinc-400 font-mono line-clamp-1 mt-0.5" title={promptText || activeVision?.title || activeProject?.title || 'Production Pipeline'}>
                  {promptText || activeVision?.title || activeProject?.title || 'Production Pipeline'}
                </p>
              </div>
            </div>

            {/* Organic Metadata Badges with generous breathing room */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-950/60 text-indigo-300 border border-indigo-700/60 text-xs font-mono font-medium shadow-sm whitespace-nowrap">
                <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-zinc-400">AI:</span>
                <span className="text-emerald-400 font-semibold tracking-wide">{activeModel}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#151928] text-zinc-300 border border-[#232a3f] text-xs font-mono whitespace-nowrap shadow-sm">
                <span className="text-zinc-400">Step</span>
                <span className="font-semibold text-white">{currentMilestoneIndex + 1}</span>
                <span className="text-zinc-500">of 4</span>
                <span className="text-zinc-600 px-0.5">&bull;</span>
                <span className="text-indigo-400 font-semibold">{progressPct}%</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-[#171b2e] rounded-full overflow-hidden border border-[#22273d]">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 transition-all duration-500 rounded-full shadow-sm shadow-indigo-500/50"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Milestone Vertical Cards Feed */}
        <div className="space-y-3.5">
          {milestones.map((milestone, idx) => {
            const isRunning = milestone.status === 'running'
            const isCompleted = milestone.status === 'completed'
            const isFailed = milestone.status === 'failed'
            const isPending = milestone.status === 'pending'
            const isExpanded = expandedCards[idx] ?? true

            return (
              <div
                key={milestone.id}
                className={`milestone-card rounded-xl border transition-all duration-200 overflow-hidden ${
                  isRunning
                    ? 'bg-[#121628] border-indigo-500/70 shadow-lg shadow-indigo-950/30'
                    : isCompleted
                    ? 'bg-[#0e111d] border-emerald-900/40'
                    : isFailed
                    ? 'bg-[#180f14] border-rose-800/50'
                    : 'bg-[#0a0c16] border-[#1d2236] opacity-65'
                }`}
              >
                {/* Milestone Card Header */}
                <div
                  onClick={() => toggleCardExpanded(idx)}
                  className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    {/* Status Badge Icon */}
                    <div className="shrink-0">
                      {isRunning && (
                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      )}
                      {isCompleted && (
                        <div className="w-7 h-7 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {isFailed && (
                        <div className="w-7 h-7 rounded-full bg-rose-950 text-rose-400 border border-rose-700/60 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      )}
                      {isPending && (
                        <div className="w-7 h-7 rounded-full bg-[#181d30] text-zinc-500 border border-[#262e49] flex items-center justify-center font-mono text-xs font-bold">
                          {milestone.id}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-zinc-500">
                          Step {milestone.id}
                        </span>
                        <h3 className="text-sm font-semibold text-white">
                          {milestone.title}
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {milestone.detail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {milestone.elapsedSeconds > 0 && (
                      <span className="font-mono text-xs text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {milestone.elapsedSeconds}s
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Milestone Card Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#1d2338]/60 text-xs">
                    {milestone.summary && (
                      <div className="p-3 bg-[#0a0d17] border border-[#1b2136] rounded-lg text-emerald-300 font-mono text-xs">
                        {milestone.summary}
                      </div>
                    )}

                    {isFailed && milestone.error && (
                      <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs space-y-2">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Milestone Error</span>
                        </div>
                        <p className="font-mono text-[11px]">{milestone.error}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRetryStep(idx)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Retry Milestone</span>
                        </button>
                      </div>
                    )}

                    {isRunning && (
                      <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs py-1">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>Synthesizing live output in Obsidian vault...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Abort / Reset Action */}
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleResetToPrompt}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cancel and return to topic input</span>
          </button>
        </div>
      </div>
    )
  }

  // STATE 1: "The Spark" (Input)
  return (
    <div className="director-spark-container w-full max-w-3xl mx-auto flex flex-col items-center justify-center py-10 sm:py-16 space-y-8 animate-in fade-in duration-300">
      {/* Centered Spotlight Heading */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>DIRECTOR'S CUT PIPELINE</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-sans">
          What video are we directing today?
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto">
          One topic prompt yields a complete video package: atomic facts, 6-episode curriculum arc, 750–1,000w spoken teleprompter script, and 16:9 dual-variant slides.
        </p>
      </div>

      {/* Main Spotlight Input Box */}
      <div className="w-full bg-[#0d101c] border border-[#232a44] rounded-2xl p-4 sm:p-5 shadow-2xl shadow-indigo-950/20 space-y-4 focus-within:border-indigo-500/80 transition-all">
        <div className="relative">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handleStartDirecting()
              }
            }}
            placeholder="What video are we directing today? Enter topic, creative angle, or paste source notes..."
            rows={3}
            className="w-full bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Input Bar Bottom Actions: Universal Creative Angles + Primary Direct Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#1f253d]">
          {/* Universal Creative Angles */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto py-0.5">
            <span className="text-zinc-500 font-mono text-[11px] hidden sm:inline mr-0.5">Angle:</span>
            <div className="inline-flex p-0.5 rounded-lg bg-[#121526] border border-[#232842]">
              {CREATIVE_ANGLES.map((angle) => {
                const isSelected = selectedLens === angle.id
                return (
                  <button
                    key={angle.id}
                    type="button"
                    onClick={() => setSelectedLens(angle.id)}
                    title={angle.hint}
                    className={`director-angle-pill px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer select-none flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-900/40'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1f36]'
                    }`}
                  >
                    {angle.id === 'auto' && (
                      <Sparkles className={`w-3 h-3 ${isSelected ? 'text-indigo-200' : 'text-indigo-400'}`} />
                    )}
                    <span>{angle.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => handleStartDirecting()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Direct Video Package</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>

      {/* 1-Click Suggested Prompts */}
      <div className="w-full space-y-3">
        <div className="text-center">
          <span className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
            Or launch with 1-click suggested prompts
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTED_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSuggestedPrompt(item)}
              className="p-3.5 bg-[#0e111d] hover:bg-[#15192c] border border-[#20263e] hover:border-indigo-500/50 rounded-xl text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 text-xs font-bold text-zinc-200 group-hover:text-indigo-300 transition-colors">
                  <div className="flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </div>
                  {item.isDemo && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/35 uppercase tracking-wider shrink-0">
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                  {item.desc}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-[#181d30] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="text-indigo-400/80">1-Click Direct &rarr;</span>
                <span className="text-zinc-600">4 Milestones</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
