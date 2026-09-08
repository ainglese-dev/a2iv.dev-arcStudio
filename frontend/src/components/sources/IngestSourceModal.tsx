import React, { useState } from 'react'
import {
  X,
  UploadCloud,
  FileText,
  Video,
  Settings,
  AlertCircle,
  Calendar,
  Compass,
  Sparkles,
} from 'lucide-react'
import { api } from '../../services/api'
import type { IngestSourceRequest, SourceType, ToastItem } from '../../types'
import { SeedPractitionerModal } from './SeedPractitionerModal'

interface IngestSourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
  onOpenSeedReality?: () => void
}

interface RealityPreset {
  name: string
  tag: string
  title: string
  sourceType: SourceType
  author: string
  content: string
  tags: string
}

const REALITY_PRESETS: RealityPreset[] = [
  {
    name: 'Containerlab CI/CD',
    tag: 'DevOps Incident',
    title: 'Incident Post-Mortem: Ephemeral Containerlab NOS Topologies in GitHub Actions',
    sourceType: 'documentation',
    author: 'Infrastructure SRE Team',
    tags: 'containerlab, ci-cd, incident, bgp, docker',
    content: `# Incident Report: Virtual Network Fabric Flapping in Ephemeral CI Runners

## Executive Summary
During automated pull-request validation for core spine-leaf BGP updates, virtual containerized Arista cEOS instances exhausted host system memory and kernel ARP cache tables, causing false-positive CI pipeline failures and route flap dampening across shared test runners.

## Root Cause Analysis
1. Linux Bridge MTU mismatch between veth pairs (1500 vs 9000 bytes) dropped jumbo keepalive frames.
2. Default net.ipv4.neigh.default.gc_thresh3 limit (1024) was exceeded by 14 parallel test topologies.
3. Linux kernel silently dropped neighbor solicitations, manifesting as intermittent BGP hold-timer expiry.

## Remediation & Hardening
- Enforce strict sysctl tuning in runner bootstrapping:
  sysctl -w net.ipv4.neigh.default.gc_thresh3=8192
- Enforce automated cgroup memory limits of 1.5GB per cEOS container node in Containerlab YAML manifests.
- Pre-validate interface MTU via automated pre-commit hook before launching topology.`,
  },
  {
    name: 'BGP Route Flap',
    tag: 'Network Engineering',
    title: 'Technical Deep-Dive: BGP Route Flap Damping & Recursive Route Leak Cascades',
    sourceType: 'article',
    author: 'Edge Network Engineering',
    tags: 'bgp, route-flapping, rpki, anycast, edge',
    content: `# BGP Flap Damping in Modern Anycast Edge Networks

## The Architectural Flaw
Route Flap Damping (RFC 2439) was designed to protect the internet routing table from flapping prefixes. However, when applied to multi-homed BGP anycast services, transient link resets trigger suppress penalties that can blackhole global anycast ingress for 30 to 60 minutes after the underlying link has fully recovered.

## Observed Failure Mode
- Tier-1 transit provider receives route withdrawal due to fiber cut.
- Path hunting occurs across 4 alternative AS paths within 200ms.
- Damping algorithm interprets path hunting as multiple distinct flaps.
- Penalty score crosses 2000 suppress threshold, isolating the regional PoP.

## Recommendations
1. Disable RFC 2439 flap damping for customer anycast prefixes.
2. Implement BGP Graceful Restart and Longest Prefix Match filtering at the border tier.
3. Utilize RPKI ROV with automated prefix validation before announcing anycast aggregates.`,
  },
  {
    name: 'vLLM PagedAttention',
    tag: 'AI Infrastructure',
    title: 'Systems Paper Analysis: High-Throughput LLM Serving via PagedAttention and Chunked Prefill',
    sourceType: 'article',
    author: 'AI Systems Lab',
    tags: 'vllm, paged-attention, kv-cache, cuda, inference',
    content: `# PagedAttention & Chunked Prefill: Eliminating Memory Waste in LLM Inference

## Problem Formulation
In traditional LLM serving engines, the Key-Value (KV) cache for a request is stored in contiguous virtual memory. Because requests have variable lengths, engines must pre-allocate contiguous slots for the maximum sequence length (e.g. 2048 or 4096 tokens). This results in:
- Internal fragmentation (unused allocated memory within a sequence).
- External fragmentation (unusable memory gaps between requests).
- Over 60-80% of GPU VRAM wasted on empty slots.

## PagedAttention Architecture
PagedAttention partitions the KV-cache into discrete memory blocks, modeled after virtual memory paging in operating systems. A block table maps logical token blocks to physical GPU memory pages.
- Memory waste is reduced to less than 4% (only the final incomplete page).
- Enables copy-on-write memory sharing for parallel sampling and beam search.

## Chunked Prefill Optimization
Chunking large prompts into smaller batches interleaves prompt prefill with token decode steps, preventing prompt evaluations from causing latency spikes in active generation requests.`,
  },
]


export const IngestSourceModal: React.FC<IngestSourceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onToast,
  onOpenSeedReality,
}) => {
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('youtube_transcript')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [author, setAuthor] = useState('')
  const [publishedDate, setPublishedDate] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [chunkSize, setChunkSize] = useState(1500)
  const [chunkOverlap, setChunkOverlap] = useState(200)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false)

  if (!isOpen) return null

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length
  const estimatedChunks = Math.max(1, Math.ceil(charCount / (chunkSize - chunkOverlap || 1300)))

  const handleApplyPreset = (preset: RealityPreset) => {
    setTitle(preset.title)
    setSourceType(preset.sourceType)
    setContent(preset.content)
    setAuthor(preset.author)
    setTagsInput(preset.tags)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please provide a source title.')
      return
    }
    if (!content.trim()) {
      setError('Please paste the transcript or text content to ingest.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const payload: IngestSourceRequest = {
      title: title.trim(),
      content: content.trim(),
      source_type: sourceType,
      url: url.trim() || undefined,
      author: author.trim() || undefined,
      published_date: publishedDate.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
    }

    try {
      await api.ingestSource(payload)
      // Reset form
      setTitle('')
      setContent('')
      setUrl('')
      setAuthor('')
      setPublishedDate('')
      setTagsInput('')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to ingest source.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#12141e] border border-[#272c40] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#232738] flex items-center justify-between bg-[#151824]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-white text-sm">Ingest Research Source</h3>
              <p className="text-xs text-zinc-400">Add YouTube transcripts, articles, or notes into Fact Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seed Reality Button in Top Right */}
            <button
              type="button"
              onClick={() => {
                if (onOpenSeedReality) {
                  onOpenSeedReality()
                } else {
                  setIsSeedModalOpen(true)
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-semibold transition-all shadow-sm hover:shadow-indigo-500/20 group"
              title="Seed grounded anti-marketing research brief and verified atomic facts"
            >
              <Compass className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-45 transition-transform" />
              <span>Seed Reality</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Quick Reality Presets Bar */}
          <div className="reality-presets-bar p-2.5 rounded-lg bg-[#151824] border border-[#232738] flex items-center gap-2 overflow-x-auto text-xs">
            <span className="reality-presets-label text-zinc-400 font-medium flex items-center gap-1 shrink-0 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Reality Presets:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {REALITY_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="reality-preset-btn px-2.5 py-1 rounded-md bg-[#181b28] hover:bg-[#202538] border border-[#282d42] hover:border-indigo-500/50 text-zinc-300 hover:text-white transition-all text-[11px] font-medium shrink-0 shadow-sm flex items-center gap-1"
                  title={`Prefill form with ${preset.title}`}
                >
                  <span>{preset.name}</span>
                  <span className="preset-tag text-zinc-500 text-[10px]">({preset.tag})</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-zinc-300 font-medium">Source Title *</label>
              <input
                type="text"
                placeholder="e.g. Building Production RAG Systems"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-[#181b28] border border-[#282d42] rounded-md px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">Source Type</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full bg-[#181b28] border border-[#282d42] rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="youtube_transcript">YouTube Transcript</option>
                <option value="article">Article / Blog</option>
                <option value="documentation">Documentation</option>
                <option value="pdf">PDF / Paper</option>
                <option value="manual_note">Manual Note</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* URL, Author & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-zinc-400" /> Source URL
              </label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#181b28] border border-[#282d42] rounded-md px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">Author / Channel</label>
              <input
                type="text"
                placeholder="e.g. Andrej Karpathy"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[#181b28] border border-[#282d42] rounded-md px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Published Date
              </label>
              <input
                type="date"
                value={publishedDate}
                onChange={(e) => setPublishedDate(e.target.value)}
                className="w-full bg-[#181b28] border border-[#282d42] rounded-md px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <label className="text-zinc-300 font-medium">Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. llm, rag, benchmarks, architecture"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-[#181b28] border border-[#282d42] rounded-md px-3 py-2 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Content / Transcript */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-zinc-400" /> Content / Transcript *
              </label>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                <span>{wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>{charCount.toLocaleString()} chars</span>
                <span>•</span>
                <span className="text-indigo-400">~{estimatedChunks} chunks</span>
              </div>
            </div>
            <textarea
              rows={9}
              placeholder="Paste transcript with or without timestamps, or article text here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full bg-[#181b28] border border-[#282d42] rounded-md p-3 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 font-mono text-xs leading-relaxed transition-colors resize-y"
            />
          </div>

          {/* Advanced Chunking Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-xs font-medium"
            >
              <Settings className="w-3 h-3" />
              <span>{showAdvanced ? 'Hide chunking parameters' : 'Advanced chunking options'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 rounded-lg bg-[#181b28] border border-[#282d42] grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px]">Chunk Size (chars)</label>
                  <input
                    type="number"
                    min={300}
                    max={5000}
                    step={100}
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    className="w-full bg-[#12141e] border border-[#282d42] rounded px-2.5 py-1.5 text-zinc-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 text-[11px]">Chunk Overlap (chars)</label>
                  <input
                    type="number"
                    min={50}
                    max={1000}
                    step={50}
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    className="w-full bg-[#12141e] border border-[#282d42] rounded px-2.5 py-1.5 text-zinc-200 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-[#232738] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium shadow-sm transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Ingesting & Chunking...' : 'Ingest to Vault'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Seed Practitioner Reality Sub-Modal */}
      <SeedPractitionerModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        onSuccess={() => {
          setIsSeedModalOpen(false)
          onSuccess()
          onClose()
        }}
        onToast={onToast}
      />
    </div>
  )
}
