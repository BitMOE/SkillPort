export interface CliCommand {
  name: string
  description: string
}

export const cliCommands: CliCommand[] = [
  { name: 'sync', description: 'Synchronize configured sources' },
  { name: 'sources list', description: 'List configured sources' },
  { name: 'scan --root <path>', description: 'Request local SKILL.md scan' },
  { name: 'install <skill>', description: 'Create an install request' },
  { name: 'rules scan <project>', description: 'Scan project rule targets' },
  { name: 'rules apply <package>', description: 'Apply a rule package' },
  { name: 'updates check', description: 'Check content updates' },
  { name: 'doctor', description: 'Validate local SkillPort runtime paths' }
]
