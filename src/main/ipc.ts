import { ipcMain } from 'electron'
import { z } from 'zod'
import type { ApiResult, PlatformConfig } from '../shared/types'
import {
  audit,
  dashboardSummary,
  jobs,
  timestampedJob
} from './services/demo-data'
import type { RuntimeServices } from './services/runtime'

const searchSchema = z.object({
  query: z.string().optional(),
  platform: z.string().optional(),
  status: z.string().optional(),
  trustLevel: z.string().optional()
})

const scanSchema = z.object({
  roots: z.array(z.string()).min(1),
  platformKeys: z.array(z.string()),
  ignore: z.array(z.string()).optional()
})

const sourceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['github', 'gitlab', 'self-hosted-gitlab', 'skills-sh', 'local-dir', 'archive']),
  name: z.string().min(1),
  enabled: z.boolean(),
  url: z.string().min(1),
  apiBase: z.string().optional(),
  branch: z.string().optional(),
  paths: z.array(z.string()).optional(),
  authRef: z.string().optional(),
  refreshIntervalMinutes: z.number().optional(),
  trustLevel: z.enum(['official', 'team', 'community', 'unknown']),
  lastSync: z.string().optional().default('从未同步'),
  status: z.enum(['success', 'warning', 'failed']).optional().default('success'),
  tokenState: z.enum(['healthy', 'warning', 'invalid', 'missing']).optional()
})

const planSchema = z.object({
  itemId: z.string(),
  platformKeys: z.array(z.string()).min(1),
  scope: z.enum(['user', 'project', 'system']),
  projectRoot: z.string().optional(),
  mode: z.enum(['copy', 'symlink'])
})

const rulePreviewSchema = z.object({
  packageId: z.string(),
  projectRoot: z.string(),
  platformKeys: z.array(z.string())
})

const ruleApplySchema = rulePreviewSchema.extend({
  selectedRuleIds: z.array(z.string())
})

const updatePolicySchema = z.object({
  autoCheck: z.boolean().optional(),
  autoApplyTrustedSources: z.boolean().optional(),
  allowMajorVersion: z.boolean().optional(),
  blockScriptSkills: z.boolean().optional(),
  schedule: z.enum(['manual', 'startup', 'daily', 'weekly']).optional()
})

export function registerIpc(runtime: RuntimeServices): void {
  handle('dashboard:summary', () => dashboardSummary())
  handle('runtime:status', () => runtime.status)
  handle('runtime:config', () => runtime.config.load())
  handle('security:token-status', () => ({
    ...runtime.tokens.status(),
    configuredTokens: runtime.tokens.listStates()
  }))
  handle('updates:policy', () => runtime.updates.policy())
  handle('updates:update-policy', (raw) => runtime.updates.updatePolicy(updatePolicySchema.parse(raw ?? {})))
  handle('updates:check-content', () => runtime.updates.checkContent())
  handle('updates:apply-content', (itemIds) => runtime.updates.applyContent(z.array(z.string()).parse(itemIds)))
  handle('app-updates:status', () => runtime.appUpdates.status())
  handle('app-updates:check', () => runtime.appUpdates.check())
  handle('app-updates:set-enterprise-disabled', (disabled) => runtime.appUpdates.setEnterpriseDisabled(Boolean(disabled)))
  handle('hardening:security-audit', () => runtime.hardening.securityAudit())
  handle('hardening:recover-runtime', () => runtime.hardening.recoverRuntime())
  handle('hardening:performance-snapshot', () => runtime.hardening.performanceSnapshot())

  handle('catalog:search', (raw) => {
    const params = searchSchema.parse(raw ?? {})
    return runtime.catalog.search(params)
  })

  handle('catalog:get-detail', (id) => runtime.catalog.getDetail(String(id)))
  handle('catalog:validate', (id) => runtime.catalog.validate(String(id)))

  handle('sources:list', () => runtime.sources.list())
  handle('sources:upsert', (raw) => runtime.sources.upsert(sourceSchema.parse(raw)))
  handle('sources:delete', (sourceId) => ({ deleted: runtime.sources.delete(String(sourceId)) }))
  handle('sources:sync', (sourceId) => runtime.sources.sync(String(sourceId)))
  handle('sources:sync-all', () => runtime.sources.syncAll())
  handle('sources:test-connection', (sourceId) => runtime.sources.testConnection(String(sourceId)))

  handle('scan:start', async (raw) => {
    const params = scanSchema.parse(raw)
    const results = await runtime.scan.start(params)
    return results.length > 0 ? results : demoScanResults()
  })
  handle('scan:import-candidate', (raw) => {
    const params = z.object({ candidateId: z.string(), mode: z.enum(['copy', 'symlink']) }).parse(raw)
    return runtime.scan.importCandidate(params)
  })

  handle('install:create-plan', (raw) => {
    const params = planSchema.parse(raw)
    return runtime.install.createPlan(params)
  })
  handle('install:execute', (planId) => {
    return runtime.install.execute(String(planId))
  })
  handle('install:uninstall', (installationId) => runtime.install.uninstall(String(installationId)))
  handle('install:rollback', (installationId, backupPath) => runtime.install.rollback(String(installationId), String(backupPath)))
  handle('install:open-target-dir', (targetPath) => runtime.install.openTargetDir(String(targetPath)))

  handle('rules:list', () => runtime.rules.list())
  handle('rules:scan-project', (projectRoot) => runtime.rules.scanProject(String(projectRoot)))
  handle('rules:preview-apply', (raw) => runtime.rules.previewApply(rulePreviewSchema.parse(raw)))
  handle('rules:apply-package', (raw) => {
    const params = ruleApplySchema.parse(raw)
    return runtime.rules.applyPackage(params)
  })
  handle('rules:rollback', (applicationId) => runtime.rules.rollback(String(applicationId)))

  handle('platforms:list', () => runtime.platforms.list())
  handle('platforms:update', (platformKey, config) => runtime.platforms.update(String(platformKey), config as Partial<PlatformConfig>))
  handle('platforms:reset', (platformKey) => runtime.platforms.reset(String(platformKey)))
  handle('platforms:validate-target', (platformKey) => runtime.platforms.validateTarget(String(platformKey)))

  handle('jobs:list', () => jobs)
  handle('jobs:retry', (jobId) => timestampedJob('重试任务', String(jobId), '任务已重新排队'))
  handle('audit:list', () => audit)
}

function handle<TArgs extends unknown[], TResult>(channel: string, listener: (...args: TArgs) => TResult | Promise<TResult>): void {
  ipcMain.handle(channel, async (_event, ...args: TArgs): Promise<ApiResult<TResult>> => {
    try {
      return { ok: true, data: await listener(...args) }
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'SKILLPORT_IPC_ERROR',
          message: error instanceof Error ? error.message : '未知错误',
          detail: error
        }
      }
    }
  })
}

function demoScanResults() {
  return [
    {
      id: 'local-terminal-master',
      name: 'terminal-master',
      version: '1.2.0',
      description: '提供安全、智能的终端命令执行与输出解析能力。',
      tags: ['Shell', 'CLI', 'Terminal'],
      path: '~/.claude/skills/terminal-master',
      detectedPlatform: 'Claude Code',
      fileCount: 8,
      checksum: 'sha256:local-a81c2d',
      risks: [{ level: 'medium' as const, message: '检测到可执行脚本文件 scripts/run.sh。' }],
      importable: true
    },
    {
      id: 'local-incident-responder',
      name: 'incident-responder',
      version: '1.0.0',
      description: '面向运维事故的排查、记录与响应建议。',
      tags: ['Ops', 'Incident'],
      path: '~/.agents/skills/incident-responder',
      detectedPlatform: 'Codex',
      fileCount: 7,
      checksum: 'sha256:local-b74e9f',
      risks: [],
      importable: true
    },
    {
      id: 'local-data-analyzer',
      name: 'data-analyzer',
      version: '1.1.0',
      description: '分析 CSV、日志和业务指标，输出可执行洞察。',
      tags: ['Data', 'Analysis'],
      path: '~/.gemini/skills/data-analyzer',
      detectedPlatform: 'Gemini CLI',
      fileCount: 7,
      checksum: 'sha256:local-77c10a',
      risks: [],
      importable: true
    }
  ]
}
