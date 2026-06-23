import { randomUUID } from 'node:crypto'
import { cp, lstat, mkdir, rename, symlink, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { shell } from 'electron'
import type { InstallMode, InstallPlan, JobRecord, Scope } from '../../../shared/types'
import type { CatalogService } from '../catalog/catalog-service'
import { timestampedJob } from '../demo-data'
import type { LogService } from '../audit/log-service'
import type { PlatformService } from '../platforms/platform-service'
import type { SkillPortDatabase } from '../storage/database'

interface InstallPlanRecord extends InstallPlan {
  scope: Scope
}

interface CreatePlanRequest {
  itemId: string
  platformKeys: string[]
  scope: Scope
  projectRoot?: string
  mode: 'copy' | 'symlink'
  overwritePolicy?: 'fail' | 'backup-and-replace' | 'skip'
}

export class InstallService {
  private readonly plans = new Map<string, InstallPlanRecord>()

  constructor(
    private readonly dataDir: string,
    private readonly database: SkillPortDatabase,
    private readonly catalog: CatalogService,
    private readonly platforms: PlatformService,
    private readonly logs: LogService
  ) {}

  async createPlan(request: CreatePlanRequest): Promise<InstallPlan> {
    const item = this.catalog.getDetail(request.itemId)
    const artifactPath = await this.ensureArtifact(item.id)
    const targets = await Promise.all(
      this.platforms
        .list()
        .filter((platform) => request.platformKeys.includes(platform.key))
        .map(async (platform) => {
          const basePath = request.scope === 'project' ? platform.projectSkillDir.replace('<project>', request.projectRoot ?? '<project>') : platform.userSkillDir
          const targetPath = expandHome(join(basePath, item.slug))
          const exists = await pathExists(targetPath)
          const backupPath = exists ? join(this.dataDir, 'backups', 'skills', platform.key, `${item.slug}-${Date.now()}`) : undefined
          return {
            platformKey: platform.key,
            targetPath,
            mode: preferredMode(request.mode),
            conflict: exists ? '目标路径已存在，将按策略处理' : undefined,
            backupPath
          }
        })
    )

    const plan: InstallPlanRecord = {
      id: `plan-${randomUUID()}`,
      itemId: item.id,
      artifactPath,
      targets,
      warnings: [
        ...(item.riskCount > 0 ? ['该 Skill 包含风险提示，执行前请查看详情。'] : []),
        ...(request.mode === 'symlink' && process.platform === 'win32' ? ['Windows 将优先尝试 directory symlink，失败后回退到 junction，再失败回退到 copy。'] : [])
      ],
      scope: request.scope
    }
    this.plans.set(plan.id, plan)
    return plan
  }

  async execute(planId: string): Promise<JobRecord> {
    const plan = this.plans.get(planId)
    if (!plan) throw new Error('Install plan not found or expired')
    for (const target of plan.targets) {
      if (target.conflict && target.backupPath) {
        await mkdir(dirname(target.backupPath), { recursive: true })
        await rename(target.targetPath, target.backupPath)
      }
      await mkdir(dirname(target.targetPath), { recursive: true })
      const mode = await installArtifact(plan.artifactPath, target.targetPath, target.mode)
      this.database.addInstallation({
        id: randomUUID(),
        itemId: plan.itemId,
        platformKey: target.platformKey,
        scope: plan.scope,
        targetPath: target.targetPath,
        mode
      })
    }
    await this.logs.audit('Install Skill', plan.itemId, '当前用户', plan)
    return timestampedJob('安装 Skill', plan.itemId, `已安装到 ${plan.targets.length} 个平台`)
  }

  async rollback(installationId: string, backupPath: string): Promise<JobRecord> {
    if (!(await pathExists(backupPath))) throw new Error('Backup path not found')
    this.database.removeInstallation(installationId)
    await this.logs.audit('Rollback installation', installationId, '当前用户', { backupPath })
    return timestampedJob('回滚安装', installationId, `可从备份恢复：${backupPath}`)
  }

  async uninstall(installationId: string): Promise<JobRecord> {
    this.database.removeInstallation(installationId)
    await this.logs.audit('Uninstall Skill', installationId, '当前用户')
    return timestampedJob('卸载 Skill', installationId, '安装记录已移除')
  }

  async openTargetDir(targetPath: string): Promise<{ opened: boolean }> {
    await shell.openPath(targetPath)
    return { opened: true }
  }

  private async ensureArtifact(itemId: string): Promise<string> {
    const item = this.catalog.getDetail(itemId)
    const artifactPath = join(this.dataDir, 'artifacts', item.slug)
    await mkdir(artifactPath, { recursive: true })
    await writeFile(
      join(artifactPath, 'SKILL.md'),
      [`---`, `name: ${item.name}`, `version: "${item.version ?? '0.0.0'}"`, `tags:`, ...item.tags.map((tag) => `  - ${tag}`), `---`, ``, `# ${item.name}`, ``, item.description].join('\n'),
      'utf8'
    )
    return artifactPath
  }
}

async function installArtifact(artifactPath: string, targetPath: string, mode: InstallMode): Promise<InstallMode> {
  if (mode === 'copy') {
    await cp(artifactPath, targetPath, { recursive: true })
    return 'copy'
  }
  if (mode === 'junction') {
    try {
      await symlink(artifactPath, targetPath, 'junction')
      return 'junction'
    } catch {
      await cp(artifactPath, targetPath, { recursive: true })
      return 'copy'
    }
  }
  try {
    await symlink(artifactPath, targetPath, 'dir')
    return 'symlink'
  } catch {
    if (process.platform === 'win32') {
      try {
        await symlink(artifactPath, targetPath, 'junction')
        return 'junction'
      } catch {
        await cp(artifactPath, targetPath, { recursive: true })
        return 'copy'
      }
    }
    await cp(artifactPath, targetPath, { recursive: true })
    return 'copy'
  }
}

async function pathExists(path: string): Promise<boolean> {
  return lstat(path)
    .then(() => true)
    .catch(() => false)
}

function preferredMode(mode: 'copy' | 'symlink'): InstallMode {
  return process.platform === 'win32' && mode === 'symlink' ? 'junction' : mode
}

function expandHome(path: string): string {
  const expanded = path.startsWith('~') ? path.replace(/^~(?=\/|\\|$)/, process.env.USERPROFILE ?? process.env.HOME ?? '~') : path
  return resolve(expanded)
}
