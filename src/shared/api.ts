import type {
  ApiResult,
  AuditRecord,
  CatalogItem,
  DashboardSummary,
  InstallPlan,
  JobRecord,
  LocalSkillCandidate,
  PlatformConfig,
  RulePackage,
  RuntimeStatus,
  SourceConfig
} from './types'

export interface SkillPortApi {
  catalog: {
    search: (params: { query?: string; platform?: string; status?: string; trustLevel?: string }) => Promise<ApiResult<CatalogItem[]>>
    getDetail: (id: string) => Promise<ApiResult<CatalogItem>>
    validate: (id: string) => Promise<ApiResult<{ valid: boolean; risks: string[] }>>
  }
  sources: {
    list: () => Promise<ApiResult<SourceConfig[]>>
    upsert: (source: SourceConfig) => Promise<ApiResult<SourceConfig>>
    delete: (sourceId: string) => Promise<ApiResult<{ deleted: boolean }>>
    sync: (sourceId: string) => Promise<ApiResult<JobRecord>>
    syncAll: () => Promise<ApiResult<JobRecord>>
    testConnection: (sourceId: string) => Promise<ApiResult<{ ok: boolean; latencyMs: number; message: string }>>
  }
  scan: {
    start: (params: { roots: string[]; platformKeys: string[]; ignore?: string[] }) => Promise<ApiResult<LocalSkillCandidate[]>>
    importCandidate: (params: { candidateId: string; mode: 'copy' | 'symlink' }) => Promise<ApiResult<JobRecord>>
  }
  install: {
    createPlan: (params: {
      itemId: string
      platformKeys: string[]
      scope: 'user' | 'project' | 'system'
      projectRoot?: string
      mode: 'copy' | 'symlink'
    }) => Promise<ApiResult<InstallPlan>>
    execute: (planId: string) => Promise<ApiResult<JobRecord>>
    uninstall: (installationId: string) => Promise<ApiResult<JobRecord>>
    rollback: (installationId: string, backupPath: string) => Promise<ApiResult<JobRecord>>
    openTargetDir: (targetPath: string) => Promise<ApiResult<{ opened: boolean }>>
  }
  rules: {
    list: () => Promise<ApiResult<RulePackage[]>>
    previewApply: (params: { packageId: string; projectRoot: string; platformKeys: string[] }) => Promise<ApiResult<{ diff: string }>>
    applyPackage: (params: { packageId: string; projectRoot: string; platformKeys: string[]; selectedRuleIds: string[] }) => Promise<ApiResult<JobRecord>>
  }
  platforms: {
    list: () => Promise<ApiResult<PlatformConfig[]>>
    update: (platformKey: string, config: Partial<PlatformConfig>) => Promise<ApiResult<PlatformConfig>>
    reset: (platformKey: string) => Promise<ApiResult<PlatformConfig>>
    validateTarget: (platformKey: string) => Promise<ApiResult<{ ok: boolean; messages: string[] }>>
  }
  jobs: {
    list: () => Promise<ApiResult<JobRecord[]>>
    retry: (jobId: string) => Promise<ApiResult<JobRecord>>
  }
  audit: {
    list: () => Promise<ApiResult<AuditRecord[]>>
  }
  dashboard: {
    summary: () => Promise<ApiResult<DashboardSummary>>
  }
  runtime: {
    status: () => Promise<ApiResult<RuntimeStatus>>
    config: () => Promise<ApiResult<unknown>>
  }
  security: {
    tokenStatus: () => Promise<ApiResult<RuntimeStatus['tokenEncryption'] & { configuredTokens: Array<{ provider: string; label: string; configured: boolean; updatedAt: string }> }>>
  }
}
