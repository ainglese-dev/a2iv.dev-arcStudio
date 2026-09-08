import React, { useState } from 'react'
import {
  X,
  Compass,
  Sparkles,
  Wrench,
  Brain,
  TrendingUp,
  ShieldAlert,
  AlertCircle,
  Loader2,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  PractitionerLens,
  SeedPractitionerRequest,
  SeedPractitionerResponse,
  ToastItem,
} from '../../types'

interface SeedPractitionerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (resp: SeedPractitionerResponse) => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

interface PresetTopic {
  id: string
  label: string
  icon: string
  topic: string
  lens: PractitionerLens
  targetAudience: string
  tag: string
}

const PRESETS: PresetTopic[] = [
  {
    id: 'containerlab',
    label: 'Containerlab CI/CD',
    icon: '🛠️',
    topic: 'Containerlab in CI/CD pipelines: Real lessons from broken production fabrics',
    lens: 'tech_devops_incident',
    targetAudience: 'Senior Network Automation & DevOps Engineers',
    tag: 'DevOps & Incidents',
  },
  {
    id: 'english_plateau',
    label: 'English Speaking Plateau',
    icon: '🧠',
    topic: 'Intermediate English speaking plateau: Overcoming translation latency and hesitation',
    lens: 'adult_learning_plateau',
    targetAudience: 'Adult Professional Learners',
    tag: 'Adult Learning',
  },
  {
    id: 'cash_drag',
    label: 'Cash Drag vs DCA',
    icon: '📈',
    topic: 'Cash drag vs Lump Sum vs DCA: Mathematical vs Psychological Risk in Volatile Markets',
    lens: 'finance_risk_psychology',
    targetAudience: 'Self-Directed Investors & Financial Practitioners',
    tag: 'Finance & Risk',
  },
]

interface LensOption {
  value: PractitionerLens
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
}

const LENS_OPTIONS: LensOption[] = [
  {
    value: 'tech_devops_incident',
    title: 'DevOps & Incident Post-Mortems',
    description: 'Outage root causes, architectural trade-offs, configuration debt, and production edge cases',
    icon: Wrench,
    badge: 'Technical / SRE',
  },
  {
    value: 'adult_learning_plateau',
    title: 'Adult Learning & Plateaus',
    description: 'Cognitive overload, subconscious translation latency, deliberate practice feedback loops',
    icon: Brain,
    badge: 'Cognitive / Skills',
  },
  {
    value: 'finance_risk_psychology',
    title: 'Finance & Risk Trade-offs',
    description: 'Market volatility drag, sequence-of-returns risk, DCA psychology vs lump-sum math',
    icon: TrendingUp,
    badge: 'Behavioral / Quant',
  },
  {
    value: 'general_practitioner',
    title: 'Real-World Field Engineering',
    description: 'Battle-tested practitioner trade-offs, hidden implementation gotchas, anti-marketing reality',
    icon: ShieldAlert,
    badge: 'Production Reality',
  },
]

export const SeedPractitionerModal: React.FC<SeedPractitionerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onToast,
}) => {
  const [topic, setTopic] = useState('')
  const [lens, setLens] = useState<PractitionerLens>('tech_devops_incident')
  const [targetAudience, setTargetAudience] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleApplyPreset = (preset: PresetTopic) => {
    setActivePresetId(preset.id)
    setTopic(preset.topic)
    setLens(preset.lens)
    setTargetAudience(preset.targetAudience)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      setError('Please provide a research topic or choose a preset.')
      return
    }

    setIsGenerating(true)
    setError(null)

    const payload: SeedPractitionerRequest = {
      topic: topic.trim(),
      lens,
      target_audience: targetAudience.trim() || undefined,
    }

    try {
      const response = await api.seedPractitioner(payload)

      if (onToast) {
        if (response.ai_metadata?.fallback_occurred) {
          onToast({
            type: 'fallback',
            title: '⚡ Failover Active: Practitioner Seeded',
            message: `Primary provider failed. Generated brief & ${response.facts.length} atomic facts using ${response.ai_metadata.model || 'fallback'}.`,
            model: response.ai_metadata.model,
            reason: response.ai_metadata.fallback_reason,
            durationMs: response.ai_metadata.duration_ms,
          })
        } else {
          onToast({
            type: 'success',
            title: 'Practitioner Research Seeded',
            message: `Created source "${response.source.title}" and extracted ${response.facts.length} grounded facts.`,
            model: response.ai_metadata?.model,
            durationMs: response.ai_metadata?.duration_ms,
          })
        }
      }

      onSuccess(response)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to seed practitioner research.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#10121b] border border-[#262c42] rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#21263b] flex items-center justify-between bg-[#141724]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">Seed Practitioner Research</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  Anti-Marketing Grounding
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Synthesize battle-tested field reality, production pitfalls, and verified atomic facts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#202538] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2.5 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* 1-Click Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Quick Research Presets</span>
              </label>
              <span className="text-[11px] text-zinc-500">1-click populated</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-2.5 rounded-lg border text-left transition-all group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40'
                        : 'bg-[#141726] border-[#22273c] hover:border-indigo-500/30 hover:bg-[#181d2f]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{preset.icon}</span>
                      <span
                        className={`text-xs font-medium truncate ${
                          isSelected ? 'text-indigo-200' : 'text-zinc-300 group-hover:text-zinc-100'
                        }`}
                      >
                        {preset.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono block mt-1">
                      {preset.tag}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Research Topic Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Topic & Practice Focus <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">
                {topic.length} characters
              </span>
            </div>
            <textarea
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value)
                setActivePresetId(null)
              }}
              disabled={isGenerating}
              rows={3}
              placeholder="e.g. Containerlab in CI/CD pipelines: Real lessons from broken production fabrics, or Raft consensus edge cases under network partitions"
              className="w-full bg-[#141726] border border-[#252b40] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none disabled:opacity-50"
            />
            <p className="text-[11px] text-zinc-500 mt-1">
              Be specific about the trade-offs, operational friction, or failure modes to analyze.
            </p>
          </div>

          {/* Domain Lens Selector */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-2">
              Domain Lens (Perspective & Heuristics)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LENS_OPTIONS.map((opt) => {
                const IconComponent = opt.icon
                const isSelected = lens === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => {
                      setLens(opt.value)
                      setActivePresetId(null)
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/70 ring-1 ring-indigo-500/30'
                        : 'bg-[#141726] border-[#22273c] hover:border-[#323955] hover:bg-[#171b2d]'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      <div
                        className={`p-1.5 rounded shrink-0 ${
                          isSelected
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-zinc-800/60 text-zinc-400'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-medium truncate ${
                              isSelected ? 'text-indigo-200 font-semibold' : 'text-zinc-200'
                            }`}
                          >
                            {opt.title}
                          </span>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono block">
                          {opt.badge}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                      {opt.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Target Audience (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Target Audience <span className="text-zinc-500 text-[11px]">(Optional)</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">Role / Persona</span>
            </div>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => {
                setTargetAudience(e.target.value)
                setActivePresetId(null)
              }}
              disabled={isGenerating}
              placeholder="e.g. Senior Network Automation & DevOps Engineers, Staff Architects"
              className="w-full bg-[#141726] border border-[#252b40] rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />
          </div>

          {/* Anti-marketing explanation banner */}
          <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg flex items-start gap-2 text-[11px] text-zinc-400">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
            <span>
              The AI router enforces an anti-marketing heuristic: buzzwords are banned, production failure
              cases are highlighted, and atomic facts are paired with direct citations.
            </span>
          </div>

          {/* Loading Animation / Status */}
          {isGenerating && (
            <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-lg flex items-center gap-3 text-xs text-indigo-200 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
              <div>
                <span className="font-semibold block">Synthesizing Field Research Brief...</span>
                <span className="text-[11px] text-indigo-300/80">
                  Consulting practitioner patterns, verifying trade-offs, and extracting atomic facts
                </span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#21263b]">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-[#1f2438] rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:text-zinc-500 text-white rounded-md text-xs font-medium transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synthesize Grounded Reality</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
