import React, { useRef, useState } from 'react'
import {
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  Video,
  FileText,
  BookOpen,
  HelpCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import type { SourceMetadata, ToastItem } from '../../types'
import { IngestSourceModal } from './IngestSourceModal'
import { SourceDetailModal } from './SourceDetailModal'

interface SourceListProps {
  sources: SourceMetadata[]
  selectedSourceId: string | null
  onSelectSource: (sourceId: string | null) => void
  onExtractFacts: (sourceId: string) => void
  onDeleteSource: (sourceId: string) => void
  onRefreshSources: () => void
  extractingSourceId: string | null
  isLoading?: boolean
  onToast?: (toast: Omit<ToastItem, 'id'>) => void
  onRefreshAll?: () => Promise<void> | void
}

export const SourceList: React.FC<SourceListProps> = ({
  sources,
  selectedSourceId,
  onSelectSource,
  onExtractFacts,
  onDeleteSource,
  onRefreshSources,
  extractingSourceId,
  isLoading,
  onToast,
  onRefreshAll,
}) => {
  const [search, setSearch] = useState('')
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false)
  const [inspectingSourceId, setInspectingSourceId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const deleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredSources = sources.filter((s) =>
    search.trim()
      ? s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.author?.toLowerCase().includes(search.toLowerCase()) ||
        s.source_id.toLowerCase().includes(search.toLowerCase()) ||
        s.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      : true
  )

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'youtube_transcript':
        return <Video className="w-3.5 h-3.5 text-rose-400" />
      case 'article':
        return <FileText className="w-3.5 h-3.5 text-sky-400" />
      case 'documentation':
        return <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
    }
  }

  const handleDelete = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation()
    if (pendingDeleteId === sourceId) {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
      setPendingDeleteId(null)
      setDeletingId(sourceId)
      onDeleteSource(sourceId)
    } else {
      setPendingDeleteId(sourceId)
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
      deleteTimeoutRef.current = setTimeout(() => {
        setPendingDeleteId(null)
      }, 3000)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0f17]">
      {/* Panel Header */}
      <div className="p-3 border-b border-[#232738] bg-[#111420] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h2 className="font-semibold text-sm text-zinc-100 font-sans tracking-tight">Sources</h2>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
            {sources.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsIngestModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingest</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2.5 border-b border-[#232738] bg-[#0f111a]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Filter sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#181b28] border border-[#282d42] rounded-md pl-8 pr-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {selectedSourceId && (
          <div className="mt-2 flex items-center justify-between text-[11px] px-1 text-zinc-400">
            <span className="truncate">
              Filtering: <span className="text-indigo-300 font-mono">{selectedSourceId}</span>
            </span>
            <button
              onClick={() => onSelectSource(null)}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              Clear filter
            </button>
          </div>
        )}
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading sources...</span>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <Layers className="w-8 h-8 text-zinc-600 mb-2 stroke-[1.5]" />
            <p className="text-xs text-zinc-400 font-medium">No sources ingested yet</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px]">
              Ingest a YouTube transcript or markdown article to begin extracting atomic facts.
            </p>
            <button
              onClick={() => setIsIngestModalOpen(true)}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Source</span>
            </button>
          </div>
        ) : (
          filteredSources.map((source) => {
            const isSelected = selectedSourceId === source.source_id
            const isExtracting = extractingSourceId === source.source_id

            return (
              <div
                key={source.source_id}
                onClick={() => onSelectSource(isSelected ? null : source.source_id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer group text-left relative ${
                  isSelected
                    ? 'bg-[#181c2d] border-indigo-500/80 ring-1 ring-indigo-500/30 shadow-md'
                    : 'bg-[#131622] border-[#24283b] hover:border-zinc-700 hover:bg-[#161a29]'
                }`}
              >
                {/* Top Row: Type & Title */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="p-1 rounded bg-[#1c2030] shrink-0">
                      {getSourceIcon(source.source_type)}
                    </span>
                    <h4 className="font-medium text-xs text-zinc-100 truncate group-hover:text-white">
                      {source.title}
                    </h4>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  )}
                </div>

                {/* Sub info */}
                <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                  {source.author && <span className="truncate">{source.author}</span>}
                  {source.author && <span>•</span>}
                  <span className="font-mono text-zinc-500 text-[10px] truncate">
                    {source.source_id}
                  </span>
                </div>

                {/* Metrics Pill Row */}
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-800/60">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="bg-[#1a1d2c] px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-800">
                      {source.total_chunks} chunks
                    </span>
                    {typeof source.fact_count === 'number' && (
                      <span className="bg-indigo-950/60 px-1.5 py-0.5 rounded text-indigo-300 border border-indigo-900/60">
                        {source.fact_count} facts
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {/* Inspect Chunks */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setInspectingSourceId(source.source_id)
                      }}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Inspect chunks and text"
                    >
                      <Eye className="w-3 h-3" />
                    </button>

                    {/* Trigger Fact Extraction */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExtractFacts(source.source_id)
                      }}
                      disabled={isExtracting}
                      className="p-1 rounded hover:bg-indigo-950/80 text-indigo-400 hover:text-indigo-300 transition-colors"
                      title="Extract atomic facts from this source"
                    >
                      <Sparkles
                        className={`w-3 h-3 ${isExtracting ? 'animate-spin text-amber-400' : ''}`}
                      />
                    </button>

                    {/* External Link if URL */}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Open external source URL"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(e, source.source_id)}
                      disabled={deletingId === source.source_id}
                      className={`px-1.5 py-0.5 rounded transition-all flex items-center gap-1 text-[10px] font-mono ${
                        pendingDeleteId === source.source_id
                          ? 'bg-rose-600 text-white border border-rose-500 animate-pulse font-semibold'
                          : 'hover:bg-rose-950/80 text-zinc-500 hover:text-rose-400 border border-transparent'
                      }`}
                      title={pendingDeleteId === source.source_id ? 'Click again to permanently delete source' : 'Delete source'}
                    >
                      <Trash2 className="w-3 h-3" />
                      {pendingDeleteId === source.source_id && <span>Confirm?</span>}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modals */}
      <IngestSourceModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={async () => {
          if (onRefreshAll) {
            await onRefreshAll()
          } else {
            onRefreshSources()
          }
        }}
        onToast={onToast}
      />

      <SourceDetailModal
        sourceId={inspectingSourceId}
        isOpen={Boolean(inspectingSourceId)}
        onClose={() => setInspectingSourceId(null)}
      />
    </div>
  )
}
