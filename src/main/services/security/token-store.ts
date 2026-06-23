import { safeStorage } from 'electron'
import type { SkillPortDatabase } from '../storage/database'

export class TokenStore {
  constructor(private readonly database: SkillPortDatabase) {}

  status(): { available: boolean; backend: string; protection: 'system' | 'basic' | 'unavailable' } {
    const available = safeStorage.isEncryptionAvailable()
    return {
      available,
      backend: process.platform === 'win32' ? 'DPAPI' : process.platform === 'darwin' ? 'Keychain' : 'Secret Service',
      protection: available ? 'system' : process.platform === 'linux' ? 'basic' : 'unavailable'
    }
  }

  save(provider: string, label: string, token: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS token encryption is not available')
    }
    const ciphertext = safeStorage.encryptString(token).toString('base64')
    this.database.saveEncryptedToken(provider, label, ciphertext)
  }

  listStates(): Array<{ provider: string; label: string; configured: boolean; updatedAt: string }> {
    return this.database.listTokenStates()
  }
}
