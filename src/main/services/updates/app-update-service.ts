import { app } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import type { AppUpdateStatus } from '../../../shared/types'
import type { SkillPortDatabase } from '../storage/database'

const defaultStatus: AppUpdateStatus = {
  provider: 'github',
  channel: 'stable',
  autoCheck: true,
  autoDownload: false,
  enterpriseDisabled: false,
  state: 'idle',
  message: 'App update service initialized'
}

export class AppUpdateService {
  private statusValue: AppUpdateStatus

  constructor(private readonly database: SkillPortDatabase) {
    this.statusValue = this.database.getRuntime<AppUpdateStatus>('app.update.status') ?? defaultStatus
    autoUpdater.logger = log
    autoUpdater.autoDownload = this.statusValue.autoDownload
    autoUpdater.channel = this.statusValue.channel
    autoUpdater.on('update-available', () => this.setState('available', 'Update available'))
    autoUpdater.on('update-not-available', () => this.setState('not_available', 'No update available'))
    autoUpdater.on('update-downloaded', () => this.setState('downloaded', 'Update downloaded and ready to install'))
    autoUpdater.on('error', (error) => this.setState('error', error.message))
  }

  status(): AppUpdateStatus {
    return this.statusValue
  }

  async check(): Promise<AppUpdateStatus> {
    if (this.statusValue.enterpriseDisabled) {
      return this.setState('idle', 'App updates disabled by enterprise policy')
    }
    if (!app.isPackaged) {
      return this.setState('not_available', 'Update checks run only in packaged builds')
    }
    this.setState('checking', 'Checking for updates')
    await autoUpdater.checkForUpdates()
    return this.statusValue
  }

  setEnterpriseDisabled(disabled: boolean): AppUpdateStatus {
    this.statusValue = {
      ...this.statusValue,
      enterpriseDisabled: disabled,
      message: disabled ? 'App updates disabled by enterprise policy' : 'App updates enabled'
    }
    this.persist()
    return this.statusValue
  }

  private setState(state: AppUpdateStatus['state'], message: string): AppUpdateStatus {
    this.statusValue = { ...this.statusValue, state, message }
    this.persist()
    return this.statusValue
  }

  private persist(): void {
    this.database.setRuntime('app.update.status', this.statusValue)
  }
}
