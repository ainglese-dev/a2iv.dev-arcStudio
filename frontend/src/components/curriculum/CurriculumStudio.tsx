import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../../services/api'
import type {
  AtomicFact,
  GenerateCurriculumRequest,
  ProjectSummary,
  ProjectVision,
  SourceMetadata,
  ToastItem,
  VideoArc,
  VideoArcSummary,
  VideoEpisode,
} from '../../types'
import { ArcGeneratorBar } from './ArcGeneratorBar'
import { ArcPlaylistView } from './ArcPlaylistView'

interface CurriculumStudioProps {
  sources: SourceMetadata[]
  onAddToast: (toast: Omit<ToastItem, 'id'>) => void
  onModelUsed?: (model: string) => void
  onCreateScript?: (episode: VideoEpisode, arcId?: string) => void
  initialTopic?: string
  activeProject?: ProjectSummary | null
  activeVision?: ProjectVision | null
  facts?: AtomicFact[]
  experienceMode?: 'express' | 'studio'
}

export const CurriculumStudio: React.FC<CurriculumStudioProps> = ({
  sources,
  onAddToast,
  onModelUsed,
  onCreateScript,
  initialTopic,
  activeProject,
  activeVision,
  facts,
}) => {
  const [savedArcs, setSavedArcs] = useState<VideoArcSummary[]>([])
  const [activeArc, setActiveArc] = useState<VideoArc | null>(null)
  const [factsMap, setFactsMap] = useState<Record<string, AtomicFact>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingArc, setIsLoadingArc] = useState(false)

  // Fetch facts map for citation evidence popovers
  const loadFacts = useCallback(async () => {
    try {
      const facts = await api.listFacts()
      const map: Record<string, AtomicFact> = {}
      facts.forEach((f) => {
        map[f.fact_id] = f
      })
      setFactsMap(map)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load atomic facts for curriculum.'
      onAddToast({
        type: 'error',
        title: 'Facts Load Failed',
        message: msg,
      })
    }
  }, [onAddToast])

  // Fetch saved curriculum arcs
  const loadArcs = useCallback(async () => {
    try {
      const arcs = await api.listCurricula()
      setSavedArcs(arcs)
      if (arcs.length > 0 && !activeArc) {
        // Load latest arc details
        loadArcDetails(arcs[0].arc_id)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load saved curriculum arcs.'
      onAddToast({
        type: 'error',
        title: 'Curricula Load Failed',
        message: msg,
      })
    }
  }, [activeArc, onAddToast])

  const loadArcDetails = async (arcId: string) => {
    setIsLoadingArc(true)
    try {
      const arc = await api.getCurriculum(arcId)
      setActiveArc(arc)
      if (arc.ai_metadata?.model && onModelUsed) {
        onModelUsed(arc.ai_metadata.model)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load curriculum arc.'
      onAddToast({
        type: 'error',
        title: 'Error Loading Arc',
        message: msg,
      })
    } finally {
      setIsLoadingArc(false)
    }
  }

  useEffect(() => {
    loadFacts()
    loadArcs()
  }, [loadFacts, loadArcs])

  // Handle generation of new video curriculum arc
  const handleGenerate = async (req: GenerateCurriculumRequest) => {
    setIsGenerating(true)
    try {
      const arc = await api.generateCurriculum(req)
      setActiveArc(arc)
      await loadArcs()

      // Model telemetry & failover notification
      if (arc.ai_metadata?.fallback_occurred) {
        onAddToast({
          type: 'fallback',
          title: '⚡ Model Switched: Failover Active',
          message: `Primary provider failed. Curriculum arc "${arc.title}" generated using fallback model.`,
          model: arc.ai_metadata.model,
          reason: arc.ai_metadata.fallback_reason,
          durationMs: arc.ai_metadata.duration_ms,
        })
      } else if (arc.ai_metadata?.model) {
        onAddToast({
          type: 'success',
          title: 'Video Curriculum Arc Generated',
          message: `Curriculum arc "${arc.title}" structured into ${arc.total_episodes} episodes across 3 tiers.`,
          model: arc.ai_metadata.model,
          durationMs: arc.ai_metadata.duration_ms,
        })
      } else {
        onAddToast({
          type: 'success',
          title: 'Video Arc Generated',
          message: `Curriculum arc "${arc.title}" generated successfully.`,
        })
      }

      if (arc.ai_metadata?.model && onModelUsed) {
        onModelUsed(arc.ai_metadata.model)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate curriculum arc.'
      onAddToast({
        type: 'error',
        title: 'Curriculum Generation Failed',
        message: msg,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle 1-click quick generation directly from project vision
  const handleQuickGenerate = () => {
    const topicToUse = activeVision?.title || activeProject?.title || 'Video Curriculum'
    handleGenerate({
      topic: topicToUse,
      target_episode_count: 6,
      target_audience: activeVision?.target_audience || 'Senior Practitioners',
    })
  }

  // Handle deletion of an arc
  const handleDeleteArc = async (arcId: string) => {
    try {
      await api.deleteCurriculum(arcId)
      onAddToast({
        type: 'info',
        title: 'Curriculum Arc Removed',
        message: `Arc note ${arcId} removed from vault.`,
      })
      if (activeArc?.arc_id === arcId) {
        setActiveArc(null)
      }
      loadArcs()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete curriculum arc.'
      onAddToast({
        type: 'error',
        title: 'Delete Failed',
        message: msg,
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0c13] overflow-hidden">
      {/* Generator Input Bar */}
      <ArcGeneratorBar
        sources={sources}
        savedArcs={savedArcs}
        selectedArcId={activeArc?.arc_id || null}
        onSelectArc={loadArcDetails}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        initialTopic={initialTopic}
        activeProject={activeProject}
        activeVision={activeVision}
        facts={facts}
      />

      {/* Main Playlist View Area */}
      <div className="flex-1 overflow-hidden">
        {isLoadingArc ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading curriculum arc...</span>
          </div>
        ) : (
          <ArcPlaylistView
            arc={activeArc}
            factsMap={factsMap}
            onDeleteArc={handleDeleteArc}
            onCreateScript={onCreateScript}
            activeProject={activeProject}
            activeVision={activeVision}
            factsCount={facts?.length || 0}
            onQuickGenerate={handleQuickGenerate}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </div>
  )
}
