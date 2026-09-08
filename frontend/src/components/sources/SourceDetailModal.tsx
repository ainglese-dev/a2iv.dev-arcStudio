import React, { useEffect, useState } from 'react'
import {
  X,
  FileText,
  Clock,
  Search,
  ExternalLink,
  Layers,
  Copy,
  Check,
  Calendar,
  User,
  Tag,
} from 'lucide-react'
import { api } from '../../services/api'
import type { SourceDetail } from '../../types'

interface SourceDetailModalProps {
  sourceId: string | null
  isOpen: boolean
  onClose: () => void
}

export const SourceDetailModal: React.FC<SourceDetailModalProps> = ({
  sourceId,
  isOpen,
  onClose,
}) => {
  const [detail, setDetail] = useState<SourceDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && sourceId) {
      setLoading(true)
      api
        .getSource(sourceId)
        .then((res) => setDetail(res))
        .catch((err) => console.error('Failed to fetch source details', err))
        .finally(() => setLoading(false))
    } else {
      setDetail(null)
      setSearchQuery('')
    }
  }, [isOpen, sourceId])

  if (!isOpen || !sourceId) return null

  const filteredChunks = detail?.chunks?.filter((c) =>
    searchQuery.trim()
      ? c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.chunk_id.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  ) || []

  const handleCopyChunk = (chunkId: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedChunkId(chunkId)
    setTimeout(() => setCopiedChunkId(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#12141e] border border-[#272c40] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#232738] flex items-center justify-between bg-[#151824]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-white text-sm truncate">
                {detail?.metadata.title || 'Source Inspector'}
              </h3>
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="font-mono text-[11px] text-zinc-500">{sourceId}</span>
                {detail?.metadata.author && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {detail.metadata.author}
                  </span>
                )}
                {detail?.metadata.url && (
                  <a
                    href={detail.metadata.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Link
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-header / Stats bar */}
        <div className="px-5 py-2.5 bg-[#0f111a] border-b border-[#202434] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-zinc-400">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <strong className="text-zinc-200 font-semibold">{detail?.chunks.length || 0}</strong> Chunks
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <strong className="text-zinc-200 font-semibold">
                {detail?.chunks.reduce((acc, c) => acc + c.word_count, 0).toLocaleString() || 0}
              </strong>{' '}
              Total Words
            </span>
            {detail?.metadata.created_at && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-500">
                <Calendar className="w-3 h-3" />
                {new Date(detail.metadata.created_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Tags */}
          {detail?.metadata.tags && detail.metadata.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="w-3 h-3 text-zinc-500" />
              {detail.metadata.tags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/60 font-mono"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search & Filter within chunks */}
        <div className="p-3 border-b border-[#232738] bg-[#12141e]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search text within chunks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181b28] border border-[#282d42] rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
              <span>Loading source chunks...</span>
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              No chunks match the current search.
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.chunk_id}
                className="bg-[#161826] border border-[#262a3d] hover:border-zinc-700 rounded-lg p-3.5 space-y-2 transition-colors group"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                      Chunk #{chunk.chunk_index}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">{chunk.chunk_id}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {(chunk.timestamp_start || chunk.timestamp_end) && (
                      <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400/90 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">
                        <Clock className="w-3 h-3" />
                        {chunk.timestamp_start || '00:00'} - {chunk.timestamp_end || '...'}
                      </span>
                    )}

                    <span className="font-mono text-[10px] text-zinc-500">
                      {chunk.word_count} words ({chunk.char_count} chars)
                    </span>

                    <button
                      onClick={() => handleCopyChunk(chunk.chunk_id, chunk.text)}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      title="Copy chunk text"
                    >
                      {copiedChunkId === chunk.chunk_id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-zinc-300 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text bg-[#11131d] p-3 rounded border border-zinc-800/50 max-h-48 overflow-y-auto">
                  {chunk.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
