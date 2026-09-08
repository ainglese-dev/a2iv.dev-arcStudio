import React, { useState } from 'react'
import {
  Sparkles,
  Search,
  Database,
  Filter,
  X,
  Layers,
} from 'lucide-react'
import type { AtomicFact, SourceMetadata } from '../../types'
import { FactCard } from './FactCard'

interface FactInspectorProps {
  facts: AtomicFact[]
  sources: SourceMetadata[]
  selectedSourceId: string | null
  onSelectSource: (sourceId: string | null) => void
  onExtractFacts: (sourceId: string) => void
  onDeleteFact: (factId: string) => void
  extractingSourceId: string | null
  isLoading: boolean
}

// Category filter tabs matching blueprint
const CATEGORY_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Spec', value: 'technical_spec' },
  { label: 'Metric', value: 'benchmark_metric' },
  { label: 'Architecture', value: 'architecture_decision' },
  { label: 'Pitfall', value: 'pitfall_caveat' },
  { label: 'Workflow', value: 'workflow_step' },
  { label: 'Code', value: 'code_pattern' },
  { label: 'Claim', value: 'claim' },
  { label: 'Takeaway', value: 'takeaway' },
]

export const FactInspector: React.FC<FactInspectorProps> = ({
  facts,
  sources,
  selectedSourceId,
  onSelectSource,
  onExtractFacts,
  onDeleteFact,
  extractingSourceId,
  isLoading,
}) => {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Filter facts by search, category, and source
  const filteredFacts = facts.filter((fact) => {
    // Source filter
    if (selectedSourceId && fact.source_id !== selectedSourceId) {
      return false
    }

    // Category filter
    if (selectedCategory !== 'all') {
      const cat = fact.category.toLowerCase()
      if (selectedCategory === 'benchmark_metric') {
        if (cat !== 'benchmark_metric' && cat !== 'metric') return false
      } else if (selectedCategory === 'technical_spec') {
        if (cat !== 'technical_spec' && cat !== 'definition') return false
      } else if (cat !== selectedCategory.toLowerCase()) {
        return false
      }
    }

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchStatement = fact.statement.toLowerCase().includes(q)
      const matchQuote = fact.exact_quote?.toLowerCase().includes(q)
      const matchTags = fact.tags?.some((t) => t.toLowerCase().includes(q))
      const matchCategory = fact.category.toLowerCase().includes(q)
      return matchStatement || matchQuote || matchTags || matchCategory
    }

    return true
  })

  const selectedSource = sources.find((s) => s.source_id === selectedSourceId)
  const isExtractingSelected = Boolean(
    selectedSourceId && extractingSourceId === selectedSourceId
  )

  return (
    <div className="flex flex-col h-full bg-[#0b0d14]">
      {/* Panel Header */}
      <div className="p-3 border-b border-[#232738] bg-[#111420] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <h2 className="font-semibold text-sm text-zinc-100 font-sans tracking-tight">
            Fact Vault
          </h2>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
            {facts.length}
          </span>
        </div>

        {/* Extract trigger button for selected source or first source */}
        {selectedSourceId ? (
          <button
            onClick={() => onExtractFacts(selectedSourceId)}
            disabled={isExtractingSelected}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm"
            title="Extract atomic facts from active source"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${isExtractingSelected ? 'animate-spin text-amber-300' : ''}`}
            />
            <span>{isExtractingSelected ? 'Extracting...' : 'Extract Facts'}</span>
          </button>
        ) : sources.length > 0 ? (
          <div className="text-[11px] text-zinc-500 font-sans">
            Select a source to extract
          </div>
        ) : null}
      </div>

      {/* Active Source Scope Filter Indicator */}
      {selectedSourceId && (
        <div className="px-3 py-1.5 bg-indigo-950/30 border-b border-indigo-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-indigo-300 truncate">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="text-zinc-400">Filtering:</span>
            <strong className="truncate">{selectedSource?.title || selectedSourceId}</strong>
          </div>
          <button
            onClick={() => onSelectSource(null)}
            className="text-[11px] text-indigo-400 hover:text-indigo-200 flex items-center gap-1 shrink-0 ml-2"
          >
            <X className="w-3 h-3" /> View All Facts
          </button>
        </div>
      )}

      {/* Search & Category Pills */}
      <div className="p-2.5 border-b border-[#232738] bg-[#0f111a] space-y-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search atomic facts, quotes, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#181b28] border border-[#282d42] rounded-md pl-8 pr-2.5 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1 pl-0.5">
            <Filter className="w-3 h-3" />
          </span>
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedCategory(tab.value)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'bg-[#181b28] text-zinc-400 hover:text-zinc-200 border border-[#262b3e]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Facts Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-xs">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
            <span>Loading atomic facts...</span>
          </div>
        ) : filteredFacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-center p-4">
            <Database className="w-8 h-8 text-zinc-600 mb-2 stroke-[1.5]" />
            <p className="text-xs text-zinc-400 font-medium">No atomic facts found</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[260px]">
              {selectedSourceId
                ? `No facts extracted yet for "${selectedSource?.title || selectedSourceId}". Click 'Extract Facts' above to generate atomic notes with Gemini / OpenAI.`
                : 'Select a source from the left panel and click "Extract Facts" to populate your Fact Vault.'}
            </p>

            {selectedSourceId && (
              <button
                onClick={() => onExtractFacts(selectedSourceId)}
                disabled={isExtractingSelected}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs transition-colors"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${isExtractingSelected ? 'animate-spin text-amber-400' : ''}`}
                />
                <span>{isExtractingSelected ? 'Extracting Facts...' : 'Extract Facts Now'}</span>
              </button>
            )}
          </div>
        ) : (
          filteredFacts.map((fact) => (
            <FactCard
              key={fact.fact_id}
              fact={fact}
              onDelete={onDeleteFact}
            />
          ))
        )}
      </div>

      {/* Footer Info Count */}
      <div className="px-3 py-1.5 border-t border-[#232738] bg-[#0c0e15] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <span>
          Showing {filteredFacts.length} of {facts.length} facts
        </span>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => setSelectedCategory('all')}
            className="hover:text-zinc-300 underline"
          >
            Reset category
          </button>
        )}
      </div>
    </div>
  )
}
