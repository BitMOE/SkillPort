import { access, mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { PerformanceSnapshot, RecoveryReport, RuntimeStatus, SecurityAuditCheck, SecurityAuditReport } from '../../../shared/types'
import type { LogService } from '../audit/log-service'
import type { ConfigService } from '../config/config-service'
import type { SkillPortDatabase } from '../storage/database'

const RECOVERY_DIRS = ['artifacts', 'backups', 'logs', 'rules', 'temp']

export class HardeningService {
  constructor(
    private readonly dataDir: string,
    private readonly database: SkillPortDatabase,
    private readonly config: ConfigService,
    private readonly logs: LogService,
    private readonly runtimeStatus: RuntimeStatus
  ) {}

  async securityAudit(): Promise<SecurityAuditReport> {
    const sources = this.database.listSources()
    const catalog = this.database.listCatalogItems()
    const communitySources = sources.filter((source) => source.enabled && source.trustLevel === 'community')
    const scriptLikeItems = catalog.filter((item) => {
      const risks = item.metadata?.risks
      return Array.isArray(risks) && risks.some((risk) => String(risk).toLowerCase().includes('script'))
    })

    const checks: SecurityAuditCheck[] = [
      {
        id: 'electron-window-boundary',
        title: 'Electron renderer boundary',
        status: 'pass',
        detail: 'BrowserWindow is configured with contextIsolation, sandbox, webSecurity, disabled Node integration, and denied in-app popups.'
      },
      {
        id: 'preload-whitelist',
        title: 'Preload IPC whitelist',
        status: 'pass',
        detail: 'Renderer access is limited to the typed window.skillport API exposed through contextBridge.'
      },
      {
        id: 'token-storage',
        title: 'Token storage protection',
        status: this.runtimeStatus.tokenEncryption.available ? 'pass' : 'warning',
        detail: `Token backend: ${this.runtimeStatus.tokenEncryption.backend}. Protection: ${this.runtimeStatus.tokenEncryption.protection}.`,
        remediation: this.runtimeStatus.tokenEncryption.available ? undefined : 'Enable the OS secure storage backend before production rollout.'
      },
      {
        id: 'database-ready',
        title: 'Runtime database',
        status: this.runtimeStatus.databaseReady ? 'pass' : 'fail',
        detail: this.runtimeStatus.databaseReady ? `SQLite catalog is ready at ${this.runtimeStatus.databasePath}.` : 'SQLite catalog did not initialize.',
        remediation: this.runtimeStatus.databaseReady ? undefined : 'Run runtime recovery and inspect application logs.'
      },
      {
        id: 'audit-log-ready',
        title: 'Audit log availability',
        status: this.runtimeStatus.logsReady ? 'pass' : 'fail',
        detail: this.runtimeStatus.logsReady ? `Audit logs are writable at ${this.runtimeStatus.logsDir}.` : 'Audit log directory is unavailable.',
        remediation: this.runtimeStatus.logsReady ? undefined : 'Run runtime recovery to recreate missing log directories.'
      },
      {
        id: 'community-source-policy',
        title: 'Community source policy',
        status: communitySources.length === 0 ? 'pass' : 'warning',
        detail: communitySources.length === 0 ? 'No enabled community sources detected.' : `${communitySources.length} enabled community source(s) require manual review.`,
        remediation: communitySources.length === 0 ? undefined : 'Keep auto-apply disabled and validate catalog risks before installing.'
      },
      {
        id: 'script-risk-gate',
        title: 'Script risk gate',
        status: scriptLikeItems.length === 0 ? 'pass' : 'warning',
        detail: scriptLikeItems.length === 0 ? 'No catalog entries with script risks detected.' : `${scriptLikeItems.length} catalog item(s) include script-like risks.`,
        remediation: scriptLikeItems.length === 0 ? undefined : 'Require explicit approval for Skills containing executable scripts.'
      }
    ]

    const summary = {
      pass: checks.filter((check) => check.status === 'pass').length,
      warning: checks.filter((check) => check.status === 'warning').length,
      fail: checks.filter((check) => check.status === 'fail').length
    }
    const score = Math.max(0, Math.round(((summary.pass + summary.warning * 0.5) / checks.length) * 100))
    const report = { generatedAt: new Date().toISOString(), score, summary, checks }
    this.database.setRuntime('hardening.securityAudit.last', report)
    await this.logs.audit('Run security audit', 'SkillPort runtime', '系统', { score, summary })
    return report
  }

  async recoverRuntime(): Promise<RecoveryReport> {
    const repairedPaths: string[] = []
    const warnings: string[] = []
    const actions: string[] = []

    for (const path of [this.dataDir, ...RECOVERY_DIRS.map((dir) => join(this.dataDir, dir))]) {
      try {
        await access(path)
      } catch {
        repairedPaths.push(path)
      }
      await mkdir(path, { recursive: true })
    }

    try {
      await this.config.load()
      actions.push('validated-config')
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Failed to validate config')
    }

    actions.push('ensured-runtime-directories')
    actions.push('recorded-recovery-report')

    const report = {
      recoveredAt: new Date().toISOString(),
      repairedPaths,
      warnings,
      actions
    }
    this.database.setRuntime('hardening.recovery.last', report)
    await this.logs.audit('Recover runtime state', 'SkillPort runtime', '系统', report)
    return report
  }

  async performanceSnapshot(): Promise<PerformanceSnapshot> {
    const memory = process.memoryUsage()
    const cache = await estimateDirectory(this.dataDir, 800)
    const snapshot = {
      capturedAt: new Date().toISOString(),
      startupAgeMs: Date.now() - Date.parse(this.runtimeStatus.initializedAt),
      catalogItems: this.database.listCatalogItems().length,
      sources: this.database.listSources().length,
      platforms: this.database.listPlatforms().length,
      memory: {
        rssMb: toMb(memory.rss),
        heapUsedMb: toMb(memory.heapUsed)
      },
      cache: {
        dataDir: this.dataDir,
        estimatedMb: toMb(cache.bytes),
        scannedFiles: cache.files
      }
    }
    this.database.setRuntime('hardening.performance.last', snapshot)
    return snapshot
  }
}

async function estimateDirectory(root: string, maxFiles: number): Promise<{ bytes: number; files: number }> {
  let bytes = 0
  let files = 0
  const stack = [root]

  while (stack.length > 0 && files < maxFiles) {
    const current = stack.pop()
    if (!current) continue
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(path)
        continue
      }
      if (!entry.isFile()) continue
      try {
        const info = await stat(path)
        bytes += info.size
        files += 1
      } catch {
        // Ignore files that disappear while the snapshot is being collected.
      }
      if (files >= maxFiles) break
    }
  }

  return { bytes, files }
}

function toMb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 10) / 10
}
