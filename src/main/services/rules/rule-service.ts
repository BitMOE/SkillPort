import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import YAML from 'yaml'
import type { JobRecord, RulePackage } from '../../../shared/types'
import type { LogService } from '../audit/log-service'
import { rulePackages, timestampedJob } from '../demo-data'
import type { PlatformService } from '../platforms/platform-service'

interface RuleApplication {
  id: string
  packageId: string
  projectRoot: string
  targets: Array<{ path: string; backupPath: string }>
  createdAt: string
}

export class RuleService {
  private readonly applications = new Map<string, RuleApplication>()

  constructor(
    private readonly dataDir: string,
    private readonly platforms: PlatformService,
    private readonly logs: LogService
  ) {}

  list(): RulePackage[] {
    return rulePackages
  }

  async scanProject(projectRoot: string): Promise<{ projectRoot: string; targets: Array<{ path: string; exists: boolean; managedBlocks: number }> }> {
    const paths = unique(this.platforms.list().flatMap((platform) => platform.ruleTargets)).map((target) => normalizeTarget(projectRoot, target))
    const targets = await Promise.all(
      paths.map(async (path) => {
        const content = await readFile(path, 'utf8').catch(() => '')
        return {
          path,
          exists: Boolean(content),
          managedBlocks: (content.match(/SKILLPORT:BEGIN/g) ?? []).length
        }
      })
    )
    return { projectRoot, targets }
  }

  async previewApply(params: { packageId: string; projectRoot: string; platformKeys: string[] }): Promise<{ diff: string }> {
    const pkg = this.package(params.packageId)
    const targets = this.targetPaths(params.projectRoot, params.platformKeys)
    const block = managedBlock(pkg, ['general', 'security', 'style'])
    const diff = targets
      .map((target) => [`--- ${target}`, `+++ ${target}`, `@@ managed block @@`, `+${block.split('\n').join('\n+')}`].join('\n'))
      .join('\n\n')
    return { diff }
  }

  async applyPackage(params: { packageId: string; projectRoot: string; platformKeys: string[]; selectedRuleIds: string[] }): Promise<JobRecord> {
    const pkg = this.package(params.packageId)
    const targets = this.targetPaths(params.projectRoot, params.platformKeys)
    const application: RuleApplication = {
      id: `rule-app-${randomUUID()}`,
      packageId: params.packageId,
      projectRoot: params.projectRoot,
      targets: [],
      createdAt: new Date().toISOString()
    }

    for (const target of targets) {
      await mkdir(dirname(target), { recursive: true })
      const existing = await readFile(target, 'utf8').catch(() => '')
      const backupPath = join(this.dataDir, 'backups', 'rules', `${application.id}`, target.replace(/[:\\/]/g, '_'))
      await mkdir(dirname(backupPath), { recursive: true })
      await writeFile(backupPath, existing, 'utf8')
      const next = replaceManagedBlock(existing, params.packageId, managedBlock(pkg, params.selectedRuleIds))
      await writeFile(target, next, 'utf8')
      application.targets.push({ path: target, backupPath })
    }

    this.applications.set(application.id, application)
    await this.writeLockfile(params.projectRoot, pkg, application)
    await this.logs.audit('Apply Rule package', params.packageId, '当前用户', application)
    return timestampedJob('应用 Rule 包', params.packageId, `已应用到 ${targets.length} 个规则目标`)
  }

  async rollback(applicationId: string): Promise<JobRecord> {
    const application = this.applications.get(applicationId)
    if (!application) throw new Error('Rule application not found or expired')
    for (const target of application.targets) {
      await mkdir(dirname(target.path), { recursive: true })
      await copyFile(target.backupPath, target.path)
    }
    await this.logs.audit('Rollback Rule package', application.packageId, '当前用户', application)
    return timestampedJob('回滚 Rule 包', application.packageId, `已恢复 ${application.targets.length} 个目标文件`)
  }

  private package(packageId: string): RulePackage {
    const pkg = rulePackages.find((item) => item.id === packageId)
    if (!pkg) throw new Error(`Rule package not found: ${packageId}`)
    return pkg
  }

  private targetPaths(projectRoot: string, platformKeys: string[]): string[] {
    return unique(
      this.platforms
        .list()
        .filter((platform) => platformKeys.includes(platform.key))
        .flatMap((platform) => platform.ruleTargets.map((target) => normalizeTarget(projectRoot, target)))
    )
  }

  private async writeLockfile(projectRoot: string, pkg: RulePackage, application: RuleApplication): Promise<void> {
    const lockPath = join(projectRoot, '.skillport.lock.yaml')
    const current: Record<string, unknown> = await readFile(lockPath, 'utf8')
      .then((raw) => objectValue(YAML.parse(raw)))
      .catch(() => ({}))
    const rules = Array.isArray(current.rules) ? (current.rules as Array<Record<string, unknown>>) : []
    const next = {
      ...current,
      version: 1,
      generatedAt: new Date().toISOString(),
      rules: [
        ...rules.filter((entry) => entry.packageId !== pkg.id),
        {
          packageId: pkg.id,
          version: pkg.version,
          applicationId: application.id,
          appliedTo: application.targets.map((target) => ({ path: target.path, mode: 'section_merge' }))
        }
      ]
    }
    await writeFile(lockPath, YAML.stringify(next), 'utf8')
  }
}

function managedBlock(pkg: RulePackage, ruleIds: string[]): string {
  return [
    `<!-- SKILLPORT:BEGIN ${pkg.id}@${pkg.version} -->`,
    `# ${pkg.name}`,
    ``,
    `Applied rules: ${ruleIds.join(', ') || 'all'}`,
    ``,
    `- Follow package version ${pkg.version}.`,
    `- Keep edits inside this managed block controlled by SkillPort.`,
    `- Review project-specific exceptions before committing changes.`,
    `<!-- SKILLPORT:END ${pkg.id} -->`,
    ``
  ].join('\n')
}

function replaceManagedBlock(existing: string, packageId: string, block: string): string {
  const pattern = new RegExp(`<!-- SKILLPORT:BEGIN ${escapeRegExp(packageId)}@[\\s\\S]*?<!-- SKILLPORT:END ${escapeRegExp(packageId)} -->\\n?`, 'm')
  if (pattern.test(existing)) return existing.replace(pattern, block)
  return existing.trimEnd() ? `${existing.trimEnd()}\n\n${block}` : block
}

function normalizeTarget(projectRoot: string, target: string): string {
  return target.replace('<project>', projectRoot)
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}
