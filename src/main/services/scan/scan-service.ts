import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import type { JobRecord, LocalSkillCandidate } from '../../../shared/types'
import type { CatalogService } from '../catalog/catalog-service'
import { timestampedJob } from '../demo-data'
import type { LogService } from '../audit/log-service'

interface ScanRequest {
  roots: string[]
  platformKeys: string[]
  ignore?: string[]
}

export class ScanService {
  private readonly candidates = new Map<string, LocalSkillCandidate>()

  constructor(
    private readonly catalog: CatalogService,
    private readonly logs: LogService
  ) {}

  async start(request: ScanRequest): Promise<LocalSkillCandidate[]> {
    const results = await runScanWorker(request)
    this.candidates.clear()
    for (const candidate of results) {
      this.candidates.set(candidate.id, candidate)
    }
    await this.logs.job('info', 'Local scan completed', { roots: request.roots, count: results.length })
    return results
  }

  async importCandidate(params: { candidateId: string; mode: 'copy' | 'symlink' }): Promise<JobRecord> {
    const candidate = this.candidates.get(params.candidateId)
    if (!candidate) throw new Error('Scan candidate not found. Run scan before importing.')
    await this.catalog.ingestMarkdownFile({
      sourceId: 'local-folder',
      sourcePath: candidate.path,
      trustLevel: candidate.risks.some((risk) => risk.level === 'high') ? 'unknown' : 'team',
      filePath: join(candidate.path, 'SKILL.md')
    })
    await this.logs.audit('Import local Skill candidate', candidate.path, '当前用户', { mode: params.mode })
    return timestampedJob('导入 Skill', candidate.name, `已以 ${params.mode} 模式导入 Catalog`)
  }
}

function runScanWorker(request: ScanRequest): Promise<LocalSkillCandidate[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(SCAN_WORKER_SOURCE, {
      eval: true,
      workerData: request
    })
    worker.once('message', (message: { ok: true; data: LocalSkillCandidate[] } | { ok: false; error: string }) => {
      if (message.ok) resolve(message.data)
      else reject(new Error(message.error))
    })
    worker.once('error', reject)
    worker.once('exit', (code) => {
      if (code !== 0) reject(new Error(`Scan worker exited with code ${code}`))
    })
  })
}

const SCAN_WORKER_SOURCE = `
const { parentPort, workerData } = require('node:worker_threads')
const { readFile, readdir, stat } = require('node:fs/promises')
const { createHash } = require('node:crypto')
const path = require('node:path')
const fg = require('fast-glob')

const defaultIgnore = ['**/.git/**', '**/node_modules/**', '**/dist/**', '**/target/**', '**/.venv/**']

async function main() {
  const roots = workerData.roots || []
  const patterns = roots.map((root) => path.join(root, '**/SKILL.md').replace(/\\\\/g, '/'))
  const entries = await fg(patterns, {
    onlyFiles: true,
    dot: true,
    unique: true,
    ignore: [...defaultIgnore, ...(workerData.ignore || [])]
  })
  const candidates = await Promise.all(entries.slice(0, 200).map(toCandidate))
  parentPort.postMessage({ ok: true, data: candidates })
}

async function toCandidate(skillFile) {
  const root = path.dirname(skillFile)
  const markdown = await readFile(skillFile, 'utf8').catch(() => '')
  const children = await readdir(root, { withFileTypes: true }).catch(() => [])
  const files = await fg('**/*', { cwd: root, onlyFiles: true, dot: true, ignore: ['**/.git/**', '**/node_modules/**'] }).catch(() => [])
  const name = heading(markdown) || path.basename(root)
  const version = versionValue(markdown)
  const risks = riskFindings(markdown, children, files, version)
  return {
    id: createHash('sha1').update(root).digest('hex').slice(0, 12),
    name,
    version,
    description: descriptionValue(markdown),
    tags: tagsValue(markdown),
    path: root,
    detectedPlatform: detectPlatform(root),
    fileCount: files.length,
    checksum: 'sha256:' + createHash('sha256').update(markdown + files.join('\\n')).digest('hex').slice(0, 16),
    risks,
    importable: !risks.some((risk) => risk.level === 'high')
  }
}

function riskFindings(markdown, children, files, version) {
  const findings = []
  if (children.some((entry) => entry.isDirectory() && entry.name.toLowerCase() === 'scripts')) {
    findings.push({ level: 'medium', message: '包含 scripts 目录，导入前建议人工审查。' })
  }
  if (files.some((file) => /(^|\\/)(.*\\.(exe|cmd|bat|ps1|sh|zsh|fish))$/i.test(file))) {
    findings.push({ level: 'high', message: '包含可执行文件，默认禁止自动导入。' })
  }
  if (!version) {
    findings.push({ level: 'medium', message: '未在 SKILL.md 中发现 version 字段。' })
  }
  const hiddenComments = (markdown.match(/<!--([\\s\\S]*?)-->/g) || []).join('\\n')
  if (hiddenComments.length > 1200) {
    findings.push({ level: 'medium', message: '包含大量隐藏注释，请检查隐藏 prompt。' })
  }
  const externalLinks = markdown.match(/https?:\\/\\//g) || []
  if (externalLinks.length > 8) {
    findings.push({ level: 'low', message: '外链数量较多，导入前建议确认来源。' })
  }
  return findings
}

function heading(markdown) {
  return markdown.match(/^#\\s+(.+)$/m)?.[1]?.trim()
}

function versionValue(markdown) {
  return markdown.match(/(^|\\n)version\\s*:\\s*["']?([^"'\\n]+)/i)?.[2]?.trim()
    || markdown.match(/metadata:\\s*[\\s\\S]*?version\\s*:\\s*["']?([^"'\\n]+)/i)?.[1]?.trim()
}

function descriptionValue(markdown) {
  return markdown.match(/(^|\\n)description\\s*:\\s*["']?([^"'\\n]+)/i)?.[2]?.trim()
    || '从本地目录扫描发现的 Skill。'
}

function tagsValue(markdown) {
  return Array.from(markdown.matchAll(/-\\s+([a-zA-Z0-9_-]+)/g)).slice(0, 4).map((match) => match[1])
}

function detectPlatform(root) {
  const normalized = root.replace(/\\\\/g, '/').toLowerCase()
  if (normalized.includes('.claude')) return 'Claude Code'
  if (normalized.includes('.codex') || normalized.includes('.agents')) return 'Codex'
  if (normalized.includes('.cursor')) return 'Cursor'
  if (normalized.includes('.gemini')) return 'Gemini CLI'
  return undefined
}

main().catch((error) => parentPort.postMessage({ ok: false, error: error.message }))
`
