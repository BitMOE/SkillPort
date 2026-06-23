#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import YAML from 'yaml'

const userData = process.env.SKILLPORT_HOME || join(process.cwd(), '.skillport')
const configPath = join(userData, 'config.yaml')

const command = process.argv[2] || 'help'
const args = process.argv.slice(3)

const commands = {
  async help() {
    print([
      'SkillPort CLI',
      '',
      'Commands:',
      '  skillport doctor',
      '  skillport sync',
      '  skillport sources list',
      '  skillport config export <file>',
      '  skillport config import <file>',
      '  skillport scan --root <path>',
      '  skillport install <skill> --platform <key> --mode <copy|symlink>',
      '  skillport rules scan <project>',
      '  skillport rules apply <package> --project <path>',
      '  skillport updates check',
      '  skillport lockfile write <project>'
    ])
  },

  async doctor() {
    await ensureConfig()
    const checks = [
      { name: 'config', path: configPath, type: 'file' },
      { name: 'data directory', path: userData, type: 'dir' },
      { name: 'cache directory', path: join(userData, 'artifacts'), type: 'dir' },
      { name: 'backup directory', path: join(userData, 'backups'), type: 'dir' },
      { name: 'logs directory', path: join(userData, 'logs'), type: 'dir' }
    ]
    for (const check of checks) {
      await mkdir(check.type === 'file' ? dirname(check.path) : check.path, { recursive: true })
    }
    print(['SkillPort doctor', ...checks.map((check) => `  ${check.name}: ${check.path}`), '  status: ok'])
  },

  async sync() {
    print(['Queued source sync using desktop runtime services.', 'Run the desktop app for authenticated remote synchronization.'])
  },

  async sources() {
    if (args[0] !== 'list') return commands.help()
    const config = await loadConfig()
    const sources = config.sources || defaultSources()
    print(sources.map((source) => `${source.enabled === false ? 'off' : 'on '}  ${source.id}  ${source.kind}  ${source.url}`))
  },

  async config() {
    const action = args[0]
    const file = args[1]
    if (!['export', 'import'].includes(action) || !file) return commands.help()
    if (action === 'export') {
      await ensureConfig()
      await writeFile(resolve(file), await readFile(configPath, 'utf8'), 'utf8')
      print([`Exported config to ${resolve(file)}`])
      return
    }
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, await readFile(resolve(file), 'utf8'), 'utf8')
    print([`Imported config from ${resolve(file)}`])
  },

  async scan() {
    const root = valueAfter('--root') || '.'
    print([`Scan requested for ${resolve(root)}`, 'Use the desktop app for full Worker Thread scan results and import flow.'])
  },

  async install() {
    const skill = args[0]
    const platform = valueAfter('--platform') || 'codex'
    const mode = valueAfter('--mode') || 'copy'
    if (!skill) return commands.help()
    print([`Install plan requested`, `  skill: ${skill}`, `  platform: ${platform}`, `  mode: ${mode}`])
  },

  async rules() {
    const action = args[0]
    if (action === 'scan') {
      print([`Rule scan requested for ${resolve(args[1] || '.')}`])
      return
    }
    if (action === 'apply') {
      const pkg = args[1]
      const project = valueAfter('--project') || '.'
      print([`Rule apply requested`, `  package: ${pkg}`, `  project: ${resolve(project)}`])
      return
    }
    return commands.help()
  },

  async updates() {
    if (args[0] !== 'check') return commands.help()
    print(['Content update check requested.', 'Desktop runtime applies trust, major-version, and risk policies.'])
  },

  async lockfile() {
    if (args[0] !== 'write') return commands.help()
    const project = resolve(args[1] || '.')
    const lockPath = join(project, '.skillport.lock.yaml')
    const lock = {
      version: 1,
      generatedAt: new Date().toISOString(),
      skills: [],
      rules: []
    }
    await writeFile(lockPath, YAML.stringify(lock), 'utf8')
    print([`Wrote ${lockPath}`])
  }
}

await (commands[command] || commands.help)()

async function ensureConfig() {
  try {
    await access(configPath)
  } catch {
    await mkdir(dirname(configPath), { recursive: true })
    await writeFile(configPath, YAML.stringify(defaultConfig()), 'utf8')
  }
}

async function loadConfig() {
  await ensureConfig()
  return YAML.parse(await readFile(configPath, 'utf8')) || {}
}

function defaultConfig() {
  return {
    app: { language: 'zh-CN', theme: 'system', offlineMode: false, autoStartLocalService: true },
    sources: defaultSources(),
    updates: {
      app: { autoCheck: true, autoDownload: false },
      content: {
        autoCheck: true,
        autoApplyTrustedSources: false,
        allowMajorVersion: false,
        blockScriptSkills: true,
        schedule: 'startup'
      }
    }
  }
}

function defaultSources() {
  return [
    { id: 'skills-sh', name: 'skills.sh 官方源', kind: 'skills-sh', url: 'https://skills.sh', enabled: true },
    { id: 'local-folder', name: 'Local Folder Source', kind: 'local-dir', url: '~/skillport/sources', enabled: true }
  ]
}

function valueAfter(flag) {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}

function print(lines) {
  console.log(lines.join('\n'))
}
