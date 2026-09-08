import type {
  AtomicFact,
  ContextExpansionRequest,
  CreateProjectRequest,
  ExtractFactsRequest,
  FactCategory,
  FactExtractionResult,
  GenerateCurriculumRequest,
  HealthResponse,
  IngestSourceRequest,
  MediaAnalysisResponse,
  MediaJob,
  MediaRenderRequest,
  MediaUploadResponse,
  PresentationDeck,
  ProjectSummary,
  ProjectVision,
  ProviderStatusResponse,
  SeedPractitionerRequest,
  SeedPractitionerResponse,
  SourceDetail,
  SourceMetadata,
  SynthesizedGuide,
  SynthesisJobStatusResponse,
  TranscriptionResponse,
  UpdateProjectVisionRequest,
  UpdateVideoArcRequest,
  VaultResetResponse,
  VaultResetTarget,
  VaultSeedResponse,
  VaultStatsResponse,
  VideoArc,
  VideoArcSummary,
  GenerateScriptRequest,
  VideoScript,
  VideoScriptSummary,
} from '../types'

const API_BASE = '/api'

let currentActiveProjectId: string | null = (() => {
  try {
    return localStorage.getItem('yt_active_project_id')
  } catch {
    return null
  }
})()

export const setActiveProjectId = (id: string | null): void => {
  currentActiveProjectId = id
  try {
    if (id) {
      localStorage.setItem('yt_active_project_id', id)
    } else {
      localStorage.removeItem('yt_active_project_id')
    }
  } catch {
    // Ignore localStorage errors in restricted environments
  }
}

export const getActiveProjectId = (): string | null => {
  return currentActiveProjectId
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (currentActiveProjectId && !headers.has('X-Project-Id')) {
    headers.set('X-Project-Id', currentActiveProjectId)
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })


  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`
    try {
      const errorJson = await response.json()
      if (errorJson.detail) {
        errorMessage = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : JSON.stringify(errorJson.detail)
      } else if (errorJson.message) {
        errorMessage = errorJson.message
      }
    } catch {
      // Body is not JSON
    }
    throw new ApiError(errorMessage, response.status)
  }

  return response.json()
}

export const api = {
  // Health & Providers
  getHealth: () => request<HealthResponse>('/health'),
  getProviderStatus: () => request<ProviderStatusResponse>('/health/providers'),

  // Sources
  listSources: () => request<SourceMetadata[]>('/sources'),
  getSource: (sourceId: string) => request<SourceDetail>(`/sources/${encodeURIComponent(sourceId)}`),
  ingestSource: (data: IngestSourceRequest) =>
    request<{ source: SourceMetadata; chunks_count: number }>('/sources/ingest', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteSource: (sourceId: string) =>
    request<{ status: string; source_id: string }>(`/sources/${encodeURIComponent(sourceId)}`, {
      method: 'DELETE',
    }),
  seedPractitioner: (data: SeedPractitionerRequest) =>
    request<SeedPractitionerResponse>('/sources/seed-practitioner', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Facts
  listFacts: (params?: { source_id?: string; category?: FactCategory | string; tag?: string }) => {
    const query = new URLSearchParams()
    if (params?.source_id) query.set('source_id', params.source_id)
    if (params?.category && params.category !== 'all') query.set('category', params.category)
    if (params?.tag) query.set('tag', params.tag)
    const queryString = query.toString() ? `?${query.toString()}` : ''
    return request<AtomicFact[]>(`/facts${queryString}`)
  },
  getFact: (factId: string) => request<AtomicFact>(`/facts/${encodeURIComponent(factId)}`),
  extractFacts: (data: ExtractFactsRequest, preferredProvider?: string) => {
    const query = preferredProvider ? `?preferred_provider=${encodeURIComponent(preferredProvider)}` : ''
    return request<FactExtractionResult>(`/facts/extract${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  deleteFact: (factId: string) =>
    request<{ status: string; fact_id: string }>(`/facts/${encodeURIComponent(factId)}`, {
      method: 'DELETE',
    }),

  // Context Extender / Guides
  startSynthesisJob: (data: ContextExpansionRequest, preferredProvider?: string) => {
    const query = preferredProvider ? `?preferred_provider=${encodeURIComponent(preferredProvider)}` : ''
    return request<SynthesisJobStatusResponse>(`/expand/jobs/start${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  getActiveSynthesisJob: (projectId?: string) => {
    const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''
    return request<SynthesisJobStatusResponse | null>(`/expand/jobs/active${query}`)
  },
  getSynthesisJob: (jobId: string) =>
    request<SynthesisJobStatusResponse>(`/expand/jobs/${encodeURIComponent(jobId)}`),
  synthesizeGuide: (data: ContextExpansionRequest, preferredProvider?: string) => {
    const query = preferredProvider ? `?preferred_provider=${encodeURIComponent(preferredProvider)}` : ''
    return request<SynthesizedGuide>(`/expand/synthesize${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  listGuides: () => request<Array<{ guide_id: string; topic: string; created_at: string }>>('/expand/guides'),
  getGuide: (guideId: string) => request<SynthesizedGuide>(`/expand/guides/${encodeURIComponent(guideId)}`),
  deleteGuide: (guideId: string) =>
    request<{ status: string; guide_id: string }>(`/expand/guides/${encodeURIComponent(guideId)}`, {
      method: 'DELETE',
    }),

  // Module 2: Curriculum & Video Arc
  listCurricula: () => request<VideoArcSummary[]>('/curriculum'),
  getCurriculum: (arcId: string) => request<VideoArc>(`/curriculum/${encodeURIComponent(arcId)}`),
  generateCurriculum: (data: GenerateCurriculumRequest, preferredProvider?: string) => {
    const query = preferredProvider ? `?preferred_provider=${encodeURIComponent(preferredProvider)}` : ''
    return request<VideoArc>(`/curriculum/generate${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  updateCurriculum: (arcId: string, data: UpdateVideoArcRequest) =>
    request<VideoArc>(`/curriculum/${encodeURIComponent(arcId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCurriculum: (arcId: string) =>
    request<{ status: string; arc_id: string }>(`/curriculum/${encodeURIComponent(arcId)}`, {
      method: 'DELETE',
    }),

  // Module 3: Script Studio & Teleprompter
  listScripts: () => request<VideoScriptSummary[]>('/scripts'),
  getScript: (scriptId: string) => request<VideoScript>(`/scripts/${encodeURIComponent(scriptId)}`),
  generateScript: (data: GenerateScriptRequest, preferredProvider?: string) => {
    const query = preferredProvider ? `?preferred_provider=${encodeURIComponent(preferredProvider)}` : ''
    return request<VideoScript>(`/scripts/generate${query}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
  deleteScript: (scriptId: string) =>
    request<{ status: string; script_id: string }>(`/scripts/${encodeURIComponent(scriptId)}`, {
      method: 'DELETE',
    }),

  // Module 4: A/V Sync, Audio Smoothing & Jump-Cut Editor
  uploadMedia: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<MediaUploadResponse>('/media/upload', {
      method: 'POST',
      body: formData,
    })
  },
  loadSampleDemo: () =>
    request<MediaUploadResponse>('/media/sample-demo', {
      method: 'POST',
    }),
  loadRealisticDemo: () =>
    request<MediaUploadResponse>('/media/demo-speech-raw', {
      method: 'POST',
    }),
  transcribeMedia: (filePath: string) =>
    request<TranscriptionResponse>('/media/transcribe', {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath }),
    }),
  analyzeMedia: (
    filePath: string,
    options?: { noiseThresholdDb?: number; minSilenceS?: number; paddingS?: number }
  ) =>
    request<MediaAnalysisResponse>('/media/analyze', {
      method: 'POST',
      body: JSON.stringify({
        file_path: filePath,
        noise_threshold_db: options?.noiseThresholdDb ?? -30.0,
        min_silence_s: options?.minSilenceS ?? 0.45,
        padding_s: options?.paddingS ?? 0.08,
      }),
    }),
  renderMedia: (data: MediaRenderRequest) =>
    request<MediaJob>('/media/render', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMediaJob: (jobId: string) => request<MediaJob>(`/media/jobs/${encodeURIComponent(jobId)}`),
  listMediaJobs: () => request<MediaJob[]>('/media/jobs'),
  getMediaDownloadUrl: (jobId: string) => `/api/media/download/${encodeURIComponent(jobId)}`,
  getMediaRawUrl: (filePath: string) => `/api/media/raw?file_path=${encodeURIComponent(filePath)}`,

  // Module 5: Slide Engine & Synced Presentation Studio
  generatePresentation: (scriptId: string) =>
    request<PresentationDeck>('/presentation/generate', {
      method: 'POST',
      body: JSON.stringify({ script_id: scriptId }),
    }),
  getPresentation: (deckId: string) =>
    request<PresentationDeck>(`/presentation/decks/${encodeURIComponent(deckId)}`),
  listPresentationDecks: () =>
    request<
      Array<{
        deck_id: string
        script_id: string
        script_title: string
        total_slides: number
        total_duration_s: number
        created_at: string
      }>
    >('/presentation/decks'),
  deletePresentationDeck: (deckId: string) =>
    request<{ status: string; deck_id: string }>(
      `/presentation/decks/${encodeURIComponent(deckId)}`,
      { method: 'DELETE' }
    ),
  loadDemoPresentation: () =>
    request<PresentationDeck>('/presentation/demo/sample'),

  // Vault Management & Dev Tools
  getVaultStats: () => request<VaultStatsResponse>('/dev/vault/stats'),
  resetVault: (target: VaultResetTarget = 'all') =>
    request<VaultResetResponse>('/dev/vault/reset', {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),
  seedVault: () =>
    request<VaultSeedResponse>('/dev/vault/seed', {
      method: 'POST',
    }),

  // Project Sandboxes & Project Vision (North Star)
  listProjects: async () => {
    const res = await request<ProjectSummary[] | { projects: ProjectSummary[]; total?: number }>('/projects')
    if (Array.isArray(res)) {
      return res
    }
    return res.projects || []
  },
  getProject: (projectId: string) =>
    request<ProjectVision>(`/projects/${encodeURIComponent(projectId)}`),
  createProject: (data: CreateProjectRequest) =>
    request<ProjectVision>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProjectVision: (projectId: string, data: UpdateProjectVisionRequest) =>
    request<ProjectVision>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProject: (projectId: string) =>
    request<{ status: string; project_id: string }>(`/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    }),
  seedSampleProject: (sampleType: string = 'cinema') =>
    request<ProjectVision>(`/projects/seed?sample_type=${encodeURIComponent(sampleType)}`, {
      method: 'POST',
    }),
  getProjectPromptContext: (projectId: string) =>
    request<{ prompt_context: string }>(`/projects/${encodeURIComponent(projectId)}/vision/prompt`),
  setActiveProjectId,
  getActiveProjectId,
}

