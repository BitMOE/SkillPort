import { access } from 'node:fs/promises'
import type { JobRecord, SourceConfig, TrustLevel } from '../../../shared/types'
import { sources as demoSources, timestampedJob } from '../demo-data'
import type { LogService } from '../audit/log-service'
import type { SkillPortDatabase } from '../storage/database'

type PersistedSource = ReturnType<SkillPortDatabase['listSources']>[number]

export class SourceService {
  constructor(
    private readonly database: SkillPortDatabase,
    private readonly logs: LogService
  ) {}

  seedDefaults(): void {
    if (this.database.listSources().length > 0) return
    for (const source of demoSources) {
      this.upsert(source)
    }
  }

  list(): SourceConfig[] {
    return this.database.listSources().map(toSourceConfig)
  }

  upsert(source: SourceConfig): SourceConfig {
    this.database.upsertSource({
      id: source.id,
      kind: source.kind,
      name: source.name,
      enabled: source.enabled,
      url: source.url,
      trustLevel: source.trustLevel,
      config: {
        apiBase: source.apiBase,
        branch: source.branch,
        paths: source.paths,
        authRef: source.authRef,
        refreshIntervalMinutes: source.refreshIntervalMinutes,
        lastSync: source.lastSync,
        status: source.status,
        tokenState: source.tokenState
      }
    })
    return source
  }

  delete(sourceId: string): boolean {
    return this.database.deleteSource(sourceId)
  }

  async sync(sourceId: string): Promise<JobRecord> {
    const source = this.list().find((entry) => entry.id === sourceId)
    if (!source) throw new Error(`Source not found: ${sourceId}`)
    const job = timestampedJob('同步源', source.name, `已同步 ${source.kind} 源配置，等待 catalog 解析`)
    await this.logs.job('info', 'Source sync requested', { sourceId, kind: source.kind })
    this.database.addJobEvent(job.id, 'info', 'Source sync requested', { sourceId, kind: source.kind })
    return job
  }

  async syncAll(): Promise<JobRecord> {
    const enabledSources = this.list().filter((source) => source.enabled)
    const job = timestampedJob('同步全部源', 'all sources', `已调度 ${enabledSources.length} 个启用源`, 'partial_success')
    await this.logs.job('info', 'All sources sync requested', { count: enabledSources.length })
    this.database.addJobEvent(job.id, 'info', 'All sources sync requested', { count: enabledSources.length })
    return job
  }

  async testConnection(sourceId: string): Promise<{ ok: boolean; latencyMs: number; message: string }> {
    const startedAt = performance.now()
    const source = this.list().find((entry) => entry.id === sourceId)
    if (!source) throw new Error(`Source not found: ${sourceId}`)

    if (source.kind === 'local-dir') {
      try {
        await access(source.url.replace(/^~(?=\/|\\|$)/, process.env.USERPROFILE ?? process.env.HOME ?? '~'))
        return { ok: true, latencyMs: elapsed(startedAt), message: 'Local source is readable' }
      } catch {
        return { ok: false, latencyMs: elapsed(startedAt), message: 'Local source path is not readable' }
      }
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3500)
    try {
      const response = await fetch(connectionUrl(source), {
        method: 'HEAD',
        signal: controller.signal
      })
      return { ok: response.ok || response.status < 500, latencyMs: elapsed(startedAt), message: `HTTP ${response.status}` }
    } catch (error) {
      return { ok: false, latencyMs: elapsed(startedAt), message: error instanceof Error ? error.message : 'Connection failed' }
    } finally {
      clearTimeout(timer)
    }
  }
}

function toSourceConfig(source: PersistedSource): SourceConfig {
  const config = source.config
  return {
    id: source.id,
    kind: source.kind as SourceConfig['kind'],
    name: source.name,
    enabled: source.enabled,
    url: source.url,
    apiBase: stringValue(config.apiBase),
    branch: stringValue(config.branch),
    paths: Array.isArray(config.paths) ? config.paths.map(String) : undefined,
    authRef: stringValue(config.authRef),
    refreshIntervalMinutes: numberValue(config.refreshIntervalMinutes),
    trustLevel: source.trustLevel as TrustLevel,
    lastSync: stringValue(config.lastSync) ?? '从未同步',
    status: (stringValue(config.status) as SourceConfig['status']) ?? 'success',
    tokenState: stringValue(config.tokenState) as SourceConfig['tokenState']
  }
}

function connectionUrl(source: SourceConfig): string {
  if (source.kind === 'github' && source.url.includes('github.com')) {
    return source.url.replace('https://github.com/', 'https://api.github.com/repos/')
  }
  if ((source.kind === 'gitlab' || source.kind === 'self-hosted-gitlab') && source.apiBase) {
    return source.apiBase
  }
  return source.apiBase ?? source.url
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function elapsed(startedAt: number): number {
  return Math.max(1, Math.round(performance.now() - startedAt))
}
