import React, { useRef, useState } from 'react'
import {
  Quote,
  Clock,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Tag,
  Layers,
} from 'lucide-react'
import type { AtomicFact, ConfidenceLevel, FactCategory } from '../../types'

interface FactCardProps {
  fact: AtomicFact
  onDelete?: (factId: string) => void
}

export const FactCard: React.FC<FactCardProps> = ({ fact, onDelete }) => {
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirmDelete) {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      setConfirmDelete(false)
      onDelete?.(fact.fact_id)
    } else {
      setConfirmDelete(true)
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmDelete(false)
      }, 3000)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(fact.statement)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getCategoryBadge = (category: FactCategory | string) => {
    switch (category) {
      case 'technical_spec':
        return 'bg-blue-950/70 text-blue-300 border-blue-800/60'
      case 'benchmark_metric':
      case 'metric':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
      case 'workflow_step':
        return 'bg-purple-950/70 text-purple-300 border-purple-800/60'
      case 'architecture_decision':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60'
      case 'pitfall_caveat':
        return 'bg-amber-950/70 text-amber-300 border-amber-800/60'
      case 'code_pattern':
        return 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60'
      case 'tool_command':
        return 'bg-teal-950/70 text-teal-300 border-teal-800/60'
      case 'claim':
        return 'bg-rose-950/70 text-rose-300 border-rose-800/60'
      case 'definition':
        return 'bg-sky-950/70 text-sky-300 border-sky-800/60'
      case 'takeaway':
        return 'bg-violet-950/70 text-violet-300 border-violet-800/60'
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700'
    }
  }

  const getConfidenceBadge = (confidence: ConfidenceLevel | string) => {
    switch (confidence) {
      case 'verified':
      case 'high':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">
            <ShieldCheck className="w-3 h-3" />
            <span className="capitalize">{confidence}</span>
          </span>
        )
      case 'inferred':
      case 'medium':
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/50">
            <AlertTriangle className="w-3 h-3" />
            <span className="capitalize">{confidence}</span>
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-800/40 px-1.5 py-0.5 rounded border border-zinc-700/50">
            <HelpCircle className="w-3 h-3" />
            <span className="capitalize">{confidence}</span>
          </span>
        )
    }
  }

  return (
    <div className="fact-card bg-[#141624] border border-[#24293d] hover:border-zinc-700 rounded-lg p-3.5 space-y-2.5 transition-all shadow-sm group">
      {/* Top Header: Category badge + Confidence + Action buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-medium uppercase tracking-wider ${getCategoryBadge(
              fact.category
            )}`}
          >
            {fact.category.replace('_', ' ')}
          </span>
          {getConfidenceBadge(fact.confidence)}
        </div>

        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Copy statement"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all flex items-center gap-1 ${
                confirmDelete
                  ? 'bg-rose-600 text-white border border-rose-500 animate-pulse font-semibold'
                  : 'hover:bg-rose-950/80 text-zinc-500 hover:text-rose-400 border border-transparent'
              }`}
              title={confirmDelete ? 'Click again to permanently delete fact' : 'Delete fact note'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {confirmDelete && <span>Confirm?</span>}
            </button>
          )}
        </div>
      </div>

      {/* Atomic Statement */}
      <div className="fact-statement text-zinc-100 text-xs font-normal leading-relaxed">
        {fact.statement}
      </div>

      {/* Verbatim Anchor Quote in Obsidian Callout Style */}
      {fact.exact_quote && (
        <div className="obsidian-callout border-l-2 border-indigo-500 bg-indigo-950/20 rounded-r-md p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-indigo-300 font-medium">
            <span className="flex items-center gap-1">
              <Quote className="w-3 h-3 text-indigo-400" />
              <span>Source Evidence</span>
            </span>
            {fact.timestamp_range && (
              <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
                <Clock className="w-2.5 h-2.5" /> {fact.timestamp_range}
              </span>
            )}
          </div>
          <p className="fact-evidence-quote text-[11px] text-zinc-300 italic font-mono leading-relaxed pl-1">
            "{fact.exact_quote}"
          </p>
        </div>
      )}

      {/* Footer Info: Source ID, Chunk ID, Tags */}
      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-500 flex-wrap gap-2">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-zinc-400 flex items-center gap-1 truncate max-w-[150px]">
            <Layers className="w-2.5 h-2.5 text-zinc-500" />
            {fact.source_id}
          </span>
          {fact.source_chunk_id && (
            <span className="text-zinc-500 truncate max-w-[120px]">
              {fact.source_chunk_id}
            </span>
          )}
        </div>

        {fact.tags && fact.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-2.5 h-2.5 text-zinc-600" />
            {fact.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="fact-tag-pill text-[10px] px-1 py-0.2 bg-zinc-900 text-zinc-400 rounded border border-zinc-800 font-mono"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
