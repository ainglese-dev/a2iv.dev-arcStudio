import React, { useState } from 'react'
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  FolderGit2,
  Radio,
  BookOpen,
  Terminal,
  Cpu,
  Layers,
  HelpCircle,
  Zap,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  CreateProjectRequest,
  ProjectVision,
  TechnicalDepth,
  ToastItem,
  VideoFormatPreset,
} from '../../types'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (project: ProjectVision) => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
}

interface ProjectPreset {
  name: string
  icon: React.ReactNode
  tag: string
  data: CreateProjectRequest
}

const PRESETS: ProjectPreset[] = [
  {
    name: 'Cloudflare SRE Post-Mortem',
    icon: <Radio className="w-3.5 h-3.5 text-amber-400" />,
    tag: 'Deep SRE Incident',
    data: {
      title: 'Cloudflare Control Plane Outage: BGP Leak & Route Flap Damping',
      project_id: 'cloudflare-bgp-outage',
      target_audience: 'Senior SREs, Network Architects, Cloud Infrastructure Engineers',
      technical_depth: 'practitioner_deep',
      target_format: 'deep_dive_standalone',
      core_thesis:
        'How an automated traffic manager generated an invalid routing withdrawal that triggered global BGP route flap damping across 12 PoPs, and why modern edge infrastructure must architect fail-closed safety boundaries.',
      tone_and_style:
        'Trench practitioner scar-tissue tone. Rigorous packet & route analysis, zero marketing fluff, exact RFC references.',
      key_questions_to_answer: [
        'How did the recursive prefix withdrawal bypass pre-commit validation checks?',
        'Why did BGP route flap damping exacerbate the total recovery time by 45 minutes?',
        'What automated killswitches were added to isolate the edge proxy control loop?',
      ],
    },
  },
  {
    name: 'Containerlab Lab Automation',
    icon: <Terminal className="w-3.5 h-3.5 text-indigo-400" />,
    tag: 'Hands-on NetDevOps',
    data: {
      title: 'Automating Multi-Vendor Network Topologies with Containerlab & CI/CD',
      project_id: 'containerlab-automation',
      target_audience: 'NetDevOps Engineers, Network Automation Practitioners',
      technical_depth: 'applied_engineering',
      target_format: 'multi_episode_arc',
      core_thesis:
        'Physical hardware testbeds are obsolete for continuous integration; containerized network operating systems orchestrated via Containerlab enable reproducible, ephemeral validation pipelines in GitHub Actions.',
      tone_and_style:
        'Hands-on engineering workshop tone with verified YAML topologies, real CLI output, and step-by-step troubleshooting.',
      key_questions_to_answer: [
        'How does Containerlab bridge Linux network namespaces to simulate physical links?',
        'How do we integrate pyATS validation tests into a pull-request pipeline?',
        'What are the memory and CPU constraints for running 10+ virtual NOS instances simultaneously?',
      ],
    },
  },
  {
    name: 'vLLM Inference Optimization',
    icon: <Cpu className="w-3.5 h-3.5 text-emerald-400" />,
    tag: 'AI Systems Engineering',
    data: {
      title: 'High-Throughput LLM Serving: PagedAttention, Continuous Batching & Chunked Prefill',
      project_id: 'vllm-inference-optimization',
      target_audience: 'MLOps Engineers, LLM Systems Architects, Performance Engineers',
      technical_depth: 'practitioner_deep',
      target_format: 'deep_dive_standalone',
      core_thesis:
        'KV-cache memory fragmentation is the primary bottleneck in generative AI serving; PagedAttention eliminates internal memory waste to achieve 3-5x higher throughput under unpredictable burst traffic.',
      tone_and_style:
        'Deep technical systems engineering tone with GPU memory profiling, CUDA kernel memory layouts, and latency-throughput trade-off curves.',
      key_questions_to_answer: [
        'Why do conventional contiguous KV-cache allocators waste up to 80% of GPU memory?',
        'How does chunked prefill prevent long prompt evaluations from starving token generation?',
        'What are the latency tradeoffs between Tensor Parallelism and Pipeline Parallelism on 8x H100 nodes?',
      ],
    },
  },
]

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
  onToast,
}) => {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [targetAudience, setTargetAudience] = useState('Senior Engineers, SREs & Infrastructure Practitioners')
  const [technicalDepth, setTechnicalDepth] = useState<TechnicalDepth>('practitioner_deep')
  const [targetFormat, setTargetFormat] = useState<VideoFormatPreset>('multi_episode_arc')
  const [coreThesis, setCoreThesis] = useState('')
  const [toneAndStyle, setToneAndStyle] = useState(
    'Trench practitioner scar-tissue tone. Direct, no-fluff engineering insights with reproducible commands.'
  )
  const [keyQuestions, setKeyQuestions] = useState<string[]>([
    'What is the core architectural failure mode or performance bottleneck?',
    'What reproducible commands or configurations prove this thesis?',
    'What actionable lessons should senior practitioners implement immediately?',
  ])
  const [newQuestionInput, setNewQuestionInput] = useState('')
  const [autoSlug, setAutoSlug] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    if (autoSlug) {
      const slug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 48)
      setProjectId(slug)
    }
  }

  const handleApplyPreset = (preset: ProjectPreset) => {
    setTitle(preset.data.title)
    setProjectId(preset.data.project_id || '')
    setAutoSlug(false)
    setTargetAudience(preset.data.target_audience)
    setTechnicalDepth(preset.data.technical_depth)
    setTargetFormat(preset.data.target_format)
    setCoreThesis(preset.data.core_thesis)
    setToneAndStyle(preset.data.tone_and_style || '')
    setKeyQuestions(preset.data.key_questions_to_answer || [])
    setErrorMsg(null)
  }

  const handleAddQuestion = () => {
    if (newQuestionInput.trim()) {
      setKeyQuestions([...keyQuestions, newQuestionInput.trim()])
      setNewQuestionInput('')
    }
  }

  const handleRemoveQuestion = (index: number) => {
    setKeyQuestions(keyQuestions.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMsg('Project title is required.')
      return
    }
    if (!coreThesis.trim()) {
      setErrorMsg('Core thesis is required. This guides all AI synthesis.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    const payload: CreateProjectRequest = {
      title: title.trim(),
      project_id: projectId.trim() || undefined,
      target_audience: targetAudience.trim(),
      technical_depth: technicalDepth,
      target_format: targetFormat,
      core_thesis: coreThesis.trim(),
      tone_and_style: toneAndStyle.trim(),
      key_questions_to_answer: keyQuestions.filter((q) => q.trim().length > 0),
    }

    try {
      const newProject = await api.createProject(payload)
      api.setActiveProjectId(newProject.project_id)
      onProjectCreated(newProject)
      onToast?.({
        type: 'success',
        title: 'Project Workspace Initialized',
        message: `Created sandbox "${newProject.title}" with isolated vault and vision.md.`,
      })
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project workspace'
      setErrorMsg(msg)
      onToast?.({
        type: 'error',
        title: 'Project Creation Failed',
        message: msg,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-[#0e111a] border border-[#272c40] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22273b] bg-[#121522]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <FolderGit2 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Initialize Project Workspace & Vision
              </h2>
              <p className="text-[11px] text-zinc-400">
                Creates an isolated <code className="font-mono text-zinc-300">vault/projects/{'{project_id}'}/</code> sandbox governed by a technical North Star.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#1b1f32] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="px-6 py-3 bg-[#111422] border-b border-[#1e2336] flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Quick Presets:
          </span>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#161a2b] hover:bg-[#1e233d] border border-[#262c44] hover:border-indigo-500/50 text-zinc-300 hover:text-white transition-all shrink-0"
            >
              {preset.icon}
              <span>{preset.name}</span>
              <span className="text-[10px] text-zinc-500 font-mono">({preset.tag})</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 flex items-center gap-2">
              <span className="font-semibold">Error:</span> {errorMsg}
            </div>
          )}

          {/* Title & Project ID / Slug */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                Project Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Cloudflare Control Plane Outage & BGP Failover"
                className="w-full px-3 py-2 text-xs bg-[#131726] border border-[#262c44] rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-300">Sandbox ID</label>
                <button
                  type="button"
                  onClick={() => setAutoSlug(!autoSlug)}
                  className="text-[10px] text-indigo-400 hover:underline"
                >
                  {autoSlug ? 'Lock Auto-Slug' : 'Auto-derive'}
                </button>
              </div>
              <input
                type="text"
                value={projectId}
                onChange={(e) => {
                  setAutoSlug(false)
                  setProjectId(e.target.value)
                }}
                placeholder="slug-id"
                className="w-full px-3 py-2 text-xs font-mono bg-[#131726] border border-[#262c44] rounded-lg text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Technical Depth & Video Format Presets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Technical Depth */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                Technical Depth Calibration
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'practitioner_deep' as TechnicalDepth,
                    title: 'Practitioner Deep',
                    desc: 'Trench engineering, RFCs, failure modes, raw configs & code.',
                    color: 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300',
                  },
                  {
                    id: 'applied_engineering' as TechnicalDepth,
                    title: 'Applied Engineering',
                    desc: 'Architecture patterns, trade-offs, systems design, and benchmarks.',
                    color: 'border-sky-500/50 bg-sky-950/20 text-sky-300',
                  },
                  {
                    id: 'conceptual_overview' as TechnicalDepth,
                    title: 'Conceptual Overview',
                    desc: 'High-level mental models, executive primers, and architectural flows.',
                    color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300',
                  },
                ].map((depth) => (
                  <button
                    key={depth.id}
                    type="button"
                    onClick={() => setTechnicalDepth(depth.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      technicalDepth === depth.id
                        ? `${depth.color} ring-1 ring-indigo-500/30 font-medium`
                        : 'border-[#22273d] bg-[#121524] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{depth.title}</span>
                      {technicalDepth === depth.id && (
                        <span className="text-[10px] font-mono uppercase">ACTIVE</span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{depth.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Video Format */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Target Video Production Format
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'multi_episode_arc' as VideoFormatPreset,
                    title: 'Multi-Episode Arc (Series)',
                    desc: '3-5 structured episodes with progressive pedagogy and continuous arcs.',
                  },
                  {
                    id: 'deep_dive_standalone' as VideoFormatPreset,
                    title: 'Deep-Dive Standalone (12-18m)',
                    desc: 'Comprehensive single-topic technical deep dive with end-to-end depth.',
                  },
                  {
                    id: 'quick_explainer' as VideoFormatPreset,
                    title: 'Quick Explainer (3-5m)',
                    desc: 'Focused 1-concept / incident post-mortem breakdown.',
                  },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setTargetFormat(fmt.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      targetFormat === fmt.id
                        ? 'border-indigo-500/50 bg-indigo-950/20 text-indigo-300 ring-1 ring-indigo-500/30 font-medium'
                        : 'border-[#22273d] bg-[#121524] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{fmt.title}</span>
                      {targetFormat === fmt.id && (
                        <span className="text-[10px] font-mono uppercase">ACTIVE</span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Target Audience Definition</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Senior Infrastructure Engineers & SREs"
              className="w-full px-3 py-2 text-xs bg-[#131726] border border-[#262c44] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Core Thesis (North Star) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Core Editorial Thesis (North Star) <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] text-zinc-500">Guides AI fact filtering & scripts</span>
            </div>
            <textarea
              value={coreThesis}
              onChange={(e) => setCoreThesis(e.target.value)}
              rows={3}
              placeholder="State the central technical claim or revelation this video proves. E.g., 'Why automated failover loops without damping will inevitably cause cascaded global outages...'"
              className="w-full px-3 py-2 text-xs bg-[#131726] border border-[#262c44] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
              required
            />
          </div>

          {/* Tone & Style */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Tone & Editorial Style</label>
            <input
              type="text"
              value={toneAndStyle}
              onChange={(e) => setToneAndStyle(e.target.value)}
              placeholder="e.g. Trench practitioner scar-tissue tone. Direct, no-fluff engineering insights."
              className="w-full px-3 py-2 text-xs bg-[#131726] border border-[#262c44] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Key Questions to Answer */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                Key Questions This Arc Must Answer
              </span>
              <span className="text-[10px] text-zinc-500">{keyQuestions.length} registered</span>
            </label>

            <div className="space-y-1.5">
              {keyQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[#131726] border border-[#22273d] text-xs text-zinc-300"
                >
                  <span className="text-[10px] text-zinc-500 font-mono w-4">{idx + 1}.</span>
                  <span className="flex-1">{q}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(idx)}
                    className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add question input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newQuestionInput}
                onChange={(e) => setNewQuestionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddQuestion()
                  }
                }}
                placeholder="Add a technical question (press Enter)..."
                className="flex-1 px-3 py-1.5 text-xs bg-[#131726] border border-[#262c44] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1f33] hover:bg-[#232a45] text-zinc-300 border border-[#2c3350] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#22273b] bg-[#121522]">
          <div className="text-[11px] text-zinc-500 font-mono">
            Writes to: <span className="text-zinc-400">vault/projects/{projectId || 'project-id'}/vision.md</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#1c2033] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{submitting ? 'Creating Sandbox...' : 'Create Project Sandbox'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
