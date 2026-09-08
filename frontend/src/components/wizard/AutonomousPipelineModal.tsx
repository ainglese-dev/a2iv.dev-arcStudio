import React, { useEffect, useRef, useState } from 'react'
import {
  Zap,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Circle,
  X,
  ArrowRight,
  RotateCcw,
  Cpu,
  Clock,
  Check,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  PresentationDeck,
  ProjectSummary,
  ProjectVision,
  SourceDocument,
  ToastItem,
  VideoArc,
  VideoScript,
} from '../../types'

export interface AutonomousPipelineModalProps {
  isOpen: boolean
  onClose: () => void
  activeProject: ProjectSummary | null
  activeVision: ProjectVision | null
  sources: SourceDocument[]
  onComplete: (data: { arc: VideoArc; script: VideoScript; deck: PresentationDeck }) => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

type StepStatus = 'pending' | 'running' | 'completed' | 'failed'

interface PipelineStep {
  id: number
  title: string
  detail: string
  status: StepStatus
  elapsedSeconds: number
  summary?: string
  error?: string
}

const INITIAL_STEPS: PipelineStep[] = [
  {
    id: 1,
    title: 'Ingest & Extract Atomic Facts',
    detail: 'Extracting technical facts, exact quotes, and practitioner scars from project sources',
    status: 'pending',
    elapsedSeconds: 0,
  },
  {
    id: 2,
    title: 'Architect 3-Tier Curriculum Arc',
    detail: 'Structuring 6-episode progressive journey (Fundamentals, Advanced, Production Lab)',
    status: 'pending',
    elapsedSeconds: 0,
  },
  {
    id: 3,
    title: 'Draft Spoken Teleprompter Script',
    detail: 'Drafting 750–1,000w teleprompter script for Episode 1 with timing cues',
    status: 'pending',
    elapsedSeconds: 0,
  },
  {
    id: 4,
    title: 'Synthesize 16:9 Dual-Variant Slide Deck',
    detail: 'Building synchronized 16:9 slides with Terminal Dark & Clean Infographic variants',
    status: 'pending',
    elapsedSeconds: 0,
  },
]

export const AutonomousPipelineModal: React.FC<AutonomousPipelineModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  activeVision,
  sources,
  onComplete,
  onToast,
}) => {
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS)
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0)
  const [pipelineState, setPipelineState] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const [activeModel, setActiveModel] = useState<string>('gemini-3.8-flash')
  const [generatedArc, setGeneratedArc] = useState<VideoArc | null>(null)
  const [generatedScript, setGeneratedScript] = useState<VideoScript | null>(null)
  const [generatedDeck, setGeneratedDeck] = useState<PresentationDeck | null>(null)

  // Timer ref for active step
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStartedRef = useRef(false)

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      if (pipelineState === 'idle' && !hasStartedRef.current) {
        hasStartedRef.current = true
        startPipeline()
      }
    } else {
      // Clear timers on close
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current)
        stepTimerRef.current = null
      }
      hasStartedRef.current = false
    }
  }, [isOpen])

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current)
      }
    }
  }, [])

  const updateStep = (index: number, updates: Partial<PipelineStep>) => {
    setSteps((prev) =>
      prev.map((step, idx) => (idx === index ? { ...step, ...updates } : step))
    )
  }

  const startStepTimer = (stepIndex: number) => {
    if (stepTimerRef.current) clearInterval(stepTimerRef.current)
    stepTimerRef.current = setInterval(() => {
      setSteps((prev) =>
        prev.map((step, idx) =>
          idx === stepIndex ? { ...step, elapsedSeconds: step.elapsedSeconds + 1 } : step
        )
      )
    }, 1000)
  }

  const stopStepTimer = () => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current)
      stepTimerRef.current = null
    }
  }

  const startPipeline = async (fromStepIndex = 0) => {
    setPipelineState('running')
    setCurrentStepIndex(fromStepIndex)

    let arc = generatedArc
    let script = generatedScript
    let deck = generatedDeck

    const projectTitle =
      activeVision?.title || activeProject?.title || 'Modern Software Engineering'
    const targetAudience =
      activeVision?.target_audience || activeProject?.target_audience || 'Senior Engineers'

    // STEP 1: Ingest & Extract Atomic Facts
    if (fromStepIndex <= 0) {
      setCurrentStepIndex(0)
      updateStep(0, { status: 'running', elapsedSeconds: 0, error: undefined })
      startStepTimer(0)

      try {
        if (sources.length > 0) {
          const extractResult = await api.extractFacts({
            source_id: sources[0].source_id,
          })
          if (extractResult.ai_metadata?.model) {
            setActiveModel(extractResult.ai_metadata.model)
          }
          updateStep(0, {
            status: 'completed',
            summary: `Extracted ${extractResult.facts.length} facts from "${sources[0].title}".`,
          })
        } else {
          const seedResult = await api.seedPractitioner({
            topic: projectTitle,
            lens: 'tech_devops_incident',
            target_audience: targetAudience,
          })
          if (seedResult.ai_metadata?.model) {
            setActiveModel(seedResult.ai_metadata.model)
          }
          updateStep(0, {
            status: 'completed',
            summary: `Seeded ${seedResult.facts.length} incident facts and constraints.`,
          })
        }
        stopStepTimer()
      } catch (err: unknown) {
        stopStepTimer()
        const msg = err instanceof Error ? err.message : 'Fact extraction failed.'
        updateStep(0, { status: 'failed', error: msg })
        setPipelineState('failed')
        return
      }
    }

    // STEP 2: Architect 3-Tier Curriculum Arc
    if (fromStepIndex <= 1) {
      setCurrentStepIndex(1)
      updateStep(1, { status: 'running', elapsedSeconds: 0, error: undefined })
      startStepTimer(1)

      try {
        const genArc = await api.generateCurriculum({
          topic: projectTitle,
          target_episode_count: 6,
          target_audience: targetAudience,
        })
        arc = genArc
        setGeneratedArc(genArc)
        if (genArc.ai_metadata?.model) {
          setActiveModel(genArc.ai_metadata.model)
        }
        updateStep(1, {
          status: 'completed',
          summary: `Curriculum arc generated: "${genArc.title}" (${genArc.episodes.length} episodes).`,
        })
        stopStepTimer()
      } catch (err: unknown) {
        stopStepTimer()
        const msg = err instanceof Error ? err.message : 'Curriculum generation failed.'
        updateStep(1, { status: 'failed', error: msg })
        setPipelineState('failed')
        return
      }
    }

    // STEP 3: Draft Spoken Teleprompter Script
    if (fromStepIndex <= 2) {
      setCurrentStepIndex(2)
      updateStep(2, { status: 'running', elapsedSeconds: 0, error: undefined })
      startStepTimer(2)

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
        updateStep(2, {
          status: 'completed',
          summary: `Script drafted: ${genScript.total_word_count} words (~${genScript.estimated_speaking_minutes.toFixed(1)} mins spoken).`,
        })
        stopStepTimer()
      } catch (err: unknown) {
        stopStepTimer()
        const msg = err instanceof Error ? err.message : 'Script generation failed.'
        updateStep(2, { status: 'failed', error: msg })
        setPipelineState('failed')
        return
      }
    }

    // STEP 4: Synthesize 16:9 Dual-Variant Slide Deck
    if (fromStepIndex <= 3) {
      setCurrentStepIndex(3)
      updateStep(3, { status: 'running', elapsedSeconds: 0, error: undefined })
      startStepTimer(3)

      try {
        if (!script?.script_id) {
          throw new Error('Script generation output missing script_id.')
        }
        const genDeck = await api.generatePresentation(script.script_id)
        deck = genDeck
        setGeneratedDeck(genDeck)
        if (genDeck.ai_metadata?.model) {
          setActiveModel(genDeck.ai_metadata.model)
        }
        updateStep(3, {
          status: 'completed',
          summary: `Slide deck ready: ${genDeck.total_slides} slides with dual visual variants.`,
        })
        stopStepTimer()
      } catch (err: unknown) {
        stopStepTimer()
        const msg = err instanceof Error ? err.message : 'Presentation generation failed.'
        updateStep(3, { status: 'failed', error: msg })
        setPipelineState('failed')
        return
      }
    }

    // Completed successfully
    setPipelineState('completed')
    if (arc && script && deck) {
      onToast?.({
        type: 'success',
        title: 'Auto-Pilot Complete',
        message: `Generated full production package: "${arc.title}".`,
      })
    }
  }

  const handleRetryStep = () => {
    // Retry from the failed step
    const failedIndex = steps.findIndex((s) => s.status === 'failed')
    if (failedIndex >= 0) {
      startPipeline(failedIndex)
    } else {
      startPipeline(0)
    }
  }

  const handleFinish = () => {
    if (generatedArc && generatedScript && generatedDeck) {
      onComplete({
        arc: generatedArc,
        script: generatedScript,
        deck: generatedDeck,
      })
    }
    onClose()
  }

  if (!isOpen) return null

  // Calculate progress percentage
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const progressPct = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pipeline-modal-backdrop bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl autonomous-pipeline-modal bg-[#0e111a] border border-[#272c40] text-zinc-100 rounded-2xl shadow-2xl shadow-indigo-950/20 overflow-hidden flex flex-col">
        {/* Top Gradient Flare */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-[#22273b] bg-[#121522]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Zap className="w-4 h-4 fill-indigo-400/20" />
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                Auto-Pilot Express Pipeline
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  Autonomous
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 pl-10 truncate max-w-md">
              Project:{' '}
              <span className="text-zinc-200 font-medium">
                {activeVision?.title || activeProject?.title || 'Active Project Arc'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Model Telemetry Tag */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181b2a] border border-[#272c44] text-zinc-300 text-[11px] font-mono">
              <Cpu className="w-3 h-3 text-indigo-400" />
              <span className="text-zinc-400">AI:</span>
              <span className="text-emerald-400 font-medium">{activeModel}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={pipelineState === 'running'}
              className="p-1.5 rounded-lg bg-[#181b2a] hover:bg-[#202538] text-zinc-300 hover:text-white border border-[#272c40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5 font-mono">
            <span>PIPELINE PROGRESS</span>
            <span className="text-indigo-300 font-semibold">{progressPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#141724] overflow-hidden border border-[#232738]">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 4 Animated Steps */}
        <div className="p-6 space-y-3 flex-1 overflow-y-auto max-h-[420px]">
          {steps.map((step, idx) => {
            const isCurrent = currentStepIndex === idx && step.status === 'running'
            const isDone = step.status === 'completed'
            const isFailed = step.status === 'failed'

            return (
              <div
                key={step.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-indigo-950/30 border-indigo-500/50 shadow-sm text-indigo-300'
                    : isDone
                    ? 'bg-[#141726] border-[#22273c] text-zinc-200'
                    : isFailed
                    ? 'bg-rose-950/30 border-rose-500/50 text-rose-300'
                    : 'bg-[#0f111c] border-[#1d2133] text-zinc-400'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Status Icon */}
                    <div className="mt-0.5 shrink-0">
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : step.status === 'running' ? (
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      ) : step.status === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-zinc-700" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            isDone
                              ? 'text-white'
                              : isCurrent
                              ? 'text-indigo-300'
                              : isFailed
                              ? 'text-rose-300'
                              : 'text-zinc-400'
                          }`}
                        >
                          Step {step.id}: {step.title}
                        </span>
                        {isDone && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">{step.detail}</p>
                      {step.summary && (
                        <p className="text-[11px] text-emerald-300/90 font-mono pt-1">
                          ✓ {step.summary}
                        </p>
                      )}
                      {step.error && (
                        <p className="text-[11px] text-rose-300/90 font-mono pt-1">
                          ✕ {step.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Elapsed Timer */}
                  <div className="shrink-0 text-[10px] font-mono flex items-center gap-1">
                    {step.status === 'running' && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#181b2a] border border-[#272c40] text-zinc-300">
                        <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
                        <span className="text-indigo-300 font-semibold">{step.elapsedSeconds}s</span>
                      </span>
                    )}
                    {step.status === 'completed' && (
                      <span className="px-1.5 py-0.5 rounded bg-[#181b2a] border border-[#272c40] text-zinc-300">
                        {step.elapsedSeconds}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-[#121522] border-t border-[#22273b] flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            {pipelineState === 'running' ? (
              <span className="flex items-center gap-2 text-indigo-300 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                Executing Step {currentStepIndex + 1} of 4...
              </span>
            ) : pipelineState === 'completed' ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="w-4 h-4" /> Ready for broadcast & slide deck preview
              </span>
            ) : pipelineState === 'failed' ? (
              <span className="text-rose-400 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Step execution failed
              </span>
            ) : (
              <span>Ready to start auto-pilot pipeline</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {pipelineState === 'failed' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-[#181b2a] hover:bg-[#202538] text-zinc-300 hover:text-white border border-[#272c40] text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRetryStep}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Step</span>
                </button>
              </>
            ) : pipelineState === 'completed' ? (
              <button
                type="button"
                onClick={handleFinish}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>View Production Package</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#181b2a] text-zinc-400 border border-[#272c40] text-xs font-medium cursor-not-allowed opacity-80"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Running Pipeline...</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
