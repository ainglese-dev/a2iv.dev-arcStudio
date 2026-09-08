export type SourceType =
  | 'youtube_transcript'
  | 'article'
  | 'pdf'
  | 'documentation'
  | 'audio_transcript'
  | 'manual_note'
  | 'other'

export type FactCategory =
  | 'technical_spec'
  | 'workflow_step'
  | 'code_pattern'
  | 'architecture_decision'
  | 'pitfall_caveat'
  | 'benchmark_metric'
  | 'tool_command'
  | 'general'
  | 'claim'
  | 'metric'
  | 'definition'
  | 'quote'
  | 'takeaway'

export type ConfidenceLevel =
  | 'verified'
  | 'inferred'
  | 'speculative'
  | 'high'
  | 'medium'
  | 'low'

export interface SourceChunk {
  chunk_id: string
  chunk_index: number
  text: string
  timestamp_start?: string | null
  timestamp_end?: string | null
  char_count: number
  word_count: number
}

export interface SourceMetadata {
  source_id: string
  title: string
  source_type: SourceType
  url?: string | null
  author?: string | null
  published_date?: string | null
  total_chunks: number
  tags: string[]
  created_at: string
  // Optional client-enriched fact count
  fact_count?: number
}

export type SourceDocument = SourceMetadata

export interface SourceDetail {
  metadata: SourceMetadata
  chunks: SourceChunk[]
  content: string
}

export interface AtomicFact {
  fact_id: string
  statement: string
  category: FactCategory
  confidence: ConfidenceLevel
  source_id: string
  source_chunk_id?: string | null
  exact_quote?: string | null
  timestamp_range?: string | null
  tags: string[]
  created_at: string
}

export interface AIMetadata {
  provider: string
  model: string
  fallback_occurred: boolean
  fallback_reason?: string | null
  duration_ms: number
}

export interface FactExtractionResult {
  source_id: string
  facts: AtomicFact[]
  chunk_ids_processed: string[]
  metadata: Record<string, unknown>
  ai_metadata?: AIMetadata | null
}

export interface SynthesizedGuide {
  guide_id: string
  topic: string
  markdown_content: string
  referenced_fact_ids: string[]
  referenced_source_ids: string[]
  created_at: string
  ai_metadata?: AIMetadata | null
}

export interface IngestSourceRequest {
  title: string
  content: string
  source_type?: SourceType
  url?: string
  author?: string
  published_date?: string
  tags?: string[]
  chunk_size?: number
  chunk_overlap?: number
}

export type PractitionerLens =
  | 'auto'
  | 'deep_dive'
  | 'lessons_pitfalls'
  | 'case_study'
  | 'tech_devops_incident'
  | 'adult_learning_plateau'
  | 'finance_risk_psychology'
  | 'general_practitioner'

export interface SeedPractitionerRequest {
  topic: string
  lens: PractitionerLens
  target_audience?: string
}

export interface SeedPractitionerResponse {
  source: SourceMetadata
  brief_markdown: string
  pain_points: string[]
  pitfalls: string[]
  facts: AtomicFact[]
  ai_metadata?: {
    model?: string
    duration_ms?: number
    fallback_occurred?: boolean
    fallback_reason?: string
  }
}

export interface ExtractFactsRequest {
  source_id: string
  chunk_ids?: string[]
}

export interface ContextExpansionRequest {
  topic: string
  source_ids?: string[]
  categories?: FactCategory[]
  tags?: string[]
  detail_level?: 'comprehensive' | 'concise' | 'technical' | string
  target_audience?: string
}

export interface SynthesisJob {
  id: string
  job_id?: string
  project_id?: string
  topic: string
  detailLevel: string
  targetAudience?: string
  startedAt: number
  status: 'running' | 'completed' | 'failed'
  elapsedSeconds: number
  guide?: SynthesizedGuide
  error?: string
}

export interface SynthesisJobStatusResponse {
  job_id: string
  project_id: string
  topic: string
  detail_level: string
  target_audience?: string
  started_at: number
  status: 'running' | 'completed' | 'failed'
  elapsed_seconds: number
  guide?: SynthesizedGuide | null
  error?: string | null
}

export interface ProviderDetail {
  available: boolean
  is_primary?: boolean
  is_fallback?: boolean
  model?: string
  active_model?: string
  cascade?: string[]
  error?: string
}

export interface CircuitBreakerStatus {
  has_tripped_models: boolean
  tripped_models?: Record<
    string,
    {
      failure_count: number
      tripped_at: number
      cooldown_remaining_sec: number
    }
  >
}

export interface ProviderStatusResponse {
  primary_provider: string
  fallback_provider: string
  providers:
    | {
        providers?: Record<string, ProviderDetail>
        circuit_breaker?: CircuitBreakerStatus
      }
    | Record<string, ProviderDetail>
}

export interface HealthResponse {
  status: string
  service: string
  vault_dir: string
}

export interface ToastItem {
  id: string
  type: 'fallback' | 'success' | 'error' | 'info'
  title: string
  message: string
  model?: string
  reason?: string | null
  durationMs?: number
}

// Module 2: Arc & Curriculum Architect Types
export type ArcTier = 'fundamentals' | 'advanced' | 'lab'

export interface VideoEpisode {
  episode_id: string
  episode_number: number
  tier: ArcTier
  title: string
  hook: string
  learning_objectives: string[]
  key_facts_referenced: string[]
  target_duration_minutes: number
  recommended_visuals: string[]
  lab_exercise?: string | null
}

export interface VideoArc {
  arc_id: string
  title: string
  topic: string
  description: string
  episodes: VideoEpisode[]
  total_episodes: number
  estimated_total_minutes: number
  sources_referenced: string[]
  created_at: string
  ai_metadata?: AIMetadata | null
}

export interface VideoArcSummary {
  arc_id: string
  title: string
  topic: string
  total_episodes: number
  estimated_total_minutes: number
  created_at: string
}

export interface GenerateCurriculumRequest {
  topic?: string
  source_ids?: string[]
  target_episode_count?: number
  target_audience?: string
}

export interface UpdateVideoArcRequest {
  title?: string
  description?: string
  episodes?: VideoEpisode[]
}

// Module 3: Script Studio & Teleprompter Types
export type SectionType =
  | 'hook'
  | 'problem_breakdown'
  | 'deep_dive'
  | 'pitfalls'
  | 'action_call'

export interface ScriptSection {
  section_type: SectionType
  title: string
  spoken_text: string
  target_duration_seconds: number
  estimated_wpm: number
  visual_cue?: string | null
}

export interface VideoScript {
  script_id: string
  episode_id: string
  arc_id?: string | null
  title: string
  target_duration_minutes: number
  total_word_count: number
  estimated_speaking_minutes: number
  hook_text: string
  sections: ScriptSection[]
  full_script_markdown: string
  key_facts_referenced: string[]
  ai_metadata?: AIMetadata | null
  created_at: string
}

export interface VideoScriptSummary {
  script_id: string
  episode_id: string
  arc_id?: string | null
  title: string
  total_word_count: number
  estimated_speaking_minutes: number
  created_at: string
}

export interface GenerateScriptRequest {
  episode_id: string
  arc_id?: string | null
  wpm_target?: number
  speaking_style?: string
}

// Module 4: A/V Sync, Audio Smoothing & Jump-Cut Editor Types
export interface SilenceInterval {
  start_time: number
  end_time: number
  duration: number
}

export interface KeepInterval {
  start_time: number
  end_time: number
  duration: number
}

export interface AudioDSPConfig {
  highpass_hz: number
  denoise_db: number
  presence_boost_db: number
  compression: boolean
  target_lufs: number
  true_peak_db: number
  micro_fade_ms: number
}

export interface MediaUploadResponse {
  filename: string
  file_path: string
  size_bytes: number
  duration_s?: number
  has_video?: boolean
  has_audio?: boolean
  fps?: number
  width?: number
  height?: number
}

export interface MediaAnalysisRequest {
  file_path: string
  noise_threshold_db?: number
  min_silence_s?: number
  padding_s?: number
}

export interface MediaAnalysisResponse {
  file_path: string
  duration_s: number
  has_video: boolean
  has_audio: boolean
  fps: number
  width: number
  height: number
  silence_intervals: SilenceInterval[]
  keep_intervals: KeepInterval[]
  potential_time_saved_s: number
}

export interface MediaRenderRequest {
  source_file: string
  keep_intervals: KeepInterval[]
  audio_dsp: AudioDSPConfig
  use_hardware_accel: boolean
}

export interface MediaJob {
  job_id: string
  status: 'queued' | 'analyzing' | 'cutting' | 'completed' | 'failed'
  progress_pct: number
  original_duration_s: number
  processed_duration_s: number
  cuts_count: number
  time_saved_s: number
  output_file?: string | null
  error_message?: string | null
  created_at: string
}

export interface TranscriptionSegment {
  id: number
  start: number
  end: number
  text: string
}

export interface TranscriptionResponse {
  text: string
  duration: number
  language?: string
  segments: TranscriptionSegment[]
  words?: { word: string; start: number; end: number; probability: number }[]
}

// Vault Management & Dev Tools Types
export interface VaultCategoryStats {
  count: number
  size_bytes: number
}

export interface VaultStatsResponse {
  sources: VaultCategoryStats
  facts: VaultCategoryStats
  guides: VaultCategoryStats
  curriculum: VaultCategoryStats
  scripts: VaultCategoryStats
  media: VaultCategoryStats
  presentations: VaultCategoryStats
  projects?: VaultCategoryStats
  total_files: number
  total_size_bytes: number
}

export type VaultResetTarget = 'all' | 'projects' | 'scripts' | 'curriculum' | 'media' | 'facts' | 'sources' | 'presentations'

export interface VaultResetResponse {
  status: string
  target: string
  deleted_count: number
  message: string
}

export interface VaultSeedResponse {
  status: string
  sources_created: number
  facts_created: number
  message: string
}

// Module 5: Slide Engine & Synced Presentation Studio Types
export type VisualThemeVariant = 'terminal_dark' | 'infographic_clean'

export type SlideType =
  | 'title_hook'
  | 'architecture_diagram'
  | 'code_breakdown'
  | 'comparison_split'
  | 'metric_callout'
  | 'key_takeaway'

export interface SlideElementVariant {
  headline: string
  subhead?: string
  subtitle?: string
  bullet_points: string[]
  code_snippet?: string
  code_language?: string
  comparison_left?: { title: string; status: string; color: string; note?: string }
  comparison_right?: { title: string; status: string; color: string; note?: string }
  metric_callouts?: { label: string; value: string; detail?: string }[]
  diagram_nodes?: { label: string; type: string; status?: string }[]
  badge_pills?: string[]
  word_count: number
}

export interface PresentationSlide {
  slide_id: string
  slide_index: number
  section_index: number
  title?: string
  timestamp_start_s: number
  timestamp_end_s: number
  duration_s: number
  slide_type: SlideType
  cue_marker: string
  spoken_anchor_text: string
  variant_a: SlideElementVariant
  variant_b: SlideElementVariant
}

export interface PresentationObjectiveMetrics {
  cue_coverage_percentage: number
  variant_a_avg_words_per_slide: number
  variant_b_avg_words_per_slide: number
  variant_a_cognitive_load_score: number
  variant_b_cognitive_load_score: number
  pacing_alignment_score: number
}

export interface PresentationDeck {
  deck_id: string
  script_id: string
  script_title: string
  total_slides: number
  total_duration_s: number
  slides: PresentationSlide[]
  metrics: PresentationObjectiveMetrics
  created_at: string
  ai_metadata?: Record<string, any>
}

// Project Sandbox & Vision (North Star) Architecture
export type TechnicalDepth =
  | 'practitioner_deep'
  | 'applied_engineering'
  | 'conceptual_overview'

export type VideoFormatPreset =
  | 'multi_episode_arc'
  | 'deep_dive_standalone'
  | 'quick_explainer'

export interface ProjectVision {
  project_id: string
  title: string
  target_audience: string
  technical_depth: TechnicalDepth
  core_thesis: string
  target_format: VideoFormatPreset
  tone_and_style: string
  key_questions_to_answer: string[]
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface ProjectSummary {
  project_id: string
  title: string
  target_audience: string
  technical_depth: TechnicalDepth
  target_format: VideoFormatPreset
  core_thesis?: string
  tags?: string[]
  sources_count: number
  facts_count: number
  arcs_count: number
  scripts_count: number
  decks_count: number
  created_at: string
  updated_at: string
}

export interface CreateProjectRequest {
  title: string
  project_id?: string
  target_audience?: string
  technical_depth?: TechnicalDepth
  core_thesis?: string
  target_format?: VideoFormatPreset
  tone_and_style?: string
  key_questions_to_answer?: string[]
  tags?: string[]
}

export interface UpdateProjectVisionRequest {
  title?: string
  target_audience?: string
  technical_depth?: TechnicalDepth
  core_thesis?: string
  target_format?: VideoFormatPreset
  tone_and_style?: string
  key_questions_to_answer?: string[]
  tags?: string[]
}

export interface ProjectListResponse {
  projects: ProjectSummary[]
  total: number
}



