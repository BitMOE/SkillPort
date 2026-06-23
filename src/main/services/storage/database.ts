import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { dirname } from 'node:path'
import { mkdir } from 'node:fs/promises'

export class SkillPortDatabase {
  private readonly db: DatabaseSync

  private constructor(private readonly dbPath: string) {
    this.db = new DatabaseSync(dbPath)
    this.db.exec('PRAGMA foreign_keys = ON;')
    this.db.exec('PRAGMA journal_mode = WAL;')
    this.migrate()
  }

  static async open(dbPath: string): Promise<SkillPortDatabase> {
    await mkdir(dirname(dbPath), { recursive: true })
    return new SkillPortDatabase(dbPath)
  }

  path(): string {
    return this.dbPath
  }

  setRuntime(key: string, value: unknown): void {
    this.db
      .prepare(
        `INSERT INTO app_runtime (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(value), new Date().toISOString())
  }

  getRuntime<T>(key: string): T | undefined {
    const row = this.db.prepare('SELECT value FROM app_runtime WHERE key = ?').get(key) as { value: string } | undefined
    return row ? (JSON.parse(row.value) as T) : undefined
  }

  setSetting(key: string, value: unknown): void {
    this.db
      .prepare(
        `INSERT INTO settings (key, value_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(value), new Date().toISOString())
  }

  saveEncryptedToken(provider: string, label: string, ciphertextBase64: string): void {
    this.db
      .prepare(
        `INSERT INTO auth_tokens (provider, label, ciphertext_base64, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(provider, label) DO UPDATE SET ciphertext_base64 = excluded.ciphertext_base64, updated_at = excluded.updated_at`
      )
      .run(provider, label, ciphertextBase64, new Date().toISOString())
  }

  listTokenStates(): Array<{ provider: string; label: string; configured: boolean; updatedAt: string }> {
    return this.db
      .prepare('SELECT provider, label, updated_at as updatedAt FROM auth_tokens ORDER BY provider, label')
      .all()
      .map((row) => ({ ...(row as { provider: string; label: string; updatedAt: string }), configured: true }))
  }

  addJobEvent(jobId: string, level: string, message: string, payload?: unknown): void {
    this.db
      .prepare(
        `INSERT INTO job_events (id, job_id, level, message, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(randomUUID(), jobId, level, message, payload ? JSON.stringify(payload) : null, new Date().toISOString())
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_runtime (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        url TEXT NOT NULL,
        config_json TEXT NOT NULL DEFAULT '{}',
        trust_level TEXT NOT NULL DEFAULT 'unknown',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS catalog_items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        version TEXT,
        tags_json TEXT NOT NULL DEFAULT '[]',
        trust_level TEXT NOT NULL,
        checksum TEXT NOT NULL,
        source_path TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        checksum TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        path TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS platforms (
        key TEXT PRIMARY KEY,
        config_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS installations (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        platform_key TEXT NOT NULL,
        scope TEXT NOT NULL,
        target_path TEXT NOT NULL,
        mode TEXT NOT NULL,
        installed_at TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES catalog_items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS rule_packages (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        name TEXT NOT NULL,
        version TEXT,
        checksum TEXT NOT NULL,
        metadata_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rule_files (
        id TEXT PRIMARY KEY,
        package_id TEXT NOT NULL,
        source_path TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (package_id) REFERENCES rule_packages(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        root_path TEXT NOT NULL UNIQUE,
        config_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        target TEXT NOT NULL,
        actor TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS job_events (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS auth_tokens (
        provider TEXT NOT NULL,
        label TEXT NOT NULL,
        ciphertext_base64 TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (provider, label)
      );
    `)
  }
}
