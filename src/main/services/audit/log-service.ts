import { mkdir, appendFile } from 'node:fs/promises'
import { join } from 'node:path'

export class LogService {
  constructor(private readonly logsDir: string) {}

  path(): string {
    return this.logsDir
  }

  async ensure(): Promise<void> {
    await mkdir(this.logsDir, { recursive: true })
  }

  async app(level: 'info' | 'warn' | 'error', message: string, payload?: unknown): Promise<void> {
    await this.write('app.log', level, message, payload)
  }

  async job(level: 'info' | 'warn' | 'error', message: string, payload?: unknown): Promise<void> {
    await this.write('job.log', level, message, payload)
  }

  async audit(action: string, target: string, actor: string, payload?: unknown): Promise<void> {
    await this.write('audit.log', 'info', action, { target, actor, payload })
  }

  private async write(fileName: string, level: 'info' | 'warn' | 'error', message: string, payload?: unknown): Promise<void> {
    await this.ensure()
    const line = JSON.stringify({
      level,
      message,
      payload,
      createdAt: new Date().toISOString()
    })
    await appendFile(join(this.logsDir, fileName), `${line}\n`, 'utf8')
  }
}
