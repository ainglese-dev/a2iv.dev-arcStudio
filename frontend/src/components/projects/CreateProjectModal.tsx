import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  FolderGit2,
  BookOpen,
  Cpu,
  Layers,
  HelpCircle,
  Zap,
  Film,
  Scale,
  TrendingUp,
  Dna,
  Compass,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
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
    name: "Nolan's Non-Linear Chronology",
    icon: <Film className="w-3.5 h-3.5 text-rose-400" />,
    tag: 'narrative_cinema',
    data: {
      title: "Nolan's Non-Linear Chronology: Structural Tension & Cross-Cutting",
      project_id: 'nolans-non-linear-chronology',
      target_audience: 'Screenwriters, Film Editors & Narrative Architects',
      technical_depth: 'applied_engineering',
      target_format: 'deep_dive_standalone',
      core_thesis:
        'Non-linear chronological intercutting in cinema is not stylistic ornamentation; it functions as a precise information delivery mechanism that transforms passive exposition into active cognitive deduction for the audience.',
      tone_and_style:
        'Analytical film-craft analysis with scene timeline breakdowns, editorial rhythm diagrams, and structural narrative theory.',
      key_questions_to_answer: [
        'How does reverse-chronological sequencing in Memento invert audience empathy and dramatic irony?',
        'How does Dunkirk synchronize three asymmetric temporal planes (1 hour, 1 day, 1 week) at the narrative climax?',
        'What audio motifs and cross-cutting rules prevent cognitive overload during multi-timeline acceleration?',
      ],
    },
  },
  {
    name: 'Crash Ethics & Autonomous Dilemma',
    icon: <Scale className="w-3.5 h-3.5 text-amber-400" />,
    tag: 'humanities',
    data: {
      title: 'The Algorithmic Trolley Problem: Crash Optimization Ethics in Autonomous Systems',
      project_id: 'crash-ethics-autonomous-dilemma',
      target_audience: 'AI Ethicists, Autonomous Vehicle Safety Engineers & Tech Policy Makers',
      technical_depth: 'practitioner_deep',
      target_format: 'multi_episode_arc',
      core_thesis:
        'Real-time trajectory optimization algorithms in autonomous vehicles cannot remain neutral; moral weightings embedded in cost functions convert unavoidable collisions into quantified ethical judgments.',
      tone_and_style:
        'Philosophically rigorous yet grounded in robotics kinematics, sensor fusion bounds, and liability frameworks.',
      key_questions_to_answer: [
        'How do velocity cost functions trade off passenger fatality risk against pedestrian impact probability?',
        'Why does deterministic trolley problem ethics fail under sensor occlusion and probabilistic object tracking?',
        'What international regulatory standards govern non-discriminatory crash mitigation algorithms?',
      ],
    },
  },
  {
    name: 'Tulip Mania 1637 Contract Defaults',
    icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
    tag: 'business',
    data: {
      title: 'Tulip Mania 1637: Futures Collateral Defaults and Liquidity Freezes',
      project_id: 'tulip-mania-1637-contract-defaults',
      target_audience: 'Market Historians, Macroeconomists & Strategic Risk Analysts',
      technical_depth: 'applied_engineering',
      target_format: 'deep_dive_standalone',
      core_thesis:
        'The Dutch Tulip Mania collapse was not irrational mass hysteria, but a structural market failure caused by uncollateralized forward promissory notes trading in tavern colleges without clearinghouse settlement.',
      tone_and_style:
        'Quantitative historical finance with primary archival balance sheets, contract mechanics, and counterparty risk models.',
      key_questions_to_answer: [
        'How did uncollateralized forward contracts create an artificial liquidity multiplier in Amsterdam taverns?',
        'Why did the Haarlem judicial resolution to convert futures contracts into options fail to resolve insolvencies?',
        'What systemic parallels exist between the 1637 Dutch guilders freeze and modern shadow banking repo runs?',
      ],
    },
  },
  {
    name: 'CRISPR-Cas9 Off-Target Cleavage',
    icon: <Dna className="w-3.5 h-3.5 text-cyan-400" />,
    tag: 'biology_science',
    data: {
      title: 'CRISPR-Cas9 Off-Target Cleavage: PAM Distal Mismatches & Guide RNA Kinetics',
      project_id: 'crispr-cas9-off-target-cleavage',
      target_audience: 'Molecular Biologists, Gene Therapy Researchers & Bioinformaticians',
      technical_depth: 'practitioner_deep',
      target_format: 'deep_dive_standalone',
      core_thesis:
        'Cas9 endonuclease fidelity is governed by energetic kinetic proofreading along the RNA-DNA heteroduplex; understanding conformational locking mechanisms enables rational engineering of ultra-high-fidelity Cas variants.',
      tone_and_style:
        'Deep biochemistry and structural biology with structural molecular models, guide-RNA Gibbs free energy curves, and NGS assay comparisons.',
      key_questions_to_answer: [
        'How does PAM-distal seed sequence base pairing trigger the Cas9 catalytic conformational shift?',
        'What are the resolution limits of GUIDE-seq versus DISCOVER-seq for detecting genome-wide off-target cleavage?',
        'How do engineered Cas9 variants (e.g. SpCas9-HF1, HiFi) reduce non-specific binding without compromising on-target cutting efficiency?',
      ],
    },
  },
  {
    name: 'Copenhagen 5-Finger Urbanism',
    icon: <Compass className="w-3.5 h-3.5 text-purple-400" />,
    tag: 'urbanism_design',
    data: {
      title: "Copenhagen's Finger Plan: Transit-Oriented Urbanism & Radial Green Wedges",
      project_id: 'copenhagen-5-finger-urbanism',
      target_audience: 'Urban Planners, Civil Architects & Transit Infrastructure Strategists',
      technical_depth: 'conceptual_overview',
      target_format: 'multi_episode_arc',
      core_thesis:
        'The 1947 Copenhagen Finger Plan demonstrates that long-term municipal resilience requires binding rapid rail transit corridors to urban growth fingers while permanently zoning undeveloped green wedges between them.',
      tone_and_style:
        'Spatial analysis and architectural strategy with master plan diagrams, commute isochrones, and land-use metrics.',
      key_questions_to_answer: [
        'How did the 1947 plan prevent suburban sprawl from encroaching on agricultural and recreational green wedges?',
        'What multimodal integration strategies ensure over 50% of suburban commutes occur via S-trains and bicycle highways?',
        'How is the Finger Plan adapting to rising sea levels and climate storm surges along coastal fingers?',
      ],
    },
  },
  {
    name: 'Raft Consensus Split-Brain Quorums',
    icon: <Cpu className="w-3.5 h-3.5 text-indigo-400" />,
    tag: 'systems_tech',
    data: {
      title: 'Raft Consensus Split-Brain Quorums: Partition Invariants & Leader Leases',
      project_id: 'raft-consensus-split-brain-quorums',
      target_audience: 'Distributed Systems Engineers, Database Kernel Developers & Cloud Architects',
      technical_depth: 'practitioner_deep',
      target_format: 'deep_dive_standalone',
      core_thesis:
        'Maintaining linearizable state machine replication across asymmetric network partitions requires strict leader lease validation and joint consensus reconfigurations to guarantee zero split-brain data corruption.',
      tone_and_style:
        'Distributed systems kernel tone with TLA+ specification walkthroughs, network partition state machines, and RPC trace diagrams.',
      key_questions_to_answer: [
        'Why can naive heartbeats cause stale reads during asymmetric packet drops without leader leases?',
        'How does Raft\'s single-server membership change protocol guarantee disjoint quorums can never form?',
        'What are the disk fsync write-ahead log bottlenecks when surviving minority nodes attempt to re-elect?',
      ],
    },
  },
]

interface InferredVisionProfile {
  targetAudience: string
  technicalDepth: TechnicalDepth
  targetFormat: VideoFormatPreset
  coreThesis: string
  toneAndStyle: string
  keyQuestions: string[]
}

function inferVisionFromTitle(rawTitle: string): InferredVisionProfile {
  const cleanTitle = rawTitle.trim()
  const t = cleanTitle.toLowerCase()

  // 1. Narrative Cinema / Filmmaking
  if (
    t.includes('nolan') ||
    t.includes('film') ||
    t.includes('cinema') ||
    t.includes('movie') ||
    t.includes('screenplay') ||
    t.includes('script') ||
    t.includes('chronology') ||
    t.includes('narrative') ||
    t.includes('editing') ||
    t.includes('director') ||
    t.includes('dunkirk') ||
    t.includes('memento')
  ) {
    return {
      targetAudience: 'Screenwriters, Film Editors & Narrative Architects',
      technicalDepth: 'applied_engineering',
      targetFormat: 'deep_dive_standalone',
      coreThesis: `Non-linear narrative structure and editorial pacing in ${cleanTitle} transform passive storytelling into active cognitive discovery for the audience.`,
      toneAndStyle: 'Analytical film-craft analysis with scene breakdowns, structural narrative theory, and pacing diagrams.',
      keyQuestions: [
        `How does the temporal structure in ${cleanTitle} alter audience empathy and dramatic irony?`,
        `What audio-visual motifs and editorial transitions maintain coherence across non-linear sequences?`,
        `What foundational craft lessons can creators extract for long-form narrative pacing?`,
      ],
    }
  }

  // 2. Humanities, Ethics & Autonomous Systems
  if (
    t.includes('ethics') ||
    t.includes('trolley') ||
    t.includes('moral') ||
    t.includes('autonomous') ||
    t.includes('philosophy') ||
    t.includes('dilemma') ||
    t.includes('justice') ||
    t.includes('legal') ||
    t.includes('policy') ||
    t.includes('liability')
  ) {
    return {
      targetAudience: 'AI Ethicists, Systems Safety Engineers & Technology Policy Makers',
      technicalDepth: 'practitioner_deep',
      targetFormat: 'multi_episode_arc',
      coreThesis: `Decision boundaries and cost functions in ${cleanTitle} cannot remain morally neutral; real-time optimization converts unavoidable trade-offs into quantified ethical assertions.`,
      toneAndStyle: 'Philosophically rigorous yet grounded in robotics kinematics, safety validation, and liability boundaries.',
      keyQuestions: [
        `How do optimization loss functions encode trade-offs between safety, utility, and fairness in ${cleanTitle}?`,
        `Why do classic ethical thought experiments break down under sensor noise and partial observability?`,
        `What institutional and verification guardrails ensure algorithmic decisions remain accountable?`,
      ],
    }
  }

  // 3. Business, Finance & Economic History
  if (
    t.includes('tulip') ||
    t.includes('mania') ||
    t.includes('market') ||
    t.includes('finance') ||
    t.includes('bubble') ||
    t.includes('default') ||
    t.includes('contract') ||
    t.includes('liquidity') ||
    t.includes('trade') ||
    t.includes('banking') ||
    t.includes('crypto') ||
    t.includes('investing') ||
    t.includes('economic')
  ) {
    return {
      targetAudience: 'Market Historians, Macroeconomists & Strategic Risk Analysts',
      technicalDepth: 'applied_engineering',
      targetFormat: 'deep_dive_standalone',
      coreThesis: `The systemic collapse in ${cleanTitle} was not driven by irrational hysteria, but by structural settlement failures, uncollateralized leverage, and counterparty contagion.`,
      toneAndStyle: 'Quantitative market analysis with archival balance sheets, contract mechanics, and liquidity models.',
      keyQuestions: [
        `What contractual and liquidity mechanisms triggered the initial solvency cascade in ${cleanTitle}?`,
        `How did emergency regulatory interventions unintentionally exacerbate market lockup?`,
        `What structural safeguards must modern financial architectures enforce to prevent identical liquidity freezes?`,
      ],
    }
  }

  // 4. Biology, Gene Editing & Life Sciences
  if (
    t.includes('crispr') ||
    t.includes('cas9') ||
    t.includes('gene') ||
    t.includes('dna') ||
    t.includes('rna') ||
    t.includes('cleavage') ||
    t.includes('biology') ||
    t.includes('molecular') ||
    t.includes('cellular') ||
    t.includes('biotech') ||
    t.includes('genome') ||
    t.includes('protein')
  ) {
    return {
      targetAudience: 'Molecular Biologists, Gene Therapy Researchers & Bioinformaticians',
      technicalDepth: 'practitioner_deep',
      targetFormat: 'deep_dive_standalone',
      coreThesis: `Endonuclease precision in ${cleanTitle} is governed by energetic kinetic proofreading; decoding conformational locking enables rational design of high-fidelity molecular tools.`,
      toneAndStyle: 'Deep biochemistry inquiry with molecular mechanics, assay methodologies, and empirical benchmarks.',
      keyQuestions: [
        `What biophysical kinetic mechanisms govern the selectivity and cleavage rates of ${cleanTitle}?`,
        `What are the detection resolution limits and false-positive rates of current genomic validation assays?`,
        `How do engineered conformational variants balance on-target cutting efficiency with zero off-target binding?`,
      ],
    }
  }

  // 5. Urbanism, City Planning & Architecture
  if (
    t.includes('copenhagen') ||
    t.includes('urban') ||
    t.includes('city') ||
    t.includes('transit') ||
    t.includes('planning') ||
    t.includes('architecture') ||
    t.includes('zoning') ||
    t.includes('finger') ||
    t.includes('transport') ||
    t.includes('density')
  ) {
    return {
      targetAudience: 'Urban Planners, Civic Architects & Transit Infrastructure Strategists',
      technicalDepth: 'conceptual_overview',
      targetFormat: 'multi_episode_arc',
      coreThesis: `Metropolitan resilience in ${cleanTitle} requires binding rapid transit corridors directly to dense growth fingers while legally preserving permanent undeveloped green wedges.`,
      toneAndStyle: 'Spatial planning analysis with master plan cartography, commute isochrones, and land-use metrics.',
      keyQuestions: [
        `How does transit-oriented corridor design prevent suburban sprawl from degrading regional ecology in ${cleanTitle}?`,
        `What multimodal transportation networks achieve sustained high adoption rates across varying weather and seasons?`,
        `How can long-term civic master plans adapt to emerging climate risks and shifting demographics?`,
      ],
    }
  }

  // 6. Systems Tech / Cloud / Infrastructure / DevOps
  if (
    t.includes('raft') ||
    t.includes('consensus') ||
    t.includes('split-brain') ||
    t.includes('bgp') ||
    t.includes('sre') ||
    t.includes('distributed') ||
    t.includes('kubernetes') ||
    t.includes('k8s') ||
    t.includes('latency') ||
    t.includes('database') ||
    t.includes('cache') ||
    t.includes('kernel') ||
    t.includes('compiler') ||
    t.includes('vllm') ||
    t.includes('linux') ||
    t.includes('storage') ||
    t.includes('concurrency')
  ) {
    return {
      targetAudience: 'Senior Distributed Systems Engineers, Database Kernel Developers & Cloud Architects',
      technicalDepth: 'practitioner_deep',
      targetFormat: 'deep_dive_standalone',
      coreThesis: `Maintaining linearizable consistency during asymmetric network faults in ${cleanTitle} requires strict leader lease validation and joint consensus reconfigurations to guarantee zero data corruption.`,
      toneAndStyle: 'Distributed systems kernel tone with failure state machine traces, protocol benchmarks, and zero marketing fluff.',
      keyQuestions: [
        `Why do naive heartbeat protocols cause stale reads or split-brain partitions in ${cleanTitle}?`,
        `What specific quorum invariants prevent divergent state histories during partial network partitions?`,
        `What are the operational trade-offs between durability guarantees, fsync latency, and recovery time?`,
      ],
    }
  }

  // Fallback: General Practitioner
  return {
    targetAudience: 'Practitioners and Inquisitive Learners',
    technicalDepth: 'applied_engineering',
    targetFormat: 'multi_episode_arc',
    coreThesis: `A grounded investigation into the key principles, failure modes, and practical trade-offs of ${cleanTitle}.`,
    toneAndStyle: 'Direct, insightful practitioner tone with clear real-world examples.',
    keyQuestions: [
      `What are the foundational principles and mental models required to master ${cleanTitle}?`,
      `What subtle pitfalls or failure modes catch experienced practitioners off guard?`,
      `What actionable strategies yield the highest leverage improvements in real-world application?`,
    ],
  }
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
  onToast,
}) => {
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [targetAudience, setTargetAudience] = useState('Practitioners and Inquisitive Learners')
  const [technicalDepth, setTechnicalDepth] = useState<TechnicalDepth>('applied_engineering')
  const [targetFormat, setTargetFormat] = useState<VideoFormatPreset>('multi_episode_arc')
  const [coreThesis, setCoreThesis] = useState('')
  const [toneAndStyle, setToneAndStyle] = useState(
    'Direct, insightful practitioner tone with clear real-world examples.'
  )
  const [keyQuestions, setKeyQuestions] = useState<string[]>([
    'What is the core architectural principle or mechanism at stake?',
    'What failure modes or trade-offs emerge in real-world scenarios?',
    'What actionable lessons should practitioners implement immediately?',
  ])
  const [newQuestionInput, setNewQuestionInput] = useState('')
  const [autoSlug, setAutoSlug] = useState(true)
  const [showSlugEdit, setShowSlugEdit] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        titleInputRef.current?.focus()
      }, 60)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

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

  const handleAutoSuggestVision = () => {
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setErrorMsg('Please enter a project title first to auto-suggest a vision.')
      titleInputRef.current?.focus()
      return
    }
    setErrorMsg(null)
    const profile = inferVisionFromTitle(cleanTitle)
    setTargetAudience(profile.targetAudience)
    setTechnicalDepth(profile.technicalDepth)
    setTargetFormat(profile.targetFormat)
    setCoreThesis(profile.coreThesis)
    setToneAndStyle(profile.toneAndStyle)
    setKeyQuestions(profile.keyQuestions)

    onToast?.({
      type: 'info',
      title: 'Vision Auto-Suggested ✨',
      message: `Tailored thesis, audience, and questions generated for "${cleanTitle}".`,
    })
  }

  const handleApplyPreset = (preset: ProjectPreset) => {
    setTitle(preset.data.title)
    setProjectId(preset.data.project_id || '')
    setAutoSlug(false)
    setTargetAudience(preset.data.target_audience || 'Practitioners and Inquisitive Learners')
    setTechnicalDepth(preset.data.technical_depth || 'applied_engineering')
    setTargetFormat(preset.data.target_format || 'multi_episode_arc')
    setCoreThesis(preset.data.core_thesis || '')
    setToneAndStyle(preset.data.tone_and_style || '')
    setKeyQuestions(preset.data.key_questions_to_answer || [])
    setErrorMsg(null)

    onToast?.({
      type: 'info',
      title: 'Preset Applied',
      message: `Loaded "${preset.name}".`,
    })
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setErrorMsg('Project title is required.')
      titleInputRef.current?.focus()
      return
    }

    setSubmitting(true)
    setErrorMsg(null)

    // Auto-derive thesis if left empty - never block project creation!
    const effectiveThesis =
      coreThesis.trim() ||
      `A grounded investigation into the key principles, failure modes, and practical trade-offs of ${cleanTitle}.`

    const effectiveAudience =
      targetAudience.trim() || 'Practitioners and Inquisitive Learners'

    const effectiveTone =
      toneAndStyle.trim() ||
      'Direct, insightful practitioner tone with clear real-world examples.'

    const payload: CreateProjectRequest = {
      title: cleanTitle,
      project_id: projectId.trim() || undefined,
      target_audience: effectiveAudience,
      technical_depth: technicalDepth,
      target_format: targetFormat,
      core_thesis: effectiveThesis,
      tone_and_style: effectiveTone,
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
      <div
        className="relative w-full max-w-3xl my-8 bg-[#0e111a] border border-[#272c40] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
      >
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
                Creates an isolated <code className="font-mono text-zinc-300">vault/projects/{'{project_id}'}/</code> sandbox governed by a North Star.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#1b1f32] transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Diverse Quick Presets Bar (6 1-Click Domain Presets) */}
        <div className="px-6 py-3 bg-[#111422] border-b border-[#1e2336] flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Domain Presets:
          </span>
          <div className="flex items-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#161a2b] hover:bg-[#1e233d] border border-[#262c44] hover:border-indigo-500/50 text-zinc-300 hover:text-white transition-all shrink-0 cursor-pointer"
                title={`Load "${preset.name}" (${preset.tag})`}
              >
                {preset.icon}
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 flex items-center gap-2">
              <span className="font-semibold">Notice:</span> {errorMsg}
            </div>
          )}

          {/* 1-Field Express Creation Section */}
          <div className="p-4 rounded-xl bg-[#121522] border border-[#22273b] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <span>Project Title</span>
                <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-400 font-mono">
                Press Enter or ⌘+Enter to create instantly
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="e.g. Raft Consensus Split-Brain Quorums, Nolan's Non-Linear Chronology..."
                className="flex-1 px-3.5 py-2 text-sm bg-[#131726] border border-[#262c44] rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                required
                autoFocus
              />

              {/* Magic Auto-Generate Vision Button */}
              <button
                type="button"
                onClick={handleAutoSuggestVision}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 hover:border-indigo-500/50 transition-all shrink-0 cursor-pointer shadow-sm"
                title="Intelligently infer thesis, audience, and questions from title"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>Auto-Suggest Vision</span>
              </button>
            </div>

            {/* Sandbox Path & Optional Slug Customization */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
              <div className="flex items-center gap-1.5 font-mono truncate max-w-[80%]">
                <span className="text-zinc-500">Sandbox:</span>
                <span className="text-indigo-300/90 font-medium">
                  vault/projects/{projectId ? (projectId.startsWith('proj_') ? projectId : `proj_${projectId}`) : 'auto-slug'}/
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSlugEdit(!showSlugEdit)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0 ml-2"
              >
                {showSlugEdit ? 'Hide custom slug' : 'Customize slug'}
              </button>
            </div>

            {/* Expanded Slug Customizer */}
            {showSlugEdit && (
              <div className="pt-2 border-t border-[#1e2336] flex items-center gap-2 animate-in fade-in duration-150">
                <span className="text-[11px] text-zinc-400 font-mono shrink-0">proj_</span>
                <input
                  type="text"
                  value={projectId.replace(/^proj_/, '')}
                  onChange={(e) => {
                    setAutoSlug(false)
                    setProjectId(e.target.value)
                  }}
                  placeholder="custom-slug-id"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-[#131726] border border-[#262c44] rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAutoSlug(true)
                    const slug = title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')
                      .slice(0, 48)
                    setProjectId(slug)
                  }}
                  className="text-[11px] text-indigo-400 hover:underline px-1.5 py-1 cursor-pointer"
                >
                  Reset Auto-Slug
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Accordion: Customize Vision & Editorial Settings */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#121522] hover:bg-[#161a2b] border border-[#22273b] hover:border-[#323955] transition-all text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100">
                  Customize Vision & Editorial Settings
                </span>
                <span className="text-[10px] text-zinc-400 bg-[#191d30] px-2 py-0.5 rounded-full border border-[#292f4c]">
                  Optional
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200">
                <span className="text-[11px] font-mono text-zinc-500">
                  {isAdvancedOpen ? 'Collapse' : 'Expand'}
                </span>
                {isAdvancedOpen ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </div>
            </button>

            {/* Accordion Body */}
            {isAdvancedOpen && (
              <div className="p-4 rounded-xl bg-[#121522] border border-[#22273b] space-y-4 animate-in fade-in duration-150">
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
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
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
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
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
                    placeholder="e.g. Practitioners and Inquisitive Learners"
                    className="w-full px-3 py-2 text-xs bg-[#131726] border border-[#262c44] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Core Thesis (North Star) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      Core Editorial Thesis (North Star)
                    </label>
                    <span className="text-[10px] text-zinc-500">
                      Auto-derived from title if left blank
                    </span>
                  </div>
                  <textarea
                    value={coreThesis}
                    onChange={(e) => setCoreThesis(e.target.value)}
                    rows={3}
                    placeholder="State the central technical claim or revelation this video proves. (If empty, automatically derived from title)."
                    className="w-full px-3 py-2 text-xs bg-[#131726] border border-[#262c44] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  />
                </div>

                {/* Tone & Style */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Tone & Editorial Style</label>
                  <input
                    type="text"
                    value={toneAndStyle}
                    onChange={(e) => setToneAndStyle(e.target.value)}
                    placeholder="e.g. Direct, insightful practitioner tone with clear real-world examples."
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
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
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
                      placeholder="Add a key question (press Enter)..."
                      className="flex-1 px-3 py-1.5 text-xs bg-[#131726] border border-[#262c44] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1f33] hover:bg-[#232a45] text-zinc-300 border border-[#2c3350] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#22273b] bg-[#121522]">
          <div className="text-[11px] text-zinc-500 font-mono truncate max-w-[50%]">
            Target: <span className="text-zinc-400">vault/projects/{projectId ? (projectId.startsWith('proj_') ? projectId : `proj_${projectId}`) : 'project-id'}/vision.md</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#1c2033] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md shadow-indigo-900/30 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{submitting ? 'Creating Sandbox...' : '⚡ Create Project Workspace'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
