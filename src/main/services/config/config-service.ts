import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import YAML from 'yaml'

export interface SkillPortConfig {
  app: {
    language: 'zh-CN' | 'zh-TW' | 'en'
    theme: 'system' | 'light' | 'dark'
    offlineMode: boolean
    autoStartLocalService: boolean
  }
  updates: {
    app: {
      autoCheck: boolean
      autoDownload: boolean
    }
    content: {
      autoCheck: boolean
      autoApplyTrustedSources: boolean
      allowMajorVersion: boolean
      blockScriptSkills: boolean
      schedule: 'manual' | 'startup' | 'daily' | 'weekly'
    }
  }
}

export const defaultConfig: SkillPortConfig = {
  app: {
    language: 'zh-CN',
    theme: 'system',
    offlineMode: false,
    autoStartLocalService: true
  },
  updates: {
    app: {
      autoCheck: true,
      autoDownload: false
    },
    content: {
      autoCheck: true,
      autoApplyTrustedSources: false,
      allowMajorVersion: false,
      blockScriptSkills: true,
      schedule: 'startup'
    }
  }
}

export class ConfigService {
  constructor(private readonly configPath: string) {}

  path(): string {
    return this.configPath
  }

  async load(): Promise<SkillPortConfig> {
    await this.ensureExists()
    const raw = await readFile(this.configPath, 'utf8')
    return { ...defaultConfig, ...YAML.parse(raw) } as SkillPortConfig
  }

  async save(config: SkillPortConfig): Promise<void> {
    await mkdir(dirname(this.configPath), { recursive: true })
    await writeFile(this.configPath, YAML.stringify(config), 'utf8')
  }

  private async ensureExists(): Promise<void> {
    try {
      await access(this.configPath)
    } catch {
      await this.save(defaultConfig)
    }
  }
}
