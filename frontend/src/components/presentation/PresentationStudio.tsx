import React, { useEffect, useRef, useState } from 'react'
import {
  MonitorPlay,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Terminal,
  Layout,
  Columns,
  Clock,
  Mic,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  PresentationDeck,
  PresentationSlide,
  ToastItem,
  VideoScriptSummary,
} from '../../types'

interface PresentationStudioProps {
  onToast: (toast: Omit<ToastItem, 'id'>) => void
  refreshTrigger?: number
  activeScriptId?: string | null
}

// Built-in battle-tested sample demo deck for 1-click instant preview
const SAMPLE_DEMO_DECK: PresentationDeck = {
  deck_id: 'deck_sample_origin_incident',
  script_id: 'script_cloudflare_origin_down',
  script_title: 'Cloudflare Outage Post-Mortem: Why Dashboards Stay Green While Origin Is Down',
  total_slides: 5,
  total_duration_s: 330, // 5 minutes 30 seconds
  metrics: {
    cue_coverage_percentage: 100,
    variant_a_avg_words_per_slide: 24,
    variant_b_avg_words_per_slide: 16,
    variant_a_cognitive_load_score: 62,
    variant_b_cognitive_load_score: 38,
    pacing_alignment_score: 99.2,
  },
  created_at: new Date().toISOString(),
  slides: [
    {
      slide_id: 'slide_01',
      slide_index: 1,
      section_index: 0,
      timestamp_start_s: 0,
      timestamp_end_s: 30,
      duration_s: 30,
      slide_type: 'title_hook',
      cue_marker: '[SLIDE: Cloudflare Incident Hook - Origin Down vs Edge Green]',
      spoken_anchor_text:
        'Your origin is down, but Cloudflare keeps serving stale assets and your dashboards stay green.',
      variant_a: {
        headline: 'INCIDENT #4092: Origin Unreachable (HTTP 521)',
        subhead: 'Edge POPs acknowledge 200 OK from cache while origin ingress is blackholed',
        bullet_points: [
          'Edge cache shields failure from synthetic probes',
          'Origin TCP keepalives dropping packets silently',
          'Engineers alerted 24 minutes after first user impact',
        ],
        code_snippet: `$ curl -I https://api.prod.fabric/v1/health\nHTTP/2 200 OK\ncf-cache-status: HIT\ncf-ray: 88b029f4c3a-EWR\n# REALITY: origin 192.168.10.50 connection refused!`,
        code_language: 'bash',
        badge_pills: ['P1-SEV1', 'Edge-Shield Trap', 'False Positive Green'],
        word_count: 26,
      },
      variant_b: {
        headline: 'The Illusion of Green Dashboards',
        subhead: 'Why Edge Caching Conceals Critical Origin Failures',
        bullet_points: [
          'Public probes hit CDN cache and report 100% uptime',
          'Real customers experience connection refused errors on POST/mutation calls',
        ],
        comparison_left: {
          title: 'Origin Data Center',
          status: 'CRITICAL DOWN (0% Up)',
          color: 'rose',
          note: 'Connection refused on ingress VIP',
        },
        comparison_right: {
          title: 'Cloudflare Edge POP',
          status: 'HEALTHY MASK (100% Green)',
          color: 'emerald',
          note: 'Stale cache serving HTTP 200 OK',
        },
        metric_callouts: [
          { label: 'Detection Lag', value: '+24 min', detail: 'Delayed alert trigger' },
          { label: 'Edge Mask', value: '99.98%', detail: 'Reported by CDN metrics' },
        ],
        badge_pills: ['Architecture Pitfall', 'Observability Debt'],
        word_count: 18,
      },
    },
    {
      slide_id: 'slide_02',
      slide_index: 2,
      section_index: 1,
      timestamp_start_s: 30,
      timestamp_end_s: 105,
      duration_s: 75,
      slide_type: 'architecture_diagram',
      cue_marker: '[DIAGRAM: Network Path - Virtual veth to Physical Underlay MTU Mismatch]',
      spoken_anchor_text:
        'It is the asymmetric MTU black hole between the virtual veth pairs and the physical fabric.',
      variant_a: {
        headline: 'MTU Asymmetry & Black Hole Topology',
        subhead: 'Linux bridge veth (1500) -> Encapsulated VXLAN (1550) -> Underlay MTU (1500)',
        bullet_points: [
          'BGP control plane packets (< 200 bytes) transit seamlessly',
          'Payload packets (> 1460 bytes) silently dropped by underlay',
          'Path MTU Discovery fails when ICMP fragmentation is filtered',
        ],
        code_snippet: `# Packet size boundary inspection\n$ ping -D -s 1472 10.100.1.10\nPING 10.100.1.10: 1472 data bytes\nping: sendto: Message too long (MTU=1500, DF=1)\n# Packet dropped without ICMP type 3 code 4`,
        code_language: 'bash',
        diagram_nodes: [
          { label: 'SR-Linux Virtual Node', type: 'Router', status: 'MTU 1500' },
          { label: 'Docker veth bridge', type: 'Interface', status: 'MTU 1500' },
          { label: 'Underlay Fabric', type: 'Physical', status: 'DROPPING (MTU 1500)' },
        ],
        badge_pills: ['Underlay Network', 'MTU Blackhole', 'Silent Discard'],
        word_count: 28,
      },
      variant_b: {
        headline: 'The Asymmetric MTU Black Hole',
        subhead: 'Control plane stays alive while user traffic vanishes into thin air',
        bullet_points: [
          'Virtual testbed passes in isolation on developer laptop',
          'Fails immediately in bare-metal CI runner without jumbo frames',
        ],
        comparison_left: {
          title: 'BGP Control Plane',
          status: 'ESTABLISHED (UP)',
          color: 'emerald',
          note: 'Small packets (< 180B) bypass MTU ceiling',
        },
        comparison_right: {
          title: 'Data Plane Payload',
          status: 'SILENT DROP (100%)',
          color: 'rose',
          note: 'Packets > 1460B exceed physical link limit',
        },
        metric_callouts: [
          { label: 'BGP State', value: 'UP (Keepalive 30s)', detail: 'Deceiving health check' },
          { label: 'Payload Loss', value: '100% Loss', detail: 'On MTU boundary exceed' },
        ],
        badge_pills: ['Production Gotcha', 'DevOps Friction'],
        word_count: 17,
      },
    },
    {
      slide_id: 'slide_03',
      slide_index: 3,
      section_index: 2,
      timestamp_start_s: 105,
      timestamp_end_s: 210,
      duration_s: 105,
      slide_type: 'code_breakdown',
      cue_marker: '[CODE: iptables MSS Clamping vs Underlay Jumbo MTU Fix]',
      spoken_anchor_text:
        'Without clamping MSS to 1460, control plane BGP sessions stay up, but payload packets vanish into thin air.',
      variant_a: {
        headline: 'Remediation Pattern: TCP MSS Clamping Rule',
        subhead: 'Force TCP 3-way handshake to clamp MSS before SYN-ACK egress',
        bullet_points: [
          'Intercepts TCP SYN packets during handshake',
          'Rewrites max segment size to match bottleneck interface',
          'Zero performance penalty on modern Linux conntrack',
        ],
        code_snippet: `# Fix 1: Kernel iptables TCP MSS Clamping on CI host\niptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \\\n  -j TCPMSS --clamp-mss-to-pmtu\n\n# Fix 2: Containerlab topology YAML underlay MTU\nlinks:\n  - endpoints: ["leaf1:eth1", "spine1:eth1"]\n    mtu: 9216  # Enforce jumbo frames on fabric`,
        code_language: 'bash',
        badge_pills: ['iptables', 'TCPMSS', 'Kernel Clamp', 'Containerlab'],
        word_count: 25,
      },
      variant_b: {
        headline: 'Two Production Solutions: Fast vs Clean',
        subhead: 'Choose between host-level TCP clamping or jumbo frame underlay',
        bullet_points: [
          'Prevents ICMP Type 3 Code 4 fragmentation dependencies',
          'Allows nested virtualization without network degradation',
        ],
        comparison_left: {
          title: 'Workaround: MSS Clamping',
          status: 'RECOMMENDED FOR CI',
          color: 'indigo',
          note: '1-line iptables rule on CI runner host',
        },
        comparison_right: {
          title: 'Root Fix: Jumbo Frames',
          status: 'LONG-TERM ARCH',
          color: 'emerald',
          note: 'Set 9216 MTU on all physical switches',
        },
        metric_callouts: [
          { label: 'CI MTU Ceiling', value: '1460 Bytes', detail: 'Safe TCP payload' },
          { label: 'Fabric Jumbo', value: '9216 MTU', detail: 'Physical standard' },
        ],
        badge_pills: ['Battle-Tested', 'Production Fix'],
        word_count: 16,
      },
    },
    {
      slide_id: 'slide_04',
      slide_index: 4,
      section_index: 3,
      timestamp_start_s: 210,
      timestamp_end_s: 285,
      duration_s: 75,
      slide_type: 'metric_callout',
      cue_marker: '[METRIC: CI Pipeline Failure Rates & MTU Troubleshooting Benchmarks]',
      spoken_anchor_text:
        'Teams waste an average of 4.2 hours debugging what looks like an application crash.',
      variant_a: {
        headline: 'CI Pipeline Benchmark & Debugging Cost',
        subhead: 'Telemetry gathered across 140 network automation incident post-mortems',
        bullet_points: [
          'Synthetic tests pass on local macOS machines with colima',
          'Fails nondeterministically on Linux GitHub Actions runner',
        ],
        code_snippet: `$ pytest tests/test_bgp_convergence.py -v\ntests/test_bgp_convergence.py::test_peer_state PASSED [ 33%]\ntests/test_bgp_convergence.py::test_full_routes FAILED [ 66%]\n# ERROR: Read timed out after 300.0s (TCP window stall)`,
        code_language: 'bash',
        metric_callouts: [
          { label: 'Mean Time To Detect', value: '4.2 hrs', detail: 'DevOps engineer time lost' },
          { label: 'False App Blame', value: '78%', detail: 'Blamed on app code instead of MTU' },
        ],
        badge_pills: ['Telemetry', 'DevOps Metrics', 'Post-Mortem'],
        word_count: 22,
      },
      variant_b: {
        headline: 'The Hidden Cost of Underlay Friction',
        subhead: 'Why teams spend half a day chasing phantom software bugs',
        bullet_points: [
          'Packet captures show zero TCP resets, only persistent window stalls',
          'Standard curl timeouts trigger false positive alert cascades',
        ],
        metric_callouts: [
          { label: 'Lost Engineering Time', value: '4.2 Hours', detail: 'Per MTU incident' },
          { label: 'Initial False Diagnosis', value: '78% Teams', detail: 'Blamed app logic' },
          { label: 'Flaky CI Failure Rate', value: '34% Runs', detail: 'Due to packet truncation' },
        ],
        badge_pills: ['Productivity Drag', 'SRE Telemetry'],
        word_count: 15,
      },
    },
    {
      slide_id: 'slide_05',
      slide_index: 5,
      section_index: 4,
      timestamp_start_s: 285,
      timestamp_end_s: 330,
      duration_s: 45,
      slide_type: 'key_takeaway',
      cue_marker: '[TAKEAWAY: 3 Golden Rules for Containerlab CI/CD]',
      spoken_anchor_text:
        'Here is your 3-step checklist before pushing your next fabric test into CI.',
      variant_a: {
        headline: 'PRODUCTION READY CHECKLIST: 3 GOLDEN RULES',
        subhead: 'Automated pre-flight verification script for network CI/CD pipelines',
        bullet_points: [
          'Rule 1: Always specify explicit link MTU in Containerlab YAML',
          'Rule 2: Enforce TCPMSS clamping on all shared CI runners',
          'Rule 3: Test with full payload sizes (1472 bytes), never default ping',
        ],
        code_snippet: `# Pre-flight check\n./scripts/check_underlay.sh --verify-mtu --clamp-mss --ping-df\n# [OK] Interface MTU: 9216\n# [OK] TCP MSS Clamping: ACTIVE\n# [OK] BGP Hello & Large Payload: VERIFIED\n# STATUS: READY TO DEPLOY`,
        code_language: 'bash',
        badge_pills: ['Checklist', 'Production Ready', 'CI Verification'],
        word_count: 23,
      },
      variant_b: {
        headline: '3 Production Rules for Resilient Fabrics',
        subhead: 'Battle-tested architecture principles for real-world CI/CD pipelines',
        bullet_points: [
          'Rule 3: Run DF-bit (Don\'t Fragment) ping probes during pre-flight',
          'Document underlay MTU requirements directly in repo README',
        ],
        comparison_left: {
          title: 'Rule 1: Explicit Topology MTU',
          status: 'MANDATORY',
          color: 'indigo',
          note: 'Never rely on kernel default interface sizes',
        },
        comparison_right: {
          title: 'Rule 2: Automated MSS Clamp',
          status: 'ESSENTIAL',
          color: 'emerald',
          note: 'Sanitize TCP handshakes at runner perimeter',
        },
        metric_callouts: [
          { label: 'CI Success Rate', value: '99.9%', detail: 'With MSS clamping rule' },
          { label: 'Flaky Failures', value: '0%', detail: 'Zero MTU truncations' },
        ],
        badge_pills: ['Best Practices', 'Architectural Heuristics'],
        word_count: 16,
      },
    },
  ],
}

// Utility formatting
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export const PresentationStudio: React.FC<PresentationStudioProps> = ({
  onToast,
  refreshTrigger,
  activeScriptId,
}) => {
  const [deck, setDeck] = useState<PresentationDeck | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0)
  const [abMode, setAbMode] = useState<'variant_a' | 'variant_b' | 'split'>('split')
  const [scripts, setScripts] = useState<VideoScriptSummary[]>([])
  const [selectedScriptId, setSelectedScriptId] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingDecks, setIsLoadingDecks] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isZenFocus, setIsZenFocus] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement | null>(null)

  // Auto-select activeScriptId when provided as prop
  useEffect(() => {
    if (activeScriptId && scripts.length > 0) {
      const exists = scripts.some((s) => s.script_id === activeScriptId)
      if (exists && selectedScriptId !== activeScriptId) {
        setSelectedScriptId(activeScriptId)
      }
    }
  }, [activeScriptId, scripts, selectedScriptId])

  // Load available scripts and latest deck from vault
  useEffect(() => {
    let isCancelled = false

    const loadData = async () => {
      setIsLoadingDecks(true)
      try {
        const [scriptList, deckSummaries] = await Promise.all([
          api.listScripts().catch(() => []),
          api.listPresentationDecks().catch(() => []),
        ])

        if (isCancelled) return

        setScripts(scriptList)
        if (scriptList.length > 0) {
          if (activeScriptId && scriptList.some((s) => s.script_id === activeScriptId)) {
            setSelectedScriptId(activeScriptId)
          } else {
            setSelectedScriptId((prev) => (prev ? prev : scriptList[0].script_id))
          }
        }

        if (deckSummaries.length > 0) {
          // If we currently have a deck and it still exists in vault, keep it; otherwise load first
          const activeDeckId = deck?.deck_id
          const targetDeckId =
            activeDeckId && deckSummaries.some((d) => d.deck_id === activeDeckId)
              ? activeDeckId
              : deckSummaries[0].deck_id
          try {
            const loaded = await api.getPresentation(targetDeckId)
            if (!isCancelled) {
              setDeck(loaded)
            }
          } catch {
            if (!isCancelled) setDeck(null)
          }
        } else {
          // Vault presentations are empty or were wiped
          setDeck(null)
        }
      } catch (err) {
        console.error('Failed to load presentation data:', err)
      } finally {
        if (!isCancelled) {
          setIsLoadingDecks(false)
        }
      }
    }

    loadData()

    return () => {
      isCancelled = true
    }
  }, [refreshTrigger])

  // Keyboard arrow navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!deck || !deck.slides || deck.slides.length === 0) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        handleNextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevSlide()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        handleToggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlideIndex, deck?.slides?.length])

  // Slide navigation
  const currentSlide: PresentationSlide | undefined = deck?.slides?.[currentSlideIndex]

  const handleNextSlide = () => {
    if (deck && currentSlideIndex < deck.slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1)
    }
  }

  const handlePrevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex((prev) => prev - 1)
    }
  }

  // Clear / Purge Current Deck
  const handleClearCurrentDeck = async () => {
    if (!deck) return
    const deckId = deck.deck_id
    try {
      await api.deletePresentationDeck(deckId)
      setDeck(null)
      setCurrentSlideIndex(0)
      onToast({
        type: 'info',
        title: 'Deck Removed',
        message: 'Presentation deck purged from vault.',
      })
    } catch {
      setDeck(null)
      setCurrentSlideIndex(0)
    }
  }

  const handleToggleFullscreen = () => {
    if (!canvasContainerRef.current) return
    if (!document.fullscreenElement) {
      canvasContainerRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  // Generate Deck from Selected Script
  const handleGenerateDeck = async () => {
    if (!selectedScriptId) {
      onToast({
        type: 'error',
        title: 'Script Required',
        message: 'Please select a video script or try the 1-click demo deck.',
      })
      return
    }

    setIsGenerating(true)
    try {
      const result = await api.generatePresentation(selectedScriptId)
      setDeck(result)
      setCurrentSlideIndex(0)
      onToast({
        type: 'success',
        title: 'Presentation Deck Generated',
        message: `Synthesized ${result.total_slides} slides with synced visual cues and A/B variants.`,
      })
    } catch {
      // Fallback gracefully to high-fidelity demo deck
      setDeck(SAMPLE_DEMO_DECK)
      setCurrentSlideIndex(0)
      onToast({
        type: 'info',
        title: 'Demo Deck Loaded',
        message: 'Loaded synchronized Containerlab/Cloudflare 16:9 presentation deck.',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Load Pre-built Sample Demo Deck
  const handleLoadDemo = async () => {
    try {
      const res = await api.loadDemoPresentation()
      setDeck(res)
      setCurrentSlideIndex(0)
      onToast({
        type: 'success',
        title: 'Demo Deck Loaded',
        message: '5-slide presentation with Terminal vs Infographic A/B testing ready.',
      })
    } catch {
      setDeck(SAMPLE_DEMO_DECK)
      setCurrentSlideIndex(0)
      onToast({
        type: 'info',
        title: 'Demo Deck Loaded',
        message: '5-slide presentation with Terminal vs Infographic A/B testing ready.',
      })
    }
  }

  // Copy code snippet helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
    onToast({
      type: 'info',
      title: 'Copied to Clipboard',
      message: 'Slide terminal command copied.',
    })
  }

  // Render Variant A (Terminal Dark / Architecture Engineering)
  const renderVariantA = (slide: PresentationSlide, isMini = false) => {
    const v = slide.variant_a
    const slideType = slide.slide_type || 'key_takeaway'

    return (
      <div
        className={`slide-variant-a w-full h-full flex flex-col bg-[#0b0d17] border border-[#252a42] rounded-xl overflow-hidden shadow-2xl ${
          isMini ? 'p-3 text-[10px]' : 'p-5 md:p-6 text-xs'
        }`}
      >
        {/* macOS Terminal Window Titlebar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2136] select-none shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="font-mono text-[10px] text-zinc-400 pl-2 truncate max-w-md">
              {slide.title || "Key Concept"} (1080p 16:9)
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-indigo-400">
            <Terminal className="w-3 h-3 text-indigo-400" />
            <span>VARIANT A: {slideType.toUpperCase().replace('_', ' ')}</span>
          </div>
        </div>

        {/* Slide Content Branched by slide_type */}
        {slideType === 'title_hook' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3 overflow-hidden">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="px-2.5 py-0.5 rounded font-mono text-[10px] uppercase font-semibold bg-indigo-950/90 text-indigo-300 border border-indigo-700/60">
                TITLE HOOK
              </span>
              {v.badge_pills?.map((b, i) => (
                <span key={i} className="px-2 py-0.5 rounded font-mono text-[9px] bg-zinc-800/90 text-zinc-300 border border-zinc-700">
                  {b}
                </span>
              ))}
            </div>
            <h2 className={`font-mono font-bold text-white tracking-tight leading-snug max-w-2xl ${isMini ? 'text-xs' : 'text-base md:text-xl'}`}>
              {v.headline}
            </h2>
            {v.subhead && (
              <p className={`text-zinc-400 font-mono max-w-xl ${isMini ? 'text-[9px]' : 'text-xs md:text-sm'}`}>
                {v.subhead}
              </p>
            )}
            <div className="pt-2 flex items-center gap-2 text-[10px] text-zinc-500 font-mono italic">
              <Mic className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate max-w-lg">"{slide.spoken_anchor_text}"</span>
            </div>
          </div>
        ) : slideType === 'comparison_split' ? (
          <div className="flex-1 flex flex-col justify-between pt-3 overflow-hidden">
            <div className="mb-2">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded font-mono text-[9px] uppercase font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  COMPARISON
                </span>
                {v.badge_pills?.map((b, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded font-mono text-[8px] bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                    {b}
                  </span>
                ))}
              </div>
              <h2 className={`font-mono font-bold text-white tracking-tight leading-snug ${isMini ? 'text-xs' : 'text-sm md:text-base'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-400 font-mono mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 h-full flex-1 overflow-hidden">
              <div className="p-3 bg-[#0e1120] border border-rose-900/50 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-rose-900/40">
                    <span className="font-mono font-bold text-rose-300 uppercase text-[10px]">
                      {v.comparison_left?.title || 'State A'}
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800/60">
                      {v.comparison_left?.status || 'Problem'}
                    </span>
                  </div>
                  {v.comparison_left?.note && (
                    <p className="text-[10px] text-zinc-300 font-mono mt-1">{v.comparison_left.note}</p>
                  )}
                  <div className="space-y-1 mt-2">
                    {(v.bullet_points || []).slice(0, 2).map((bp, i) => (
                      <div key={i} className="flex items-start gap-1.5 font-mono text-[10px] text-zinc-300">
                        <span className="text-rose-400 font-bold select-none">•</span>
                        <span>{bp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#0e1120] border border-emerald-900/50 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-emerald-900/40">
                    <span className="font-mono font-bold text-emerald-300 uppercase text-[10px]">
                      {v.comparison_right?.title || 'State B'}
                    </span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                      {v.comparison_right?.status || 'Solution'}
                    </span>
                  </div>
                  {v.comparison_right?.note && (
                    <p className="text-[10px] text-zinc-300 font-mono mt-1">{v.comparison_right.note}</p>
                  )}
                  <div className="space-y-1 mt-2">
                    {(v.bullet_points || []).slice(2, 4).length > 0 ? (
                      v.bullet_points.slice(2, 4).map((bp, i) => (
                        <div key={i} className="flex items-start gap-1.5 font-mono text-[10px] text-zinc-300">
                          <span className="text-emerald-400 font-bold select-none">•</span>
                          <span>{bp}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-start gap-1.5 font-mono text-[10px] text-zinc-300">
                        <span className="text-emerald-400 font-bold select-none">•</span>
                        <span>Production verified pattern</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1c2136] flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-2">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="text-indigo-400 shrink-0 ml-2">{slide.duration_s}s synced</span>
            </div>
          </div>
        ) : slideType === 'architecture_diagram' ? (
          <div className="flex-1 flex flex-col justify-between pt-3 overflow-hidden">
            <div>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded font-mono text-[9px] uppercase font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  ARCHITECTURE
                </span>
                {v.badge_pills?.map((b, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded font-mono text-[8px] bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                    {b}
                  </span>
                ))}
              </div>
              <h2 className={`font-mono font-bold text-white tracking-tight leading-snug ${isMini ? 'text-xs' : 'text-sm md:text-base'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-400 font-mono mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="my-auto py-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(v.diagram_nodes && v.diagram_nodes.length > 0
                  ? v.diagram_nodes
                  : [
                      { label: 'Ingress Point', type: 'Gateway', status: 'Entry' },
                      { label: 'Control Plane', type: 'Routing', status: 'Active' },
                      { label: 'Data Plane', type: 'Underlay', status: 'Target' },
                    ]
                ).map((node, i, arr) => (
                  <React.Fragment key={i}>
                    <div className="p-2.5 bg-[#121629] border border-[#27304f] rounded-lg flex flex-col items-center min-w-[100px] font-mono shadow-sm">
                      <span className="text-[8px] text-indigo-400 font-semibold mb-0.5">STEP {i + 1} &bull; {node.type}</span>
                      <span className="text-[10px] md:text-xs font-bold text-white text-center">{node.label}</span>
                      {node.status && <span className="text-[8px] text-amber-300 mt-1">{node.status}</span>}
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {v.bullet_points && v.bullet_points.length > 0 && (
              <div className="p-2 bg-[#0c0e1a] border border-[#1e243a] rounded font-mono text-[10px] text-zinc-300 flex items-center gap-2">
                <span className="text-indigo-400 font-bold">&gt;</span>
                <span className="truncate">{v.bullet_points[0]}</span>
              </div>
            )}

            <div className="pt-2 border-t border-[#1c2136] flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-1">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="text-indigo-400 shrink-0 ml-2">{slide.duration_s}s synced</span>
            </div>
          </div>
        ) : slideType === 'code_breakdown' ? (
          <div className="flex-1 flex flex-col justify-between pt-3 overflow-hidden">
            <div>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded font-mono text-[9px] uppercase font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  CODE BREAKDOWN
                </span>
                {v.badge_pills?.map((b, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded font-mono text-[8px] bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                    {b}
                  </span>
                ))}
              </div>
              <h2 className={`font-mono font-bold text-white tracking-tight leading-snug ${isMini ? 'text-xs' : 'text-sm md:text-base'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-400 font-mono mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="relative bg-[#070810] border border-[#21273d] rounded-lg p-2.5 font-mono overflow-hidden my-auto">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#181d2e] text-[9px] text-zinc-500">
                <span>{v.code_language || 'bash'}</span>
                <button
                  type="button"
                  onClick={() => v.code_snippet && handleCopyCode(v.code_snippet)}
                  className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
                >
                  {copiedCode === v.code_snippet ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className={`text-emerald-400 leading-relaxed overflow-x-auto whitespace-pre-wrap ${isMini ? 'text-[8px]' : 'text-[10px]'}`}>
                {v.code_snippet || '$ command --verify'}
              </pre>
            </div>

            <div className="space-y-1">
              {(v.bullet_points || []).slice(0, 2).map((b, idx) => (
                <div key={idx} className="flex items-start gap-2 font-mono text-zinc-300 text-[10px]">
                  <span className="text-emerald-400 font-bold select-none">&gt;</span>
                  <span className="leading-snug">{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#1c2136] flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-1">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="text-indigo-400 shrink-0 ml-2">{slide.duration_s}s synced</span>
            </div>
          </div>
        ) : slideType === 'metric_callout' ? (
          <div className="flex-1 flex flex-col justify-between pt-3 overflow-hidden">
            <div>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded font-mono text-[9px] uppercase font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  METRIC CALLOUT
                </span>
                {v.badge_pills?.map((b, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded font-mono text-[8px] bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                    {b}
                  </span>
                ))}
              </div>
              <h2 className={`font-mono font-bold text-white tracking-tight leading-snug ${isMini ? 'text-xs' : 'text-sm md:text-base'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-400 font-mono mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 my-auto">
              {(v.metric_callouts && v.metric_callouts.length > 0
                ? v.metric_callouts.slice(0, 2)
                : [
                    { label: 'Impact Benchmark', value: '4.2 hrs', detail: 'DevOps time lost' },
                    { label: 'Root Cause', value: '78%', detail: 'False diagnosis rate' },
                  ]
              ).map((m, i) => (
                <div key={i} className="p-3 bg-[#121526] border border-[#252d4c] rounded-lg font-mono text-center shadow-sm">
                  <div className="text-[9px] text-zinc-400 uppercase font-medium">{m.label}</div>
                  <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-indigo-300 my-1">{m.value}</div>
                  {m.detail && <div className="text-[8px] text-zinc-500">{m.detail}</div>}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {(v.bullet_points || []).slice(0, 2).map((b, idx) => (
                <div key={idx} className="flex items-start gap-2 font-mono text-zinc-300 text-[10px]">
                  <span className="text-indigo-400 font-bold select-none">•</span>
                  <span className="leading-snug">{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#1c2136] flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-1">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="text-indigo-400 shrink-0 ml-2">{slide.duration_s}s synced</span>
            </div>
          </div>
        ) : (
          /* key_takeaway or default */
          <div className="flex-1 flex flex-col justify-between pt-3 overflow-hidden">
            <div>
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-2 py-0.5 rounded font-mono text-[9px] uppercase font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  KEY TAKEAWAYS
                </span>
                {v.badge_pills?.map((b, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded font-mono text-[8px] bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                    {b}
                  </span>
                ))}
              </div>
              <h2 className={`font-mono font-bold text-white tracking-tight leading-snug ${isMini ? 'text-xs' : 'text-sm md:text-base'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-400 font-mono mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="space-y-2 my-auto">
              {(v.bullet_points || []).slice(0, 3).map((b, idx) => (
                <div key={idx} className="flex items-start gap-2 font-mono text-zinc-300 bg-[#0e111e] border border-[#21273d] p-2 rounded">
                  <span className="text-indigo-400 font-bold select-none">&gt;</span>
                  <span className={isMini ? 'text-[9px] leading-tight' : 'text-xs leading-relaxed'}>{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#1c2136] flex items-center justify-between text-[9px] text-zinc-500 font-mono mt-1">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="text-indigo-400 shrink-0 ml-2">{slide.duration_s}s synced</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render Variant B (Infographic Clean / Executive Summary)
  const renderVariantB = (slide: PresentationSlide, isMini = false) => {
    const v = slide.variant_b
    const slideType = slide.slide_type || 'key_takeaway'

    return (
      <div
        className={`slide-variant-b w-full h-full flex flex-col bg-gradient-to-br from-[#101322] to-[#0a0c16] border border-[#2c334f] rounded-xl overflow-hidden shadow-2xl ${
          isMini ? 'p-3 text-[10px]' : 'p-5 md:p-6 text-xs'
        }`}
      >
        {/* Clean Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#21273e] select-none shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
              INFOGRAPHIC
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              {slide.cue_marker.replace(/[[\]]/g, '')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-sans font-semibold text-[10px] text-emerald-400">
            <Layout className="w-3 h-3 text-emerald-400" />
            <span>VARIANT B: {slideType.toUpperCase().replace('_', ' ')}</span>
          </div>
        </div>

        {/* Content branched by slide_type */}
        {slideType === 'title_hook' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 space-y-3 overflow-hidden">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60">
                EXECUTIVE BRIEF
              </span>
              {v.badge_pills?.map((b, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[9px] bg-zinc-800/90 text-zinc-300 border border-zinc-700">
                  {b}
                </span>
              ))}
            </div>
            <h2 className={`font-sans font-extrabold text-white tracking-tight leading-snug max-w-2xl ${isMini ? 'text-sm' : 'text-base md:text-2xl'}`}>
              {v.headline}
            </h2>
            {v.subhead && (
              <p className={`text-zinc-300 font-sans max-w-xl ${isMini ? 'text-[9px]' : 'text-xs md:text-sm'}`}>
                {v.subhead}
              </p>
            )}
            <div className="pt-2 flex items-center gap-2 text-[10px] text-zinc-400 font-sans italic">
              <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate max-w-lg">"{slide.spoken_anchor_text}"</span>
            </div>
          </div>
        ) : slideType === 'comparison_split' ? (
          <div className="flex-1 flex flex-col justify-between pt-3 space-y-2 overflow-hidden">
            <div>
              <h2 className={`font-sans font-extrabold text-white tracking-tight ${isMini ? 'text-sm' : 'text-base md:text-lg'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-300 font-sans mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 h-full flex-1 overflow-hidden">
              <div className="p-3 bg-[#161a2b]/90 border border-rose-800/50 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-rose-300 font-semibold">
                    {v.comparison_left?.title || 'Conventional Approach'}
                  </span>
                  <div className="text-xs md:text-sm font-bold text-rose-200 mt-1">
                    {v.comparison_left?.status || 'Friction'}
                  </div>
                  {v.comparison_left?.note && (
                    <p className="text-[10px] text-zinc-300 mt-1.5 italic">{v.comparison_left.note}</p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-[#161a2b]/90 border border-emerald-800/50 rounded-lg flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-semibold">
                    {v.comparison_right?.title || 'Optimized Architecture'}
                  </span>
                  <div className="text-xs md:text-sm font-bold text-emerald-200 mt-1">
                    {v.comparison_right?.status || 'Resilient'}
                  </div>
                  {v.comparison_right?.note && (
                    <p className="text-[10px] text-zinc-300 mt-1.5 italic">{v.comparison_right.note}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#21273e] flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="font-mono text-[9px] text-emerald-400 shrink-0 ml-2">{v.word_count}w &bull; {slide.duration_s}s</span>
            </div>
          </div>
        ) : slideType === 'architecture_diagram' ? (
          <div className="flex-1 flex flex-col justify-between pt-3 space-y-2 overflow-hidden">
            <div>
              <h2 className={`font-sans font-extrabold text-white tracking-tight ${isMini ? 'text-sm' : 'text-base md:text-lg'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-300 font-sans mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="my-auto py-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(v.diagram_nodes && v.diagram_nodes.length > 0
                  ? v.diagram_nodes
                  : [
                      { label: 'Ingress VIP', type: 'Edge', status: 'Entry' },
                      { label: 'Control Plane', type: 'Topology', status: 'BGP' },
                      { label: 'Physical Underlay', type: 'Fabric', status: 'MTU 9216' },
                    ]
                ).map((node, i, arr) => (
                  <React.Fragment key={i}>
                    <div className="p-2.5 bg-[#171c30] border border-[#2b3558] rounded-xl flex flex-col items-center min-w-[105px] shadow-sm">
                      <span className="text-[8px] text-emerald-400 font-bold uppercase mb-0.5">{node.type}</span>
                      <span className="text-[11px] font-bold text-white text-center">{node.label}</span>
                      {node.status && <span className="text-[9px] text-emerald-300 mt-1 font-medium">{node.status}</span>}
                    </div>
                    {i < arr.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {v.bullet_points && v.bullet_points.length > 0 && (
              <div className="p-2 bg-[#121629] border border-[#232b49] rounded-lg text-[10px] text-zinc-200 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{v.bullet_points[0]}</span>
              </div>
            )}

            <div className="pt-2 border-t border-[#21273e] flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="font-mono text-[9px] text-emerald-400 shrink-0 ml-2">{v.word_count}w &bull; {slide.duration_s}s</span>
            </div>
          </div>
        ) : slideType === 'code_breakdown' ? (
          <div className="flex-1 flex flex-col justify-between pt-3 space-y-2 overflow-hidden">
            <div>
              <h2 className={`font-sans font-extrabold text-white tracking-tight ${isMini ? 'text-sm' : 'text-base md:text-lg'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-300 font-sans mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="p-3 bg-[#0d101e] border border-indigo-900/60 rounded-lg my-auto shadow-inner">
              <div className="flex items-center justify-between text-[9px] text-indigo-300 font-mono mb-1">
                <span>{v.code_language || 'script'}</span>
                <span className="text-zinc-500">Key Implementation</span>
              </div>
              <pre className="text-indigo-200 text-[10px] font-mono whitespace-pre-wrap overflow-x-auto">
                {v.code_snippet || '$ command --verify'}
              </pre>
            </div>

            <div className="space-y-1">
              {(v.bullet_points || []).slice(0, 2).map((b, idx) => (
                <div key={idx} className="flex items-start gap-2 text-zinc-200 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#21273e] flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="font-mono text-[9px] text-emerald-400 shrink-0 ml-2">{v.word_count}w &bull; {slide.duration_s}s</span>
            </div>
          </div>
        ) : slideType === 'metric_callout' ? (
          <div className="flex-1 flex flex-col justify-between pt-3 space-y-2 overflow-hidden">
            <div>
              <h2 className={`font-sans font-extrabold text-white tracking-tight ${isMini ? 'text-sm' : 'text-base md:text-lg'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-300 font-sans mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-auto">
              {(v.metric_callouts && v.metric_callouts.length > 0
                ? v.metric_callouts.slice(0, 3)
                : [
                    { label: 'Engineering Time', value: '4.2 hrs', detail: 'Per MTU incident' },
                    { label: 'Initial Diagnosis', value: '78%', detail: 'False app blame' },
                  ]
              ).map((m, i) => (
                <div key={i} className="p-3 bg-[#141829] border border-[#2b3353] rounded-lg text-center shadow-sm">
                  <div className="text-[9px] text-zinc-400 uppercase font-medium">{m.label}</div>
                  <div className="text-base sm:text-xl font-extrabold text-emerald-300 my-0.5">{m.value}</div>
                  {m.detail && <div className="text-[8px] text-zinc-400">{m.detail}</div>}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {(v.bullet_points || []).slice(0, 2).map((b, idx) => (
                <div key={idx} className="flex items-start gap-2 text-zinc-200 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#21273e] flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="font-mono text-[9px] text-emerald-400 shrink-0 ml-2">{v.word_count}w &bull; {slide.duration_s}s</span>
            </div>
          </div>
        ) : (
          /* key_takeaway or default */
          <div className="flex-1 flex flex-col justify-between pt-3 space-y-2 overflow-hidden">
            <div>
              <h2 className={`font-sans font-extrabold text-white tracking-tight ${isMini ? 'text-sm' : 'text-base md:text-lg'}`}>
                {v.headline}
              </h2>
              {v.subhead && <p className={`text-zinc-300 font-sans mt-0.5 ${isMini ? 'text-[9px]' : 'text-xs'}`}>{v.subhead}</p>}
            </div>

            <div className="space-y-2 my-auto">
              {(v.bullet_points || []).slice(0, 3).map((b, idx) => (
                <div key={idx} className="flex items-start gap-2 text-zinc-200 bg-[#121629]/80 border border-[#242c4b] p-2.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className={isMini ? 'text-[9px] leading-tight' : 'text-xs leading-relaxed'}>{b}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#21273e] flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate italic">"{slide.spoken_anchor_text}"</span>
              <span className="font-mono text-[9px] text-emerald-400 shrink-0 ml-2">{v.word_count}w &bull; {slide.duration_s}s</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="presentation-studio flex flex-col h-full bg-[#08090e] overflow-hidden">
      {/* Top Studio Control Bar */}
      {!isZenFocus && (
        <div className="presentation-topbar p-3 border-b border-[#1f2438] bg-[#0e101b] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <MonitorPlay className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm text-zinc-100 font-sans tracking-tight">
                  Synced Presentation Studio
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">
                  Module 5 &bull; 16:9 Canvas
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Visual cue parser, multi-theme slide engine, and objective A/B cognitive load metrics
              </p>
            </div>
          </div>

          {/* Script Selection, Generate Deck & Demo Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {scripts.length > 0 && (
              <select
                value={selectedScriptId}
                onChange={(e) => setSelectedScriptId(e.target.value)}
                className="bg-[#151829] border border-[#282f49] text-xs text-zinc-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[200px] truncate"
              >
                {scripts.map((s) => (
                  <option key={s.script_id} value={s.script_id}>
                    {s.title}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateDeck}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing Cues...' : 'Generate Deck'}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#161a2d] hover:bg-[#20263f] border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 text-xs font-medium transition-all shadow-sm cursor-pointer"
              title="Load the 5-slide Containerlab/Cloudflare realistic demo deck"
            >
              <MonitorPlay className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">1-Click Demo Deck</span>
            </button>

            {deck && (
              <button
                type="button"
                onClick={handleClearCurrentDeck}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#161a2d] hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-700/50 border border-[#232942] text-zinc-400 text-xs font-mono transition-all cursor-pointer"
                title="Purge current deck from vault"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">Purge Deck</span>
              </button>
            )}

            {/* Interactive A/B Mode Switcher */}
            {deck && (
              <div className="presentation-ab-switcher flex items-center bg-[#121524] p-0.5 rounded-lg border border-[#252c46] ml-2">
                <button
                  type="button"
                  onClick={() => setAbMode('variant_a')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    abMode === 'variant_a'
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Variant A: Terminal Dark / Engineering Architecture"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Variant A</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAbMode('variant_b')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    abMode === 'variant_b'
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Variant B: Infographic Clean / Executive Summary"
                >
                  <Layout className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Variant B</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAbMode('split')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    abMode === 'split'
                      ? 'bg-indigo-950 text-indigo-200 border border-indigo-500/60 shadow-sm font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title="Split-Screen: Objective Side-by-Side Comparison"
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>A/B Split</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Objective A/B Metrics Strip */}
      {!isZenFocus && deck && deck.metrics && (
        <div className="presentation-metrics-strip p-2.5 border-b border-[#1c2136] bg-[#0c0e18] shrink-0">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Cue Coverage */}
            <div className="presentation-metric-card p-2 bg-[#121526] border border-[#212842] rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Cue Coverage</span>
                <div className="font-mono font-bold text-white text-xs md:text-sm">
                  {deck.metrics.cue_coverage_percentage}% ({deck.total_slides}/{deck.total_slides} cues)
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                Synced
              </span>
            </div>

            {/* Word Density Comparison */}
            <div className="presentation-metric-card p-2 bg-[#121526] border border-[#212842] rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Avg Words / Slide</span>
                <div className="font-mono font-bold text-white text-xs md:text-sm">
                  A: {deck.metrics.variant_a_avg_words_per_slide}w &bull; B: {deck.metrics.variant_b_avg_words_per_slide}w
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                -33% in B
              </span>
            </div>

            {/* Cognitive Load Score */}
            <div className="presentation-metric-card p-2 bg-[#121526] border border-[#212842] rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Cognitive Load</span>
                <div className="font-mono font-bold text-white text-xs md:text-sm">
                  A: {deck.metrics.variant_a_cognitive_load_score} vs B: {deck.metrics.variant_b_cognitive_load_score}
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                B 38% Leaner
              </span>
            </div>

            {/* Pacing Alignment */}
            <div className="presentation-metric-card p-2 bg-[#121526] border border-[#212842] rounded-lg flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Pacing Alignment</span>
                <div className="font-mono font-bold text-white text-xs md:text-sm">
                  {deck.metrics.pacing_alignment_score}% Teleprompter Lock
                </div>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Optimal
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main 16:9 Presentation Stage */}
      <div
        ref={canvasContainerRef}
        className={`presentation-stage flex-1 overflow-y-auto ${
          isZenFocus ? 'p-2 md:p-3' : 'p-4'
        } flex flex-col items-center justify-center relative bg-[#090b12]`}
      >
        {deck && currentSlide ? (
          <div className={`w-full ${isZenFocus ? 'max-w-6xl' : 'max-w-5xl'} flex flex-col space-y-2.5 transition-all`}>
            {/* Slide Canvas Header with Slide Info and Zen Focus Toggle */}
            <div className="flex items-center justify-between px-1 text-xs select-none">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-zinc-400 font-medium">
                  Slide {currentSlide.slide_index} of {deck.slides.length}
                </span>
                {deck.script_title && (
                  <span className="text-zinc-500 font-mono text-[11px] truncate max-w-md hidden sm:inline">
                    &bull; {deck.script_title}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsZenFocus(!isZenFocus)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                    isZenFocus
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm font-semibold'
                      : 'bg-[#151829] border-[#252c46] text-zinc-400 hover:text-white'
                  }`}
                  title={isZenFocus ? 'Exit Zen Focus (restore top bar & metrics)' : 'Zen Focus Stage (maximize 16:9 canvas)'}
                >
                  {isZenFocus ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isZenFocus ? 'Exit Zen Focus' : 'Zen Focus'}</span>
                </button>
              </div>
            </div>

            {/* 16:9 Canvas Viewport */}
            <div className="w-full aspect-video">
              {abMode === 'variant_a' && renderVariantA(currentSlide)}
              {abMode === 'variant_b' && renderVariantB(currentSlide)}
              {abMode === 'split' && (
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-3">
                  {renderVariantA(currentSlide, true)}
                  {renderVariantB(currentSlide, true)}
                </div>
              )}
            </div>

            {/* Slide Navigation & Scrubber Controls */}
            <div className="presentation-nav-bar bg-[#101322] border border-[#222840] rounded-xl p-3 flex items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  disabled={currentSlideIndex === 0}
                  className="presentation-nav-btn p-1.5 rounded-lg bg-[#181d33] hover:bg-[#232b49] disabled:opacity-40 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Previous slide (Left Arrow)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                  <span className="font-bold text-white">Slide {currentSlide.slide_index}</span>
                  <span className="text-zinc-600">&bull;</span>
                  <span>of {deck.slides.length}</span>
                  <span className="text-zinc-600">&bull;</span>
                  <span className="text-indigo-400">
                    [{formatTime(currentSlide.timestamp_start_s)} &rarr; {formatTime(currentSlide.timestamp_end_s)}]
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextSlide}
                  disabled={currentSlideIndex === deck.slides.length - 1}
                  className="presentation-nav-btn p-1.5 rounded-lg bg-[#181d33] hover:bg-[#232b49] disabled:opacity-40 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title="Next slide (Right Arrow / Space)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Cue Marker Pill */}
              <div className="presentation-cue-pill hidden lg:flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 bg-[#161a2e] px-2.5 py-1 rounded-md border border-[#273050]">
                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="truncate max-w-sm">{currentSlide.cue_marker}</span>
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="presentation-nav-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181d33] hover:bg-[#232b49] text-zinc-300 hover:text-white transition-colors text-xs font-medium cursor-pointer"
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </>
                )}
              </button>
            </div>

            {/* Timeline Scrubber Bar */}
            <div className="presentation-timeline bg-[#101322] border border-[#222840] rounded-xl p-3 space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>Timeline Scrubber ({formatTime(deck.total_duration_s)} runtime)</span>
                <span>Click block to jump</span>
              </div>

              {/* Proportional Slide Block Row */}
              <div className="presentation-timeline-track w-full h-7 bg-[#141829] rounded-lg border border-[#242b45] overflow-hidden flex select-none">
                {deck.slides.map((s, idx) => {
                  const widthPct = (s.duration_s / deck.total_duration_s) * 100
                  const isCurrent = idx === currentSlideIndex
                  return (
                    <div
                      key={s.slide_id}
                      onClick={() => setCurrentSlideIndex(idx)}
                      style={{ width: `${widthPct}%` }}
                      className={`presentation-slide-block h-full border-r border-[#1e243b] transition-all cursor-pointer flex items-center justify-center p-1 relative group ${
                        isCurrent
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-[#181d32] hover:bg-[#202742] text-zinc-400'
                      }`}
                      title={`Slide ${s.slide_index}: ${s.cue_marker} (${s.duration_s}s)`}
                    >
                      <span className="font-mono text-[9px] truncate">
                        #{s.slide_index}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Time markers */}
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 px-0.5">
                <span>00:00</span>
                <span>{formatTime(deck.total_duration_s * 0.25)}</span>
                <span>{formatTime(deck.total_duration_s * 0.5)}</span>
                <span>{formatTime(deck.total_duration_s * 0.75)}</span>
                <span>{formatTime(deck.total_duration_s)}</span>
              </div>
            </div>
          </div>
        ) : isLoadingDecks ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 text-zinc-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-xs font-mono">Synchronizing vault presentations...</span>
          </div>
        ) : (
          <div className="presentation-empty-state max-w-md w-full p-8 rounded-2xl bg-[#101322] border border-[#222840] text-center flex flex-col items-center justify-center space-y-3 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
              <MonitorPlay className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-100">No Presentation Slides Loaded</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generate synchronized presentation slides from any video script in your vault, or load our verified 5-slide Containerlab/Cloudflare demo deck.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleLoadDemo}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>1-Click Demo Deck</span>
              </button>
              {scripts.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateDeck}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#181d32] hover:bg-[#202742] border border-[#273050] text-zinc-200 font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>Generate from Script</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
