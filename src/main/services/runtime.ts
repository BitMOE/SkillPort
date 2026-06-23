import { join } from 'node:path'
import type { RuntimeStatus } from '../../shared/types'
import { LogService } from './audit/log-service'
import { ConfigService } from './config/config-service'
import { TokenStore } from './security/token-store'
import { SourceService } from './sources/source-service'
import { SkillPortDatabase } from './storage/database'

export interface RuntimeServices {
  dataDir: string
  database: SkillPortDatabase
  config: ConfigService
  logs: LogService
  tokens: TokenStore
  sources: SourceService
  status: RuntimeStatus
}

export async function initializeRuntime(dataDir: string): Promise<RuntimeServices> {
  const database = await SkillPortDatabase.open(join(dataDir, 'catalog.sqlite'))
  const config = new ConfigService(join(dataDir, 'config.yaml'))
  const logs = new LogService(join(dataDir, 'logs'))
  const tokens = new TokenStore(database)
  const sources = new SourceService(database, logs)

  await logs.ensure()
  const loadedConfig = await config.load()
  database.setSetting('app.config', loadedConfig)
  sources.seedDefaults()

  const status: RuntimeStatus = {
    dataDir,
    databasePath: database.path(),
    databaseReady: true,
    configPath: config.path(),
    configReady: true,
    logsDir: logs.path(),
    logsReady: true,
    tokenEncryption: tokens.status(),
    initializedAt: new Date().toISOString()
  }

  database.setRuntime('runtime.status', status)
  await logs.app('info', 'SkillPort runtime initialized', status)

  return {
    dataDir,
    database,
    config,
    logs,
    tokens,
    sources,
    status
  }
}
