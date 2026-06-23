import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import YAML from 'yaml'
import type { CatalogItem, TrustLevel } from '../../../shared/types'
import { catalogItems as demoCatalogItems } from '../demo-data'
import type { LogService } from '../audit/log-service'
import type { SkillPortDatabase } from '../storage/database'

export interface CatalogSearchParams {
  query?: string
  platform?: string
  status?: string
  trustLevel?: string
  tag?: string
}

interface ParsedMarkdownPackage {
  type: CatalogItem['type']
  slug: string
  name: string
  description: string
  version?: string
  tags: string[]
  platforms: string[]
  metadata: Record<string, unknown>
  checksum: string
}

export class CatalogService {
  constructor(
    private readonly database: SkillPortDatabase,
    private readonly logs: LogService
  ) {}

  seedDefaults(): void {
    if (this.database.listCatalogItems().length > 0) return
    for (const item of demoCatalogItems) {
      this.upsert(item)
    }
  }

  search(params: CatalogSearchParams = {}): CatalogItem[] {
    const query = params.query?.toLowerCase().trim()
    return this.database
      .listCatalogItems()
      .map(toCatalogItem)
      .filter((item) => {
        const matchesQuery = !query || [item.name, item.description, item.slug, item.tags.join(' ')].join(' ').toLowerCase().includes(query)
        const matchesPlatform = !params.platform || params.platform === 'all' || item.platforms.includes(params.platform)
        const matchesStatus =
          !params.status ||
          params.status === 'all' ||
          (params.status === 'installed' && item.installed) ||
          (params.status === 'updateable' && Boolean(item.updateVersion)) ||
          (params.status === 'uninstalled' && !item.installed)
        const matchesTrust = !params.trustLevel || params.trustLevel === 'all' || item.trustLevel === params.trustLevel
        const matchesTag = !params.tag || item.tags.includes(params.tag)
        return matchesQuery && matchesPlatform && matchesStatus && matchesTrust && matchesTag
      })
  }

  getDetail(id: string): CatalogItem {
    const item = this.database.getCatalogItem(id)
    if (!item) throw new Error('Catalog item not found')
    return toCatalogItem(item)
  }

  validate(id: string): { valid: boolean; risks: string[] } {
    const item = this.getDetail(id)
    const siblings = this.search({}).filter((candidate) => candidate.slug === item.slug && candidate.sourceId !== item.sourceId)
    const risks = [
      ...(!item.version ? ['缺少 version 字段，不参与 SemVer 自动升级'] : []),
      ...(!isSemverLike(item.version) ? ['version 不是标准 SemVer 格式'] : []),
      ...(item.riskCount > 0 ? [`包含 ${item.riskCount} 个供应链风险提示`] : []),
      ...(siblings.length > 0 ? ['同名 Skill 来自多个源，需要人工确认'] : []),
      ...(item.trustLevel === 'unknown' ? ['来源信任等级未知'] : [])
    ]
    return { valid: risks.length === 0, risks }
  }

  upsert(item: CatalogItem): CatalogItem {
    this.database.upsertCatalogItem({
      id: item.id,
      type: item.type,
      sourceId: item.sourceId,
      slug: item.slug,
      name: item.name,
      description: item.description,
      version: item.version,
      tags: item.tags,
      trustLevel: item.trustLevel,
      checksum: item.checksum,
      sourcePath: item.sourcePath,
      metadata: {
        ...item.metadata,
        repoUrl: item.repoUrl,
        commitSha: item.commitSha,
        installed: item.installed,
        updateVersion: item.updateVersion,
        riskCount: item.riskCount,
        platforms: item.platforms
      }
    })
    return item
  }

  async ingestMarkdownFile(params: { sourceId: string; sourcePath: string; trustLevel: TrustLevel; filePath: string }): Promise<CatalogItem> {
    const markdown = await readFile(params.filePath, 'utf8')
    const parsed = parseMarkdownPackage(markdown, dirname(params.filePath))
    const item: CatalogItem = {
      id: `${params.sourceId}/${parsed.slug}`,
      type: parsed.type,
      sourceId: params.sourceId,
      slug: parsed.slug,
      name: parsed.name,
      description: parsed.description,
      version: parsed.version,
      tags: parsed.tags,
      trustLevel: params.trustLevel,
      checksum: parsed.checksum,
      sourcePath: params.sourcePath,
      installed: false,
      riskCount: riskCount(parsed),
      platforms: parsed.platforms,
      metadata: parsed.metadata
    }
    this.upsert(item)
    await this.logs.app('info', 'Catalog item ingested', { id: item.id, filePath: params.filePath })
    return item
  }
}

export function parseMarkdownPackage(markdown: string, packageRoot: string): ParsedMarkdownPackage {
  const { frontmatter, body } = splitFrontmatter(markdown)
  const name = stringValue(frontmatter.name) ?? heading(body) ?? basename(packageRoot)
  const slug = slugify(stringValue(frontmatter.id) ?? stringValue(frontmatter.slug) ?? name)
  const metadata = objectValue(frontmatter.metadata)
  const version = stringValue(frontmatter.version) ?? stringValue(metadata.version)
  const tags = uniqueStrings(arrayValue(frontmatter.tags) ?? arrayValue(metadata.tags) ?? [])
  const platforms = uniqueStrings(arrayValue(frontmatter.platforms) ?? arrayValue(objectValue(frontmatter.applies_to).platforms) ?? [])
  const type: CatalogItem['type'] = stringValue(frontmatter.kind)?.includes('rule') || basename(packageRoot).toLowerCase().includes('rule') ? 'rule_package' : 'skill'

  return {
    type,
    slug,
    name,
    description: stringValue(frontmatter.description) ?? firstParagraph(body) ?? '',
    version,
    tags,
    platforms,
    metadata: {
      ...frontmatter,
      packageRoot
    },
    checksum: `sha256:${createHash('sha256').update(markdown).digest('hex')}`
  }
}

function toCatalogItem(item: ReturnType<SkillPortDatabase['listCatalogItems']>[number]): CatalogItem {
  const metadata = item.metadata
  return {
    id: item.id,
    type: item.type as CatalogItem['type'],
    sourceId: item.sourceId,
    slug: item.slug,
    name: item.name,
    description: item.description,
    version: item.version,
    tags: item.tags,
    trustLevel: item.trustLevel as TrustLevel,
    checksum: item.checksum,
    sourcePath: item.sourcePath,
    repoUrl: stringValue(metadata.repoUrl),
    commitSha: stringValue(metadata.commitSha),
    installed: booleanValue(metadata.installed),
    updateVersion: stringValue(metadata.updateVersion),
    riskCount: numberValue(metadata.riskCount) ?? 0,
    platforms: arrayValue(metadata.platforms) ?? [],
    metadata
  }
}

function splitFrontmatter(markdown: string): { frontmatter: Record<string, unknown>; body: string } {
  if (!markdown.startsWith('---')) return { frontmatter: {}, body: markdown }
  const end = markdown.indexOf('\n---', 3)
  if (end === -1) return { frontmatter: {}, body: markdown }
  const raw = markdown.slice(3, end).trim()
  const body = markdown.slice(end + 4)
  const parsed = YAML.parse(raw)
  return { frontmatter: objectValue(parsed), body }
}

function riskCount(parsed: ParsedMarkdownPackage): number {
  return [!parsed.version, !isSemverLike(parsed.version)].filter(Boolean).length
}

function isSemverLike(version?: string): boolean {
  return !version || /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)
}

function heading(markdown: string): string | undefined {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim()
}

function firstParagraph(markdown: string): string | undefined {
  return markdown
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find((part) => part.length > 0 && !part.startsWith('#'))
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(String).map((value) => value.trim()).filter(Boolean)))
}

function arrayValue(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.map(String) : undefined
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function booleanValue(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}
