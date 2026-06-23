export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; detail?: unknown } }

export type TrustLevel = 'official' | 'team' | 'community' | 'unknown'
export type InstallMode = 'copy' | 'symlink' | 'junction'
export type Scope = 'user' | 'project' | 'system'

export interface CatalogItem {
  id: string
  type: 'skill' | 'rule_package'
  sourceId: string
  slug: string
  name: string
  description: string
  version?: string
  tags: string[]
  trustLevel: TrustLevel
  checksum: string
  sourcePath: string
  repoUrl?: string
  commitSha?: string
  installed: boolean
  updateVersion?: string
  riskCount: number
  platforms: string[]
  metadata: Record<string, unknown>
}

export interface SourceConfig {
  id: string
  kind: 'github' | 'gitlab' | 'self-hosted-gitlab' | 'skills-sh' | 'local-dir' | 'archive'
  name: string
  enabled: boolean
  url: string
  apiBase?: string
  branch?: string
  paths?: string[]
  authRef?: string
  refreshIntervalMinutes?: number
  trustLevel: TrustLevel
  lastSync: string
  status: 'success' | 'warning' | 'failed'
  tokenState?: 'healthy' | 'warning' | 'invalid' | 'missing'
}

export interface PlatformConfig {
  key: string
  displayName: string
  enabled: boolean
  health: 'healthy' | 'warning' | 'disabled'
  installedCount: number
  userSkillDir: string
  projectSkillDir: string
  ruleTargets: string[]
  installMode: 'copy' | 'symlink'
  allowSymlink: boolean
  scanEnabled: boolean
}

export interface InstallPlan {
  id: string
  itemId: string
  artifactPath: string
  targets: Array<{
    platformKey: string
    targetPath: string
    mode: InstallMode
    conflict?: string
    backupPath?: string
  }>
  warnings: string[]
}

export interface LocalSkillCandidate {
  id: string
  name: string
  version?: string
  description: string
  tags: string[]
  path: string
  detectedPlatform?: string
  fileCount: number
  checksum: string
  risks: Array<{ level: 'low' | 'medium' | 'high'; message: string }>
  importable: boolean
}

export interface JobRecord {
  id: string
  type: string
  target: string
  status: 'pending' | 'running' | 'success' | 'partial_success' | 'failed' | 'cancelled'
  actor: string
  createdAt: string
  message: string
}

export interface AuditRecord {
  id: string
  level: 'info' | 'warning' | 'error'
  action: string
  target: string
  actor: string
  createdAt: string
}

export interface DashboardSummary {
  installedSkills: number
  updateableSkills: number
  enabledPlatforms: number
  totalPlatforms: number
  lastSyncStatus: 'success' | 'failed' | 'partial_success'
  cacheUsageGb: number
  cacheLimitGb: number
  online: boolean
  githubToken: 'healthy' | 'warning' | 'invalid' | 'missing'
  gitlabToken: 'healthy' | 'warning' | 'invalid' | 'missing'
  recentJobs: JobRecord[]
  recentAudit: AuditRecord[]
}

export interface RulePackage {
  id: string
  name: string
  version: string
  source: string
  status: 'applied' | 'updateable' | 'not_applied'
  tags: string[]
  appliesTo: string
  ruleCount: number
  enabledRules: number
}

export interface RuntimeStatus {
  dataDir: string
  databasePath: string
  databaseReady: boolean
  configPath: string
  configReady: boolean
  logsDir: string
  logsReady: boolean
  tokenEncryption: {
    available: boolean
    backend: string
    protection: 'system' | 'basic' | 'unavailable'
  }
  initializedAt: string
}

export interface ContentUpdatePolicy {
  autoCheck: boolean
  autoApplyTrustedSources: boolean
  allowMajorVersion: boolean
  blockScriptSkills: boolean
  schedule: 'manual' | 'startup' | 'daily' | 'weekly'
}

export interface ContentUpdateCandidate {
  itemId: string
  name: string
  currentVersion?: string
  nextVersion: string
  type: 'skill' | 'rule_package'
  trustLevel: TrustLevel
  autoApplicable: boolean
  blockedReasons: string[]
}

export interface AppUpdateStatus {
  provider: 'github' | 'generic' | 's3'
  channel: 'stable' | 'beta' | 'alpha'
  autoCheck: boolean
  autoDownload: boolean
  enterpriseDisabled: boolean
  state: 'idle' | 'checking' | 'available' | 'not_available' | 'downloaded' | 'error'
  message: string
}
