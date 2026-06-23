import type { ContentUpdateCandidate, ContentUpdatePolicy, JobRecord } from '../../../shared/types'
import type { CatalogService } from '../catalog/catalog-service'
import { timestampedJob } from '../demo-data'
import type { LogService } from '../audit/log-service'
import type { SkillPortDatabase } from '../storage/database'

const defaultPolicy: ContentUpdatePolicy = {
  autoCheck: true,
  autoApplyTrustedSources: false,
  allowMajorVersion: false,
  blockScriptSkills: true,
  schedule: 'startup'
}

export class UpdateService {
  private policyValue: ContentUpdatePolicy = defaultPolicy

  constructor(
    private readonly database: SkillPortDatabase,
    private readonly catalog: CatalogService,
    private readonly logs: LogService
  ) {
    this.policyValue = this.database.getRuntime<ContentUpdatePolicy>('content.update.policy') ?? defaultPolicy
  }

  policy(): ContentUpdatePolicy {
    return this.policyValue
  }

  updatePolicy(patch: Partial<ContentUpdatePolicy>): ContentUpdatePolicy {
    this.policyValue = { ...this.policyValue, ...patch }
    this.database.setRuntime('content.update.policy', this.policyValue)
    return this.policyValue
  }

  checkContent(): ContentUpdateCandidate[] {
    return this.catalog
      .search({})
      .filter((item) => Boolean(item.updateVersion))
      .map((item) => {
        const nextVersion = item.updateVersion!
        const blockedReasons = [
          ...(this.policyValue.allowMajorVersion || !isMajorUpgrade(item.version, nextVersion) ? [] : ['major version updates are disabled']),
          ...(this.policyValue.blockScriptSkills && item.riskCount > 0 ? ['risky/script-capable Skills require manual approval'] : []),
          ...(item.trustLevel === 'unknown' ? ['unknown trust level'] : [])
        ]
        return {
          itemId: item.id,
          name: item.name,
          currentVersion: item.version,
          nextVersion,
          type: item.type,
          trustLevel: item.trustLevel,
          autoApplicable: blockedReasons.length === 0 && this.policyValue.autoApplyTrustedSources && ['official', 'team'].includes(item.trustLevel),
          blockedReasons
        }
      })
  }

  async applyContent(itemIds: string[]): Promise<JobRecord> {
    const candidates = this.checkContent().filter((candidate) => itemIds.includes(candidate.itemId))
    const blocked = candidates.filter((candidate) => candidate.blockedReasons.length > 0)
    if (blocked.length > 0) {
      throw new Error(`Blocked updates: ${blocked.map((candidate) => candidate.name).join(', ')}`)
    }
    await this.logs.job('info', 'Content updates applied', { itemIds })
    return timestampedJob('更新内容包', `${candidates.length} items`, '已应用内容更新策略')
  }
}

function isMajorUpgrade(current: string | undefined, next: string): boolean {
  const currentMajor = current?.match(/^(\d+)\./)?.[1]
  const nextMajor = next.match(/^(\d+)\./)?.[1]
  return Boolean(currentMajor && nextMajor && currentMajor !== nextMajor)
}
