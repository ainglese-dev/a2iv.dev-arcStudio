import React, { useCallback, useEffect, useState } from 'react'
import {
  BrainCircuit,
  ListVideo,
  ScrollText,
  MonitorPlay,
  Zap,
  Wrench,
  ChevronRight,
  CheckCircle2,
  Compass,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  AtomicFact,
  PresentationDeck,
  ProjectSummary,
  ProjectVision,
  SourceDocument,
  ToastItem,
  VideoArc,
  VideoEpisode,
  VideoScript,
} from '../../types'
import { AutonomousPipelineModal } from './AutonomousPipelineModal'
import { Stage1Research } from './stages/Stage1Research'
import { Stage2Curriculum } from './stages/Stage2Curriculum'
import { Stage3Script } from './stages/Stage3Script'
import { Stage4Presentation } from './stages/Stage4Presentation'
import { TeleprompterModal } from '../scripts/TeleprompterModal'

export interface ExpressWizardProps {
  activeProject: ProjectSummary | null
  activeVision: ProjectVision | null
  sources: SourceDocument[]
  facts: AtomicFact[]
  onRefreshAll: () => Promise<void> | void
  onAddToast: (toast: Omit<ToastItem, 'id'>) => void
  onToggleExperienceMode: (mode: 'express' | 'studio') => void
  selectedScriptId?: string | null
  onSelectScriptId?: (id: string | null) => void
  onOpenProjectVision?: () => void
  activeStage?: 1 | 2 | 3 | 4
  onSelectStage?: (stage: 1 | 2 | 3 | 4) => void
}

export const ExpressWizard: React.FC<ExpressWizardProps> = ({
  activeProject,
  activeVision,
  sources,
  facts,
  onRefreshAll,
  onAddToast,
  onToggleExperienceMode,
  selectedScriptId,
  onSelectScriptId,
  onOpenProjectVision,
  activeStage: propActiveStage,
  onSelectStage,
}) => {
  const [internalStage, setInternalStage] = useState<1 | 2 | 3 | 4>(propActiveStage || 1)
  const currentStage = propActiveStage || internalStage

  const setStage = useCallback(
    (stage: 1 | 2 | 3 | 4) => {
      setInternalStage(stage)
      onSelectStage?.(stage)
    },
    [onSelectStage]
  )

  // Pipeline modal state
  const [isAutoPilotOpen, setIsAutoPilotOpen] = useState(false)

  // Stage assets state
  const [arc, setArc] = useState<VideoArc | null>(null)
  const [selectedEpisode, setSelectedEpisode] = useState<VideoEpisode | null>(null)
  const [script, setScript] = useState<VideoScript | null>(null)
  const [deck, setDeck] = useState<PresentationDeck | null>(null)
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false)

  // Sync project assets when project changes
  useEffect(() => {
    let isMounted = true

    const loadProjectAssets = async () => {
      if (!activeProject) {
        setArc(null)
        setSelectedEpisode(null)
        setScript(null)
        setDeck(null)
        return
      }

      try {
        // 1. Load latest curriculum arc
        const arcs = await api.listCurricula()
        if (arcs.length > 0 && isMounted) {
          const fullArc = await api.getCurriculum(arcs[0].arc_id)
          setArc(fullArc)
          if (fullArc.episodes && fullArc.episodes.length > 0) {
            setSelectedEpisode(fullArc.episodes[0])
          }
        } else if (isMounted) {
          setArc(null)
          setSelectedEpisode(null)
        }

        // 2. Load latest or selected script
        const scripts = await api.listScripts()
        if (scripts.length > 0 && isMounted) {
          const targetScriptId =
            selectedScriptId && scripts.some((s) => s.script_id === selectedScriptId)
              ? selectedScriptId
              : scripts[0].script_id
          const fullScript = await api.getScript(targetScriptId)
          setScript(fullScript)
          onSelectScriptId?.(fullScript.script_id)
        } else if (isMounted) {
          setScript(null)
        }

        // 3. Load latest presentation deck
        const decks = await api.listPresentationDecks()
        if (decks.length > 0 && isMounted) {
          const fullDeck = await api.getPresentation(decks[0].deck_id)
          setDeck(fullDeck)
        } else if (isMounted) {
          setDeck(null)
        }
      } catch (err) {
        console.warn('Error loading project assets in ExpressWizard:', err)
      }
    }

    loadProjectAssets()

    return () => {
      isMounted = false
    }
  }, [activeProject?.project_id, selectedScriptId])

  // Handle auto-pilot completion
  const handleAutoPilotComplete = useCallback(
    async (data: { arc: VideoArc; script: VideoScript; deck: PresentationDeck }) => {
      setArc(data.arc)
      if (data.arc.episodes && data.arc.episodes.length > 0) {
        setSelectedEpisode(data.arc.episodes[0])
      }
      setScript(data.script)
      setDeck(data.deck)
      onSelectScriptId?.(data.script.script_id)
      await onRefreshAll()
      setStage(4) // Navigate directly to Stage 4 to view final output
    },
    [onRefreshAll, onSelectScriptId, setStage]
  )

  const stepsConfig: {
    stage: 1 | 2 | 3 | 4
    label: string
    sublabel: string
    icon: React.ComponentType<{ className?: string }>
    isCompleted: boolean
  }[] = [
    {
      stage: 1,
      label: '1. Research',
      sublabel: `${facts.length} facts`,
      icon: BrainCircuit,
      isCompleted: facts.length > 0,
    },
    {
      stage: 2,
      label: '2. Curriculum',
      sublabel: arc ? `${arc.total_episodes} eps` : 'Not sequenced',
      icon: ListVideo,
      isCompleted: arc !== null,
    },
    {
      stage: 3,
      label: '3. Script',
      sublabel: script ? `${script.total_word_count}w` : 'Not drafted',
      icon: ScrollText,
      isCompleted: script !== null,
    },
    {
      stage: 4,
      label: '4. Slides',
      sublabel: deck ? `${deck.total_slides} slides` : 'Not generated',
      icon: MonitorPlay,
      isCompleted: deck !== null,
    },
  ]

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#090a0f] text-zinc-100">
      {/* Express Wizard Top Navigation & Action Header */}
      <div className="h-14 px-6 bg-[#0c0e15] border-b border-[#232738] flex items-center justify-between z-20 shrink-0">
        {/* Left: Project North Star Title Tag */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 uppercase font-semibold">
              Express Wizard
            </span>
            <span className="text-xs font-semibold text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
              {activeVision?.title || activeProject?.title || 'Active Project'}
            </span>
          </div>

          {onOpenProjectVision && (
            <button
              type="button"
              onClick={onOpenProjectVision}
              className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 hover:text-indigo-300 font-mono transition-colors cursor-pointer"
              title="Edit Project Vision"
            >
              <Compass className="w-3 h-3 text-indigo-400" />
              <span>Vision</span>
            </button>
          )}
        </div>

        {/* Center: Linear Stage Stepper */}
        <nav
          aria-label="Express workflow stages"
          className="hidden md:flex items-center bg-[#12141f] p-1 rounded-xl border border-[#232738] gap-1"
        >
          {stepsConfig.map((step, idx) => {
            const isActive = currentStage === step.stage
            const StepIcon = step.icon

            return (
              <React.Fragment key={step.stage}>
                <button
                  type="button"
                  onClick={() => setStage(step.stage)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#181b2a]'
                  }`}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                  <span>{step.label}</span>
                  {step.isCompleted && (
                    <CheckCircle2
                      className={`w-3 h-3 ${isActive ? 'text-white' : 'text-emerald-400'}`}
                    />
                  )}
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/60'
                    }`}
                  >
                    {step.sublabel}
                  </span>
                </button>

                {idx < stepsConfig.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0 select-none" />
                )}
              </React.Fragment>
            )
          })}
        </nav>

        {/* Right: Auto-Pilot Button & Exit to Studio */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAutoPilotOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white text-xs font-semibold shadow-md shadow-indigo-950/40 transition-all hover:scale-[1.02] cursor-pointer"
            title="Run end-to-end 4-stage pipeline autonomously"
          >
            <Zap className="w-3.5 h-3.5 fill-white/20" />
            <span>Auto-Pilot Run</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleExperienceMode('studio')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141725] hover:bg-[#1a1e30] border border-[#23273c] text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Switch to full 5-module Studio view"
          >
            <Wrench className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Exit to Studio</span>
          </button>
        </div>
      </div>

      {/* Main Active Stage View Container */}
      <main className="flex-1 overflow-hidden relative">
        {currentStage === 1 ? (
          <Stage1Research
            activeProject={activeProject}
            activeVision={activeVision}
            sources={sources}
            facts={facts}
            onRefresh={onRefreshAll}
            onAdvance={() => setStage(2)}
            onToast={onAddToast}
          />
        ) : currentStage === 2 ? (
          <Stage2Curriculum
            activeProject={activeProject}
            activeVision={activeVision}
            arc={arc}
            onArcChange={setArc}
            selectedEpisode={selectedEpisode}
            onSelectEpisode={setSelectedEpisode}
            onBack={() => setStage(1)}
            onAdvance={() => setStage(3)}
            onToast={onAddToast}
          />
        ) : currentStage === 3 ? (
          <Stage3Script
            activeProject={activeProject}
            activeVision={activeVision}
            selectedEpisode={selectedEpisode}
            arcId={arc?.arc_id}
            script={script}
            onScriptChange={(newScript) => {
              setScript(newScript)
              onSelectScriptId?.(newScript.script_id)
            }}
            onBack={() => setStage(2)}
            onAdvance={() => setStage(4)}
            onToast={onAddToast}
          />
        ) : (
          <Stage4Presentation
            activeProject={activeProject}
            script={script}
            deck={deck}
            onDeckChange={setDeck}
            onBack={() => setStage(3)}
            onOpenTeleprompter={() => setIsTeleprompterOpen(true)}
            onOpenStudio={() => onToggleExperienceMode('studio')}
            onToast={onAddToast}
          />
        )}
      </main>

      {/* Autonomous Pipeline Runner Modal */}
      <AutonomousPipelineModal
        isOpen={isAutoPilotOpen}
        onClose={() => setIsAutoPilotOpen(false)}
        activeProject={activeProject}
        activeVision={activeVision}
        sources={sources}
        onComplete={handleAutoPilotComplete}
        onToast={onAddToast}
      />

      {/* Fullscreen Teleprompter Modal */}
      {script && (
        <TeleprompterModal
          script={script}
          isOpen={isTeleprompterOpen}
          onClose={() => setIsTeleprompterOpen(false)}
          initialWpm={145}
        />
      )}
    </div>
  )
}
