import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, normalize } from 'node:path'
import fg from 'fast-glob'
import type {
  AuditRecord,
  CatalogItem,
  DashboardSummary,
  InstallPlan,
  JobRecord,
  LocalSkillCandidate,
  PlatformConfig,
  RulePackage,
  SourceConfig
} from '../../shared/types'

const now = new Date('2026-06-23T13:35:00+08:00')

export const catalogItems: CatalogItem[] = [
  {
    id: 'pr-review',
    type: 'skill',
    sourceId: 'company-github-skills',
    slug: 'pr-review',
    name: 'pr-review',
    description: '自动化 PR 评审：代码质量、最佳实践、安全与潜在问题。',
    version: '1.3.0',
    tags: ['review', 'code-quality', 'github', 'automation'],
    trustLevel: 'official',
    checksum: 'sha256:8f3c2ff3e4b9a8d2c1f6b3e7d9a0c8e5b2f4d7a9',
    sourcePath: 'skills/pr-review',
    repoUrl: 'https://github.com/tsm-official/pr-review',
    commitSha: '4bc9d32',
    installed: true,
    riskCount: 2,
    platforms: ['claude-code', 'cursor', 'codex', 'windsurf', 'gemini-cli', 'qoder'],
    metadata: { owner: 'tsm-official', size: '24.6 KB' }
  },
  {
    id: 'context7-docs',
    type: 'skill',
    sourceId: 'skills-sh',
    slug: 'context7-docs',
    name: 'context7-docs',
    description: '实时文档与代码示例检索，提升开发效率。',
    version: '2.1.0',
    tags: ['docs', 'search', 'context7'],
    trustLevel: 'official',
    checksum: 'sha256:8f3a7c9d2b1e0a4f6c5d8b9e2f7a3c1d',
    sourcePath: 'skills/context7-docs',
    repoUrl: 'https://skills.sh/context7-docs',
    installed: true,
    updateVersion: '2.2.0',
    riskCount: 0,
    platforms: ['claude-code', 'cursor', 'codex', 'cline', 'opencode', 'gemini-cli'],
    metadata: { lastChangedBy: '张伟' }
  },
  {
    id: 'polarion-workitems',
    type: 'skill',
    sourceId: 'corp-gitlab-rules',
    slug: 'polarion-workitems',
    name: 'polarion-workitems',
    description: '集成 Polarion 工单与查询，支持状态流转。',
    version: '1.2.0',
    tags: ['polarion', 'workitems', 'alm'],
    trustLevel: 'team',
    checksum: 'sha256:aa40ef291d128cc843e5',
    sourcePath: 'skills/polarion-workitems',
    repoUrl: 'https://gitlab.company.com/platform/skills',
    installed: false,
    riskCount: 1,
    platforms: ['claude-code', 'cursor', 'codex'],
    metadata: {}
  },
  {
    id: 'repo-refactor',
    type: 'skill',
    sourceId: 'company-github-skills',
    slug: 'repo-refactor',
    name: 'repo-refactor',
    description: '安全的重构助手：提取、重命名、移动代码。',
    version: '2.0.0',
    tags: ['refactor', 'ast', 'code'],
    trustLevel: 'official',
    checksum: 'sha256:7c9b1d',
    sourcePath: 'skills/repo-refactor',
    repoUrl: 'https://github.com/acme/skills',
    installed: false,
    riskCount: 0,
    platforms: ['cursor', 'codex', 'windsurf'],
    metadata: {}
  },
  {
    id: 'requirements-check',
    type: 'skill',
    sourceId: 'skills-sh',
    slug: 'requirements-check',
    name: 'requirements-check',
    description: '检查需求完整性、一致性与可测性。',
    version: '0.4.3',
    tags: ['requirements', 'qa', 'validation'],
    trustLevel: 'community',
    checksum: 'sha256:55f01d',
    sourcePath: 'skills/requirements-check',
    repoUrl: 'https://skills.sh/requirements-check',
    installed: false,
    riskCount: 0,
    platforms: ['claude-code', 'codex'],
    metadata: {}
  },
  {
    id: 'secure-coding',
    type: 'skill',
    sourceId: 'corp-gitlab-rules',
    slug: 'secure-coding',
    name: 'secure-coding',
    description: '安全编码检查与审查建议，覆盖 OWASP Top 10。',
    version: '1.0.3',
    tags: ['security', 'owasp', 'scan'],
    trustLevel: 'team',
    checksum: 'sha256:73f2d0',
    sourcePath: 'skills/secure-coding',
    repoUrl: 'https://gitlab.company.com/platform/skills',
    installed: true,
    riskCount: 0,
    platforms: ['claude-code', 'cursor'],
    metadata: {}
  }
]

export const sources: SourceConfig[] = [
  {
    id: 'skills-sh',
    kind: 'skills-sh',
    name: 'skills.sh 官方源',
    enabled: true,
    url: 'https://skills.sh',
    apiBase: 'https://api.skills.sh',
    branch: 'main',
    paths: ['/skills', '/rules'],
    authRef: 'default',
    refreshIntervalMinutes: 60,
    trustLevel: 'community',
    lastSync: '5 分钟前',
    status: 'success',
    tokenState: 'healthy'
  },
  {
    id: 'company-github-skills',
    kind: 'github',
    name: 'Company GitHub Skills',
    enabled: true,
    url: 'https://github.com/acme/skills',
    branch: 'main',
    paths: ['/skills'],
    trustLevel: 'team',
    lastSync: '18 分钟前',
    status: 'success',
    tokenState: 'healthy'
  },
  {
    id: 'corp-gitlab-rules',
    kind: 'gitlab',
    name: 'Corp GitLab Rules',
    enabled: true,
    url: 'https://gitlab.com/acme/rules',
    branch: 'main',
    paths: ['/rule-packages'],
    trustLevel: 'team',
    lastSync: '36 分钟前',
    status: 'success',
    tokenState: 'warning'
  },
  {
    id: 'self-hosted-gitlab',
    kind: 'self-hosted-gitlab',
    name: 'Self-hosted GitLab Skills',
    enabled: true,
    url: 'https://gitlab.acme.local/skills',
    apiBase: 'https://gitlab.acme.local/api/v4',
    branch: 'main',
    paths: ['/skills'],
    trustLevel: 'team',
    lastSync: '1 小时前',
    status: 'failed',
    tokenState: 'invalid'
  },
  {
    id: 'local-folder',
    kind: 'local-dir',
    name: 'Local Folder Source',
    enabled: true,
    url: '~/tsm/sources/local-skills',
    trustLevel: 'team',
    lastSync: '2 小时前',
    status: 'success'
  }
]

export const platforms: PlatformConfig[] = [
  ['claude-code', 'Claude Code', 32, '~/.claude/skills', '<project>/.claude/skills', ['CLAUDE.md', '.claude/CLAUDE.md']],
  ['cursor', 'Cursor', 28, '.cursor/skills', '<project>/.cursor/skills', ['.cursor/rules', '.cursorrules']],
  ['windsurf', 'Windsurf', 24, '~/.codeium/windsurf/skills', '<project>/.windsurf/skills', ['.windsurfrules']],
  ['codex', 'Codex', 18, '~/.codex/skills', '<project>/.codex/skills', ['AGENTS.md']],
  ['gemini-cli', 'Gemini CLI', 16, '~/.gemini/skills', '<project>/.gemini/skills', ['GEMINI.md']],
  ['cline', 'Cline', 14, '~/.cline/skills', '<project>/.cline/skills', ['.clinerules']],
  ['kiro', 'Kiro', 9, '~/.kiro/skills', '<project>/.kiro/skills', ['.kiro/steering']],
  ['kilo-code', 'Kilo Code', 8, '~/.kilo/skills', '<project>/.kilo/skills', ['.kilocode/rules']],
  ['qoder', 'Qoder', 10, '~/.qoder/skills', '<project>/.qoder/skills', ['QODER.md']],
  ['qoderwork', 'QoderWork', 7, '~/.qoderwork/skills', '<project>/.qoderwork/skills', ['QODERWORK.md']],
  ['codebuddy', 'CodeBuddy', 6, '~/.codebuddy/skills', '<project>/.codebuddy/skills', ['CODEBUDDY.md']],
  ['trae', 'Trae', 11, '~/.trae/skills', '<project>/.trae/skills', ['.traerules']],
  ['trae-cn', 'Trae CN', 5, '~/.trae-cn/skills', '<project>/.trae-cn/skills', ['.trae-cn/rules']],
  ['opencode', 'OpenCode', 12, '~/.opencode/skills', '<project>/.opencode/skills', ['opencode.md']],
  ['generic', 'Generic', 4, '~/skills', '<project>/skills', ['RULES.md']]
].map(([key, displayName, installedCount, userSkillDir, projectSkillDir, ruleTargets], index) => ({
  key: key as string,
  displayName: displayName as string,
  enabled: !['kiro', 'qoderwork', 'codebuddy', 'trae-cn', 'generic'].includes(key as string),
  health: key === 'cline' ? 'warning' : ['kiro', 'qoderwork', 'codebuddy', 'trae-cn', 'generic'].includes(key as string) ? 'disabled' : 'healthy',
  installedCount: installedCount as number,
  userSkillDir: userSkillDir as string,
  projectSkillDir: projectSkillDir as string,
  ruleTargets: ruleTargets as string[],
  installMode: index % 3 === 0 ? 'symlink' : 'copy',
  allowSymlink: true,
  scanEnabled: index < 12
}))

export const jobs: JobRecord[] = [
  { id: 'job-1', type: '同步源', target: 'sync: official-skill-repo', status: 'success', actor: '定时任务', createdAt: '5 分钟前', message: '新增 23 个 Skills，更新 47 个 Skills' },
  { id: 'job-2', type: '安装 Skill', target: 'context7-docs', status: 'success', actor: '张伟', createdAt: '18 分钟前', message: '安装到 6 个平台' },
  { id: 'job-3', type: '应用 Rule 包', target: 'acme-rule-pack v2.1.0', status: 'success', actor: '李娜', createdAt: '35 分钟前', message: '应用 8 个平台，42 条规则' },
  { id: 'job-4', type: '更新 Skill', target: 'render, prettier, ripgrep', status: 'partial_success', actor: '定时任务', createdAt: '1 小时前', message: '3 个 Skill 部分成功' },
  { id: 'job-5', type: '同步源', target: 'gitlab:acme/skill-repo', status: 'failed', actor: '定时任务', createdAt: '2 小时前', message: 'rate limit exceeded' }
]

export const audit: AuditRecord[] = [
  { id: 'audit-1', level: 'info', action: '同步源 official-skill-repo 成功', target: 'Skill Store', actor: '系统', createdAt: '5 分钟前' },
  { id: 'audit-2', level: 'info', action: '安装 Skill: context7-docs', target: 'Claude Code, Cursor, Codex', actor: '张伟', createdAt: '18 分钟前' },
  { id: 'audit-3', level: 'info', action: '应用 Rule 包: acme-rule-pack v2.1.0', target: 'AGENTS.md', actor: '李娜', createdAt: '35 分钟前' },
  { id: 'audit-4', level: 'warning', action: '更新 Skill 时发现版本冲突', target: 'render, prettier, ripgrep', actor: '系统', createdAt: '1 小时前' }
]

export const rulePackages: RulePackage[] = [
  { id: 'frontend-nextjs', name: 'frontend-nextjs', version: '1.4.2', source: 'GitHub', status: 'applied', tags: ['前端开发', 'React', 'Next.js', 'TypeScript', 'ESLint', 'Prettier'], appliesTo: 'platform:web globs:**/*.{ts,tsx,js,jsx}', ruleCount: 18, enabledRules: 17 },
  { id: 'backend-java', name: 'backend-java', version: '2.3.1', source: 'GitLab', status: 'updateable', tags: ['后端开发', 'Java', 'Spring'], appliesTo: 'platform:backend globs:**/*.java', ruleCount: 22, enabledRules: 20 },
  { id: 'polarion-project-rules', name: 'polarion-project-rules', version: '1.7.0', source: 'GitHub', status: 'applied', tags: ['Polarion', '项目管理'], appliesTo: 'platform:polarion globs:**/*', ruleCount: 14, enabledRules: 14 },
  { id: 'secure-coding-pack', name: 'secure-coding-pack', version: '1.2.3', source: 'GitHub', status: 'updateable', tags: ['安全编码', '通用'], appliesTo: 'platform:all globs:**/*', ruleCount: 31, enabledRules: 29 },
  { id: 'generic-agent-guardrails', name: 'generic-agent-guardrails', version: '1.1.0', source: 'GitLab', status: 'not_applied', tags: ['Agent 通用约束', '最佳实践'], appliesTo: 'platform:all globs:**/*', ruleCount: 9, enabledRules: 0 }
]

export const installPlans = new Map<string, InstallPlan>()

export function dashboardSummary(): DashboardSummary {
  return {
    installedSkills: 128,
    updateableSkills: 15,
    enabledPlatforms: platforms.filter((platform) => platform.enabled).length,
    totalPlatforms: platforms.length,
    lastSyncStatus: 'success',
    cacheUsageGb: 12.4,
    cacheLimitGb: 50,
    online: true,
    githubToken: 'healthy',
    gitlabToken: 'healthy',
    recentJobs: jobs,
    recentAudit: audit
  }
}

export function createInstallPlan(dataDir: string, itemId: string, platformKeys: string[], scope: string, mode: 'copy' | 'symlink'): InstallPlan {
  const item = catalogItems.find((entry) => entry.id === itemId)
  if (!item) {
    throw new Error(`Catalog item not found: ${itemId}`)
  }

  const plan: InstallPlan = {
    id: `plan-${Date.now()}`,
    itemId,
    artifactPath: join(dataDir, 'artifacts', item.slug),
    targets: platforms
      .filter((platform) => platformKeys.includes(platform.key))
      .map((platform) => ({
        platformKey: platform.key,
        targetPath: scope === 'project' ? platform.projectSkillDir.replace('<project>', '<selected-project>') : join(platform.userSkillDir, item.slug),
        mode: process.platform === 'win32' && mode === 'symlink' ? 'junction' : mode,
        conflict: item.installed ? '目标路径已有安装，将先创建备份' : undefined,
        backupPath: item.installed ? join(dataDir, 'backups', platform.key, `${item.slug}-${Date.now()}`) : undefined
      })),
    warnings: item.riskCount > 0 ? ['该 Skill 包含风险提示，执行前请查看安装计划。'] : []
  }

  installPlans.set(plan.id, plan)
  return plan
}

export async function ensureDataDirs(dataDir: string): Promise<void> {
  await Promise.all(['artifacts', 'backups', 'logs', 'temp', 'lock'].map((name) => mkdir(join(dataDir, name), { recursive: true })))
}

export async function scanLocalSkills(roots: string[], ignore: string[] = []): Promise<LocalSkillCandidate[]> {
  const patterns = roots.map((root) => normalize(join(root, '**/SKILL.md')).replace(/\\/g, '/'))
  const entries = await fg(patterns, {
    onlyFiles: true,
    dot: true,
    unique: true,
    ignore: ['**/.git/**', '**/node_modules/**', '**/dist/**', '**/target/**', '**/.venv/**', ...ignore]
  })

  return Promise.all(entries.slice(0, 80).map(toCandidate))
}

async function toCandidate(skillFile: string): Promise<LocalSkillCandidate> {
  const root = dirname(skillFile)
  const markdown = await readFile(skillFile, 'utf8').catch(() => '')
  const children = existsSync(root) ? await readdir(root).catch(() => []) : []
  const fileCount = await countFiles(root)
  const hasScripts = children.some((name) => name.toLowerCase() === 'scripts')
  const hasVersion = /(^|\n)version\s*:/i.test(markdown) || /metadata:\s*[\s\S]*version\s*:/i.test(markdown)
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
  const name = title || root.split(/[\\/]/).filter(Boolean).pop() || 'local-skill'

  return {
    id: createHash('sha1').update(root).digest('hex').slice(0, 12),
    name,
    version: markdown.match(/version\s*:\s*["']?([^"'\n]+)/i)?.[1]?.trim(),
    description: markdown.match(/description\s*:\s*["']?([^"'\n]+)/i)?.[1]?.trim() || '从本地目录扫描发现的 Skill。',
    tags: Array.from(markdown.matchAll(/-\s+([a-zA-Z0-9_-]+)/g)).slice(0, 4).map((match) => match[1]),
    path: root,
    detectedPlatform: detectPlatform(root),
    fileCount,
    checksum: `sha256:${createHash('sha256').update(markdown).digest('hex').slice(0, 16)}`,
    risks: [
      ...(hasScripts ? [{ level: 'medium' as const, message: '包含 scripts 目录，导入前建议人工审查。' }] : []),
      ...(!hasVersion ? [{ level: 'medium' as const, message: '未在 SKILL.md 中发现 version 字段。' }] : [])
    ],
    importable: true
  }
}

async function countFiles(root: string): Promise<number> {
  const entries = await fg('**/*', { cwd: root, onlyFiles: true, dot: true, ignore: ['**/.git/**', '**/node_modules/**'] }).catch(() => [])
  return entries.length
}

function detectPlatform(root: string): string | undefined {
  const normalized = root.replace(/\\/g, '/').toLowerCase()
  if (normalized.includes('.claude')) return 'Claude Code'
  if (normalized.includes('.codex') || normalized.includes('.agents')) return 'Codex'
  if (normalized.includes('.cursor')) return 'Cursor'
  if (normalized.includes('.gemini')) return 'Gemini CLI'
  return undefined
}

export async function readablePath(path: string): Promise<boolean> {
  return stat(path)
    .then(() => true)
    .catch(() => false)
}

export function timestampedJob(type: string, target: string, message: string, status: JobRecord['status'] = 'success'): JobRecord {
  return {
    id: `job-${Date.now()}`,
    type,
    target,
    status,
    actor: '当前用户',
    createdAt: formatTime(now),
    message
  }
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
