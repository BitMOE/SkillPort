import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import YAML from 'yaml'
import type { PlatformConfig } from '../../../shared/types'
import type { SkillPortDatabase } from '../storage/database'

interface AdapterFile {
  platforms?: AdapterPlatform[]
  aliases?: Record<string, { displayName: string; ruleTargets?: string[] }>
}

interface AdapterPlatform {
  key: string
  displayName: string
  enabled?: boolean
  skills?: {
    user?: { defaultPath?: string }
    project?: { defaultPath?: string }
  }
  rules?: Array<{ path: string }>
  install?: {
    defaultMode?: 'copy' | 'symlink'
    allowSymlink?: boolean
  }
  scan?: {
    enabled?: boolean
  }
}

export class PlatformService {
  private defaults = new Map<string, PlatformConfig>()

  constructor(private readonly database: SkillPortDatabase) {}

  async seedDefaults(): Promise<void> {
    this.defaults = await loadDefaults()
    if (this.database.listPlatforms().length > 0) return
    for (const platform of this.defaults.values()) {
      this.database.upsertPlatform({ key: platform.key, config: platformToConfig(platform) })
    }
  }

  list(): PlatformConfig[] {
    const rows = this.database.listPlatforms()
    const persisted = rows.map((row) => configToPlatform(row.key, row.config, this.defaults.get(row.key)))
    const missingDefaults = Array.from(this.defaults.values()).filter((platform) => !persisted.some((item) => item.key === platform.key))
    return [...persisted, ...missingDefaults].sort((a, b) => a.displayName.localeCompare(b.displayName))
  }

  update(platformKey: string, patch: Partial<PlatformConfig>): PlatformConfig {
    const current = this.list().find((platform) => platform.key === platformKey)
    if (!current) throw new Error(`Platform not found: ${platformKey}`)
    const next = { ...current, ...patch, key: platformKey }
    this.database.upsertPlatform({ key: platformKey, config: platformToConfig(next) })
    return next
  }

  reset(platformKey: string): PlatformConfig {
    const defaults = this.defaults.get(platformKey)
    if (!defaults) throw new Error(`Platform defaults not found: ${platformKey}`)
    this.database.upsertPlatform({ key: platformKey, config: platformToConfig(defaults) })
    return defaults
  }

  async validateTarget(platformKey: string): Promise<{ ok: boolean; messages: string[] }> {
    const platform = this.list().find((item) => item.key === platformKey)
    if (!platform) throw new Error(`Platform not found: ${platformKey}`)
    const paths = [platform.userSkillDir, ...platform.ruleTargets]
    const messages: string[] = []
    for (const targetPath of paths) {
      if (targetPath.includes('<project>')) continue
      const expanded = expandHome(targetPath)
      try {
        await access(expanded)
        messages.push(`${targetPath}: readable`)
      } catch {
        messages.push(`${targetPath}: not found or not readable`)
      }
    }
    return { ok: messages.every((message) => message.endsWith('readable')), messages }
  }
}

async function loadDefaults(): Promise<Map<string, PlatformConfig>> {
  const adapterPath = join(process.cwd(), 'adapters', 'platforms', 'builtin.yaml')
  const raw = await readFile(adapterPath, 'utf8')
  const parsed = YAML.parse(raw) as AdapterFile
  const platforms = new Map<string, PlatformConfig>()

  for (const adapter of parsed.platforms ?? []) {
    platforms.set(adapter.key, adapterToPlatform(adapter))
  }

  for (const [key, alias] of Object.entries(parsed.aliases ?? {})) {
    platforms.set(key, {
      key,
      displayName: alias.displayName,
      enabled: !['qoderwork', 'codebuddy', 'trae-cn', 'generic'].includes(key),
      health: 'healthy',
      installedCount: 0,
      userSkillDir: `~/.${key}/skills`,
      projectSkillDir: `<project>/.${key}/skills`,
      ruleTargets: alias.ruleTargets ?? [`${alias.displayName.toUpperCase()}.md`],
      installMode: 'copy',
      allowSymlink: true,
      scanEnabled: true
    })
  }

  return platforms
}

function adapterToPlatform(adapter: AdapterPlatform): PlatformConfig {
  return {
    key: adapter.key,
    displayName: adapter.displayName,
    enabled: adapter.enabled ?? true,
    health: adapter.enabled === false ? 'disabled' : 'healthy',
    installedCount: 0,
    userSkillDir: adapter.skills?.user?.defaultPath ?? `~/.${adapter.key}/skills`,
    projectSkillDir: adapter.skills?.project?.defaultPath ?? `<project>/.${adapter.key}/skills`,
    ruleTargets: (adapter.rules ?? []).map((rule) => rule.path),
    installMode: adapter.install?.defaultMode ?? 'copy',
    allowSymlink: adapter.install?.allowSymlink ?? true,
    scanEnabled: adapter.scan?.enabled ?? true
  }
}

function configToPlatform(key: string, config: Record<string, unknown>, defaults?: PlatformConfig): PlatformConfig {
  return {
    key,
    displayName: stringValue(config.displayName) ?? defaults?.displayName ?? key,
    enabled: booleanValue(config.enabled, defaults?.enabled ?? true),
    health: (stringValue(config.health) as PlatformConfig['health']) ?? defaults?.health ?? 'healthy',
    installedCount: numberValue(config.installedCount) ?? defaults?.installedCount ?? 0,
    userSkillDir: stringValue(config.userSkillDir) ?? defaults?.userSkillDir ?? `~/.${key}/skills`,
    projectSkillDir: stringValue(config.projectSkillDir) ?? defaults?.projectSkillDir ?? `<project>/.${key}/skills`,
    ruleTargets: stringArray(config.ruleTargets) ?? defaults?.ruleTargets ?? [],
    installMode: (stringValue(config.installMode) as PlatformConfig['installMode']) ?? defaults?.installMode ?? 'copy',
    allowSymlink: booleanValue(config.allowSymlink, defaults?.allowSymlink ?? true),
    scanEnabled: booleanValue(config.scanEnabled, defaults?.scanEnabled ?? true)
  }
}

function platformToConfig(platform: PlatformConfig): Record<string, unknown> {
  return {
    displayName: platform.displayName,
    enabled: platform.enabled,
    health: platform.health,
    installedCount: platform.installedCount,
    userSkillDir: platform.userSkillDir,
    projectSkillDir: platform.projectSkillDir,
    ruleTargets: platform.ruleTargets,
    installMode: platform.installMode,
    allowSymlink: platform.allowSymlink,
    scanEnabled: platform.scanEnabled
  }
}

function expandHome(value: string): string {
  if (!value.startsWith('~')) return value
  return value.replace(/^~(?=\/|\\|$)/, process.env.USERPROFILE ?? process.env.HOME ?? '~')
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.map(String) : undefined
}
