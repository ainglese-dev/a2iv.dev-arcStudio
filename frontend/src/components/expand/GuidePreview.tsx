import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Copy,
  Check,
  Download,
  Trash2,
  FileText,
  Code2,
  Calendar,
  Layers,
  Database,
  Cpu,
  Zap,
  Compass,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react'
import type { SynthesizedGuide } from '../../types'

interface GuidePreviewProps {
  guide: SynthesizedGuide | null
  onDelete?: (guideId: string) => void
  onPlanCurriculum?: (topic: string) => void
  isCardExpanded?: boolean
  onToggleCard?: () => void
}

interface GuideSection {
  id: string
  title: string
  content: string
  itemCount: number
  citationCount: number
  isFootnotes: boolean
}

function formatFootnoteLine(line: string): string {
  // Matches: [^1]: [[facts/id]] ^fact_id — Claim text
  const wikiMatch = line.match(
    /^\[\^([^\]]+)\]:\s*(\[\[[^\]]+\]\])\s*(?:\^[^\s]+\s*)?(?:—|-)?\s*(.*)$/
  )
  if (wikiMatch) {
    const [, id, wiki, text] = wikiMatch
    return `- **[${id}]** \`${wiki}\`${text ? ` — ${text}` : ''}`
  }
  // Matches: [^1]: Regular citation text
  const simpleMatch = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/)
  if (simpleMatch) {
    const [, id, text] = simpleMatch
    return `- **[${id}]** ${text}`
  }
  return line
}

function parseGuideSections(markdown: string): { preamble: string; sections: GuideSection[] } {
  if (!markdown) {
    return { preamble: '', sections: [] }
  }

  // Find index of first "## " heading
  const firstHeadingIdx = markdown.search(/^##\s+/m)
  let preamble = ''
  let body = markdown

  if (firstHeadingIdx > 0) {
    preamble = markdown.substring(0, firstHeadingIdx).trim()
    body = markdown.substring(firstHeadingIdx)
  } else if (firstHeadingIdx === -1) {
    return { preamble: markdown, sections: [] }
  }

  // Extract all footnote definitions from the entire document
  const footnoteDefs = markdown.match(/^\[\^[^\]]+\]:.*$/gm) || []
  const footnoteDefsBlock = footnoteDefs.length > 0 ? '\n\n' + footnoteDefs.join('\n') : ''

  // Split body by lines that start with "## "
  const rawSections = body.split(/\n(?=##\s+)/)
  const sections: GuideSection[] = []

  for (let i = 0; i < rawSections.length; i++) {
    const rawSec = rawSections[i].trim()
    if (!rawSec) continue

    const firstLineEnd = rawSec.indexOf('\n')
    const headingLine = firstLineEnd === -1 ? rawSec : rawSec.substring(0, firstLineEnd)
    const content = firstLineEnd === -1 ? '' : rawSec.substring(firstLineEnd).trim()
    const title = headingLine.replace(/^##\s+/, '').trim()

    const isFootnotes = /footnotes|citations/i.test(title)

    // Count citation references [^1] in content (excluding footnote definition lines)
    const nonDefLines = content.split('\n').filter((l) => !l.trim().startsWith('[^'))
    const citations = nonDefLines.join('\n').match(/\[\^[^\]]+\]/g) || []
    const citationCount = citations.length

    let finalContent = content
    let itemCount = 0

    if (isFootnotes) {
      // Format footnote definitions nicely for dedicated viewing
      finalContent = content
        .split('\n')
        .map((line) => (line.trim().startsWith('[^') ? formatFootnoteLine(line) : line))
        .join('\n')
      const fnItems = finalContent.split('\n').filter((l) => l.trim().startsWith('- '))
      itemCount = fnItems.length > 0 ? fnItems.length : footnoteDefs.length
    } else {
      // Append footnote definitions for remarkGfm footnote link resolution
      finalContent = content + footnoteDefsBlock
      const items = content.split('\n').filter((l) => /^\s*([-\*]|\d+\.)\s+/.test(l))
      itemCount = items.length > 0 ? items.length : content ? content.split(/\n\s*\n/).length : 0
    }

    sections.push({
      id: `sec-${i}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title,
      content: finalContent,
      itemCount,
      citationCount: isFootnotes ? footnoteDefs.length : citationCount,
      isFootnotes,
    })
  }

  return { preamble, sections }
}

const markdownComponents = {
  h1: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-lg font-bold text-white border-b border-zinc-800 pb-2 mb-3 mt-1 font-sans" {...props} />
  ),
  h2: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-base font-semibold text-zinc-100 mt-4 mb-2 font-sans" {...props} />
  ),
  h3: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-semibold text-zinc-200 mt-3 mb-1.5 font-sans" {...props} />
  ),
  p: ({ ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="text-xs text-zinc-300 leading-relaxed mb-3 font-sans" {...props} />
  ),
  li: ({ ...props }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-xs text-zinc-300 mb-1 font-sans" {...props} />
  ),
  code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className={`font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#181b28] border border-zinc-800 text-indigo-300 ${
        className || ''
      }`}
      {...props}
    >
      {children}
    </code>
  ),
  blockquote: ({ children }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-2 border-indigo-500 bg-indigo-950/20 pl-3 py-1.5 my-2 rounded-r text-xs text-zinc-300 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }: React.TableHTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-3 border border-zinc-800 rounded-lg">
      <table className="w-full text-xs text-left text-zinc-300 divide-y divide-zinc-800">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
    <th className="bg-[#171a28] px-3 py-2 text-zinc-200 font-medium font-sans">
      {children}
    </th>
  ),
  td: ({ children }: React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
    <td className="px-3 py-2 border-t border-zinc-800/60 font-sans">
      {children}
    </td>
  ),
}

export const GuidePreview: React.FC<GuidePreviewProps> = ({
  guide,
  onDelete,
  onPlanCurriculum,
  isCardExpanded: externalExpanded,
  onToggleCard,
}) => {
  const [localCardExpanded, setLocalCardExpanded] = useState(true)
  const isCardExpanded = externalExpanded !== undefined ? externalExpanded : localCardExpanded
  const handleToggleCard = onToggleCard || (() => setLocalCardExpanded((prev) => !prev))

  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview')
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showReferencedSources, setShowReferencedSources] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset collapsed sections when a different guide is loaded (default all expanded)
  useEffect(() => {
    setCollapsedSections({})
  }, [guide?.guide_id])

  const { preamble, sections } = useMemo(() => {
    if (!guide?.markdown_content) {
      return { preamble: '', sections: [] }
    }
    return parseGuideSections(guide.markdown_content)
  }, [guide?.markdown_content])

  const allExpanded = useMemo(() => {
    if (sections.length === 0) return true
    return sections.every((s) => !collapsedSections[s.id])
  }, [sections, collapsedSections])

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const toggleAllSections = () => {
    if (allExpanded) {
      const allCollapsed: Record<string, boolean> = {}
      sections.forEach((s) => {
        allCollapsed[s.id] = true
      })
      setCollapsedSections(allCollapsed)
    } else {
      setCollapsedSections({})
    }
  }

  const handleDeleteClick = () => {
    if (confirmDelete) {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      setConfirmDelete(false)
      onDelete?.(guide?.guide_id || '')
    } else {
      setConfirmDelete(true)
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = setTimeout(() => {
        setConfirmDelete(false)
      }, 3000)
    }
  }

  if (!guide) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-zinc-500 text-xs">
        <FileText className="w-10 h-10 text-zinc-700 mb-2 stroke-[1.5]" />
        <p className="font-medium text-zinc-400">No Context Synthesized Yet</p>
        <p className="text-[11px] text-zinc-500 mt-1 max-w-[280px]">
          Enter a topic and synthesize a research context with Obsidian-style citations and footnotes.
        </p>
      </div>
    )
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(guide.markdown_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([guide.markdown_content], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const safeName = guide.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    link.href = url
    link.setAttribute('download', `${safeName || 'synthesized-guide'}.md`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="context-card-container flex flex-col bg-[#0e1019] rounded-lg border border-[#23273a] overflow-hidden shadow-sm transition-all duration-150">
      {/* Context Card Header Toolbar (Collapsible at this section level) */}
      <div
        className={`context-card-header px-3 py-2.5 bg-[#141724] flex items-center justify-between gap-2 flex-wrap transition-colors ${
          isCardExpanded ? 'border-b border-[#232738]' : ''
        }`}
      >
        {/* Left: Card Expand Toggle + Topic Title + Metadata Pills */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleToggleCard}
            className="p-1 rounded hover:bg-[#1f2438] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
            title={isCardExpanded ? 'Collapse context' : 'Expand context'}
          >
            {isCardExpanded ? (
              <ChevronDown className="w-4 h-4 text-indigo-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {/* Guide / Context Topic Title (Clickable to toggle) */}
          <div
            onClick={handleToggleCard}
            className="flex items-center gap-2 min-w-0 cursor-pointer group"
            title={guide.topic}
          >
            <span className="context-topic-title font-semibold text-xs text-zinc-100 group-hover:text-indigo-300 transition-colors truncate max-w-[240px] sm:max-w-[320px] md:max-w-[380px] lg:max-w-[460px]">
              {guide.topic}
            </span>
          </div>

          {/* Metadata Pills */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {guide.created_at && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#181c2d] border border-zinc-800 text-zinc-400">
                <Calendar className="w-2.5 h-2.5 text-zinc-500" />
                <span>
                  {new Date(guide.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300">
              <Database className="w-2.5 h-2.5 text-indigo-400" />
              <span>{guide.referenced_fact_ids?.length || 0} citations</span>
            </span>
            {guide.ai_metadata && (
              <span
                className={`hidden md:inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                  guide.ai_metadata.fallback_occurred
                    ? 'bg-amber-950/60 text-amber-300 border-amber-600/60'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                }`}
                title={`Model: ${guide.ai_metadata.model}`}
              >
                {guide.ai_metadata.fallback_occurred ? (
                  <Zap className="w-2.5 h-2.5 text-amber-400" />
                ) : (
                  <Cpu className="w-2.5 h-2.5 text-emerald-400" />
                )}
                <span>{guide.ai_metadata.model}</span>
              </span>
            )}
          </div>

          {/* Sub-toolbar when Expanded: Tabs & Internal Section Accordion Toggle */}
          {isCardExpanded && (
            <div className="flex items-center gap-1.5 ml-2">
              <div className="flex items-center gap-0.5 bg-[#0f111c] p-0.5 rounded-md border border-zinc-800">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab('preview')
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileText className="w-2.5 h-2.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTab('raw')
                  }}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    activeTab === 'raw'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Code2 className="w-2.5 h-2.5" />
                  <span>Raw</span>
                </button>
              </div>

              {activeTab === 'preview' && sections.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleAllSections()
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#161928] hover:bg-[#1e2338] border border-zinc-800 text-[10px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  title={allExpanded ? 'Collapse all markdown sections' : 'Expand all markdown sections'}
                >
                  <ChevronsUpDown className="w-2.5 h-2.5 text-indigo-400" />
                  <span className="font-mono">
                    {allExpanded ? 'Collapse Sections' : 'Expand Sections'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Action buttons */}
        <div
          className="flex items-center gap-1 shrink-0 ml-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1b1e2e] hover:bg-[#23273c] border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Copy markdown to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-mono text-[10px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="font-mono text-[10px]">Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1b1e2e] hover:bg-[#23273c] border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Download .md file"
          >
            <Download className="w-3 h-3" />
            <span className="font-mono text-[10px]">Export</span>
          </button>

          {onPlanCurriculum && (
            <button
              onClick={() => onPlanCurriculum(guide.topic)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium shadow-sm transition-colors cursor-pointer"
              title="Plan 3-Tier Video Curriculum Arc from this research guide"
            >
              <Compass className="w-3 h-3 text-white" />
              <span className="font-mono text-[10px]">Plan Arc</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className={`px-1.5 py-1 rounded text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
                confirmDelete
                  ? 'bg-rose-600 text-white border border-rose-500 animate-pulse font-semibold'
                  : 'hover:bg-rose-950/80 text-zinc-500 hover:text-rose-400 border border-transparent'
              }`}
              title={confirmDelete ? 'Click again to permanently delete guide' : 'Delete guide'}
            >
              <Trash2 className="w-3 h-3" />
              {confirmDelete && <span className="text-[10px]">Confirm?</span>}
            </button>
          )}
        </div>
      </div>

      {/* Guide Content Display (Rendered only when context card is expanded) */}
      {isCardExpanded && (
        <>
          <div className="p-4 select-text max-h-[560px] overflow-y-auto">
            {activeTab === 'preview' ? (
              sections.length > 0 ? (
                <div className="space-y-3">
                  {/* Preamble / Document Title Header */}
                  {preamble && (
                    <div className="prose-vault max-w-none pb-2 border-b border-[#232738]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {preamble}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Collapsible Internal Section Cards */}
                  <div className="space-y-2.5">
                    {sections.map((section) => {
                      const isOpen = !collapsedSections[section.id]
                      return (
                        <div
                          key={section.id}
                          className="guide-section-card bg-[#0e1019] rounded-lg border border-[#23273a] overflow-hidden transition-all duration-150 shadow-sm"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSection(section.id)}
                            className={`guide-section-header w-full px-3.5 py-2.5 bg-[#141724] hover:bg-[#1a1e30] flex items-center justify-between transition-colors cursor-pointer text-left ${
                              isOpen ? 'border-b border-[#232738]' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="shrink-0 p-0.5 rounded text-zinc-400">
                                {isOpen ? (
                                  <ChevronDown className="w-4 h-4 text-indigo-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                                )}
                              </span>
                              <span className="section-title text-xs font-semibold text-zinc-100 tracking-tight truncate">
                                {section.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {section.citationCount > 0 && (
                                <span
                                  className="guide-section-badge inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-300"
                                  title={`${section.citationCount} citation${
                                    section.citationCount > 1 ? 's' : ''
                                  }`}
                                >
                                  <Database className="w-2.5 h-2.5 text-indigo-400" />
                                  <span>{section.citationCount}</span>
                                </span>
                              )}
                              {section.itemCount > 0 && (
                                <span
                                  className="guide-section-badge inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#161928] border border-zinc-800 text-zinc-400"
                                  title={`${section.itemCount} ${
                                    section.isFootnotes ? 'citations' : 'points'
                                  }`}
                                >
                                  <span>
                                    {section.itemCount}{' '}
                                    {section.isFootnotes ? 'citations' : 'points'}
                                  </span>
                                </span>
                              )}
                            </div>
                          </button>

                          {isOpen && (
                            <div className="guide-section-body p-4 bg-[#0b0d14] prose-vault max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                              >
                                {section.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Fallback when no ## sections exist */
                <div className="prose-vault max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {guide.markdown_content}
                  </ReactMarkdown>
                </div>
              )
            ) : (
              <textarea
                readOnly
                value={guide.markdown_content}
                className="w-full h-full min-h-[400px] bg-[#090b12] border border-zinc-800/80 rounded-lg p-3 font-mono text-xs text-zinc-300 leading-relaxed focus:outline-none resize-none select-text"
              />
            )}
          </div>

          {/* Collapsible Referenced Sources Drawer */}
          {showReferencedSources &&
            guide.referenced_source_ids &&
            guide.referenced_source_ids.length > 0 && (
              <div className="px-3.5 py-2 bg-[#0e1019] border-t border-[#232738] text-xs">
                <div className="flex items-center justify-between mb-1.5 text-[11px] font-medium text-zinc-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                    <Layers className="w-3 h-3" /> Referenced Sources ({guide.referenced_source_ids.length})
                  </span>
                  <button
                    onClick={() => setShowReferencedSources(false)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    Hide
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {guide.referenced_source_ids.map((srcId) => (
                    <span
                      key={srcId}
                      className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-[#161928] border border-zinc-800 text-zinc-300"
                    >
                      <Layers className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{srcId}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Guide Citations & Metadata Bar */}
          <div className="px-3.5 py-2 bg-[#12141f] border-t border-[#232738] flex flex-wrap items-center justify-between gap-3 text-[11px] text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <Database className="w-3 h-3 text-indigo-400" />
                <strong className="text-zinc-200">
                  {guide.referenced_fact_ids?.length || 0}
                </strong>{' '}
                Citations
              </span>
              <button
                type="button"
                onClick={() => setShowReferencedSources(!showReferencedSources)}
                className={`flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded transition-all cursor-pointer border ${
                  showReferencedSources
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                    : 'bg-[#181c2d] hover:bg-[#20253c] text-zinc-300 border-zinc-800'
                }`}
                title="Click to toggle referenced sources list"
              >
                <Layers className="w-3 h-3 text-emerald-400" />
                <strong className="text-zinc-200">
                  {guide.referenced_source_ids?.length || 0}
                </strong>{' '}
                Sources
                {showReferencedSources ? (
                  <ChevronDown className="w-2.5 h-2.5 ml-0.5 text-emerald-400" />
                ) : (
                  <ChevronRight className="w-2.5 h-2.5 ml-0.5 text-zinc-500" />
                )}
              </button>

              {guide.ai_metadata && (
                <span
                  className={`flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded border ${
                    guide.ai_metadata.fallback_occurred
                      ? 'bg-amber-950/60 text-amber-300 border-amber-600/60'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                  }`}
                  title={
                    guide.ai_metadata.fallback_reason
                      ? `Fallback reason: ${guide.ai_metadata.fallback_reason}`
                      : `Model: ${guide.ai_metadata.model}`
                  }
                >
                  {guide.ai_metadata.fallback_occurred ? (
                    <Zap className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Cpu className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>{guide.ai_metadata.model}</span>
                  {guide.ai_metadata.duration_ms > 0 && (
                    <span className="text-zinc-400">({guide.ai_metadata.duration_ms}ms)</span>
                  )}
                </span>
              )}
            </div>

            {guide.created_at && (
              <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
                <Calendar className="w-3 h-3" />
                {new Date(guide.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
