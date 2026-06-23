import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import {
  AlertTriangle,
  Archive,
  Bell,
  Box,
  Boxes,
  Check,
  ChevronDown,
  ClipboardList,
  Cloud,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileCode2,
  Folder,
  Gauge,
  GitBranch,
  Github,
  Globe2,
  Grid2X2,
  HardDrive,
  History,
  Import,
  KeyRound,
  Languages,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Monitor,
  Moon,
  MoreHorizontal,
  PackageCheck,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TerminalSquare,
  Upload,
  Wrench,
  X
} from 'lucide-react'
import type {
  AuditRecord,
  CatalogItem,
  DashboardSummary,
  JobRecord,
  LocalSkillCandidate,
  PlatformConfig,
  RulePackage,
  SourceConfig
} from '../../shared/types'

type ViewKey = 'dashboard' | 'store' | 'installed' | 'scan' | 'rules' | 'projects' | 'sources' | 'platforms' | 'jobs' | 'settings'

const navItems: Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'store', label: 'Skill Store', icon: Grid2X2 },
  { key: 'installed', label: '已安装 Skills', icon: PackageCheck },
  { key: 'scan', label: '本地扫描', icon: ClipboardList },
  { key: 'rules', label: 'Rule Center', icon: Wrench },
  { key: 'projects', label: 'Projects', icon: Folder },
  { key: 'sources', label: 'Sources', icon: Cloud },
  { key: 'platforms', label: 'Platform Settings', icon: Settings },
  { key: 'jobs', label: 'Jobs & Audit', icon: ListChecks },
  { key: 'settings', label: 'Settings', icon: SlidersHorizontal }
]

const platformIconMap: Record<string, typeof Box> = {
  'claude-code': Sparkles,
  cursor: Boxes,
  windsurf: TerminalSquare,
  codex: Code2,
  'gemini-cli': Sparkles,
  cline: Monitor,
  kiro: ShieldCheck,
  'kilo-code': ShieldCheck,
  qoder: GitBranch,
  qoderwork: GitBranch,
  codebuddy: Code2,
  trae: TerminalSquare,
  'trae-cn': TerminalSquare,
  opencode: Archive,
  generic: Box
}

function App(): JSX.Element {
  const [activeView, setActiveView] = useState<ViewKey>('dashboard')
  const [query, setQuery] = useState('')
  const [summary, setSummary] = useState<DashboardSummary>()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [sources, setSources] = useState<SourceConfig[]>([])
  const [platforms, setPlatforms] = useState<PlatformConfig[]>([])
  const [rules, setRules] = useState<RulePackage[]>([])
  const [scanResults, setScanResults] = useState<LocalSkillCandidate[]>([])
  const [jobs, setJobs] = useState<JobRecord[]>([])
  const [audit, setAudit] = useState<AuditRecord[]>([])
  const [selectedSkillId, setSelectedSkillId] = useState('pr-review')
  const [selectedPlatformKey, setSelectedPlatformKey] = useState('claude-code')
  const [selectedRuleId, setSelectedRuleId] = useState('frontend-nextjs')
  const [selectedSourceId, setSelectedSourceId] = useState('skills-sh')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void refreshAll()
  }, [])

  async function refreshAll(): Promise<void> {
    const [summaryResult, catalogResult, sourcesResult, platformsResult, rulesResult, jobsResult, auditResult] = await Promise.all([
      window.skillport.dashboard.summary(),
      window.skillport.catalog.search({}),
      window.skillport.sources.list(),
      window.skillport.platforms.list(),
      window.skillport.rules.list(),
      window.skillport.jobs.list(),
      window.skillport.audit.list()
    ])
    if (summaryResult.ok) setSummary(summaryResult.data)
    if (catalogResult.ok) setCatalog(catalogResult.data)
    if (sourcesResult.ok) setSources(sourcesResult.data)
    if (platformsResult.ok) setPlatforms(platformsResult.data)
    if (rulesResult.ok) setRules(rulesResult.data)
    if (jobsResult.ok) setJobs(jobsResult.data)
    if (auditResult.ok) setAudit(auditResult.data)
  }

  async function runScan(): Promise<void> {
    setBusy(true)
    const result = await window.skillport.scan.start({
      roots: ['.'],
      platformKeys: ['claude-code', 'codex', 'cursor', 'gemini-cli'],
      ignore: ['**/node_modules/**', '**/dist/**']
    })
    if (result.ok) setScanResults(result.data)
    setBusy(false)
  }

  async function quickSync(): Promise<void> {
    setBusy(true)
    const result = await window.skillport.sources.syncAll()
    if (result.ok) setJobs((current) => [result.data, ...current])
    setBusy(false)
  }

  const selectedSkill = catalog.find((item) => item.id === selectedSkillId) ?? catalog[0]
  const selectedPlatform = platforms.find((platform) => platform.key === selectedPlatformKey) ?? platforms[0]
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) ?? rules[0]
  const selectedSource = sources.find((source) => source.id === selectedSourceId) ?? sources[0]

  const page = useMemo(() => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard summary={summary} jobs={jobs} audit={audit} platforms={platforms} />
      case 'store':
        return <SkillStore catalog={catalog} selectedSkill={selectedSkill} onSelectSkill={setSelectedSkillId} platforms={platforms} />
      case 'installed':
        return <InstalledSkills catalog={catalog} selectedSkill={selectedSkill} onSelectSkill={setSelectedSkillId} platforms={platforms} />
      case 'scan':
        return <LocalScan results={scanResults} busy={busy} onRunScan={runScan} platforms={platforms} />
      case 'rules':
        return <RuleCenter rules={rules} selectedRule={selectedRule} onSelectRule={setSelectedRuleId} />
      case 'sources':
        return <SourcesPage sources={sources} selectedSource={selectedSource} onSelectSource={setSelectedSourceId} />
      case 'platforms':
        return <PlatformSettings platforms={platforms} selectedPlatform={selectedPlatform} onSelectPlatform={setSelectedPlatformKey} />
      case 'jobs':
        return <JobsAudit jobs={jobs} audit={audit} />
      case 'projects':
        return <Projects platforms={platforms} />
      case 'settings':
        return <SettingsPage />
    }
  }, [activeView, audit, busy, catalog, jobs, platforms, rules, scanResults, selectedPlatform, selectedRule, selectedSkill, selectedSource, summary])

  return (
    <div className="shell">
      <Sidebar activeView={activeView} onChange={setActiveView} />
      <div className="main">
        <Topbar query={query} onQuery={setQuery} onSync={quickSync} busy={busy} />
        <main className="content">{page}</main>
      </div>
    </div>
  )
}

function Sidebar({ activeView, onChange }: { activeView: ViewKey; onChange: (view: ViewKey) => void }): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">SP</div>
        <div>
          <strong>SkillPort</strong>
          <span>v0.1.0</span>
        </div>
      </div>
      <nav className="nav">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.key} className={activeView === item.key ? 'active' : ''} onClick={() => onChange(item.key)}>
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="sidebar-status">
        <div className="mini-card">
          <HardDrive size={18} />
          <div>
            <b>缓存空间</b>
            <span>12.4 GB / 50 GB</span>
          </div>
          <div className="meter">
            <i style={{ width: '24.8%' }} />
          </div>
        </div>
        <div className="mini-card">
          <span className="dot ok" />
          <div>
            <b>本地服务运行中</b>
            <span>数据目录 ~/skillport</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function Topbar({ query, onQuery, onSync, busy }: { query: string; onQuery: (value: string) => void; onSync: () => void; busy: boolean }): JSX.Element {
  return (
    <header className="topbar">
      <button className="workspace">
        <UsersIcon />
        <span>Acme 团队工作区</span>
        <ChevronDown size={16} />
      </button>
      <label className="global-search">
        <Search size={18} />
        <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="搜索 Skills、Rules、来源或项目..." />
        <kbd>⌘K</kbd>
      </label>
      <button className="button" onClick={onSync}>
        {busy ? <Loader2 size={16} className="spin" /> : <RefreshCcw size={16} />}
        立即同步
      </button>
      <button className="button ghost">
        <Languages size={16} />
        简 / 繁 / EN
      </button>
      <button className="icon-button" title="浅色主题">
        <Sun size={17} />
      </button>
      <button className="icon-button active-toggle" title="深色跟随系统">
        <Moon size={17} />
      </button>
      <button className="icon-button notification" title="通知">
        <Bell size={17} />
        <span>3</span>
      </button>
      <div className="avatar">QC</div>
    </header>
  )
}

function Dashboard({
  summary,
  jobs,
  audit,
  platforms
}: {
  summary?: DashboardSummary
  jobs: JobRecord[]
  audit: AuditRecord[]
  platforms: PlatformConfig[]
}): JSX.Element {
  return (
    <section>
      <PageTitle title="仪表盘" description="本地优先的 Skills & Rules 管理中心，统一管理与分发到各 AI 编码平台。" />
      <div className="kpi-grid four">
        <Kpi icon={Box} label="已安装 Skills" value={summary?.installedSkills ?? 128} delta="12 (10.3%)" tone="blue" trend />
        <Kpi icon={Upload} label="可更新 Skills" value={summary?.updateableSkills ?? 15} delta="3 (25.0%)" tone="purple" />
        <Kpi icon={Monitor} label="已启用平台" value={`${summary?.enabledPlatforms ?? 8} / ${summary?.totalPlatforms ?? 15}`} delta="稳定" tone="green" trend />
        <Kpi icon={RefreshCcw} label="最近同步状态" value="成功" delta="5 分钟前" tone="orange" />
      </div>
      <div className="status-strip">
        <StatusPill icon={Globe2} title="在线状态" value="在线" tone="ok" />
        <StatusPill icon={Github} title="GitHub Token" value="有效，剩余 4632 / 5000" tone="ok" />
        <StatusPill icon={GitBranch} title="GitLab Token" value="有效，18 天后过期" tone="ok" />
        <StatusPill icon={Database} title="缓存空间" value="12.4 GB / 50 GB" tone="info" />
      </div>
      <div className="dashboard-grid">
        <Panel title="最近任务" action="查看全部">
          <TaskTable jobs={jobs} />
        </Panel>
        <Panel title="平台分发概览" action="查看详情">
          <div className="platform-grid">
            {platforms.slice(0, 8).map((platform) => (
              <PlatformTile key={platform.key} platform={platform} />
            ))}
          </div>
          <Legend />
        </Panel>
        <Panel title="待处理事项">
          <ActionList />
        </Panel>
        <Panel title="最近活动（审计）" action="查看全部">
          <AuditList audit={audit} />
        </Panel>
      </div>
    </section>
  )
}

function SkillStore({
  catalog,
  selectedSkill,
  onSelectSkill,
  platforms
}: {
  catalog: CatalogItem[]
  selectedSkill?: CatalogItem
  onSelectSkill: (id: string) => void
  platforms: PlatformConfig[]
}): JSX.Element {
  return (
    <section>
      <PageTitle title="Skill 商店" description="浏览、筛选、预览并从多个来源安装 Skill，扩展团队能力。" />
      <FilterBar labels={['来源', '标签', '平台兼容', '状态', '信任等级']} />
      <div className="kpi-grid compact">
        <Kpi icon={Box} label="商店部数量" value={catalog.length + 2} delta="所有来源" tone="blue" />
        <Kpi icon={Download} label="已同步 Skill 数量" value="128" delta="所有来源" tone="green" />
        <Kpi icon={Upload} label="可更新" value="15" delta="可更新可用" tone="orange" />
        <Kpi icon={AlertTriangle} label="失败源数" value="1" delta="最近同步" tone="red" />
      </div>
      <div className="split-layout">
        <Panel title={`共 ${catalog.length + 122} 个 Skill`} toolbar={<SearchBox placeholder="搜索 Skill 名称或描述..." />}>
          <div className="skill-card-grid">
            {catalog.map((skill) => (
              <SkillCard key={skill.id} skill={skill} selected={selectedSkill?.id === skill.id} onClick={() => onSelectSkill(skill.id)} />
            ))}
            <button className="add-card">
              <Plus size={22} />
              查看更多 Skill
              <span>访问更多来源或添加自定义源</span>
            </button>
          </div>
        </Panel>
        <SkillDetail skill={selectedSkill} platforms={platforms} mode="store" />
      </div>
    </section>
  )
}

function InstalledSkills({
  catalog,
  selectedSkill,
  onSelectSkill,
  platforms
}: {
  catalog: CatalogItem[]
  selectedSkill?: CatalogItem
  onSelectSkill: (id: string) => void
  platforms: PlatformConfig[]
}): JSX.Element {
  const installed = catalog.filter((item) => item.installed)
  return (
    <section>
      <PageTitle title="已安装 Skills" description="查看与管理已在各平台与项目中安装的 Skills。" />
      <div className="kpi-grid six">
        <Kpi icon={ClipboardList} label="总安装数" value="128" delta="12 (10.3%)" tone="blue" />
        <Kpi icon={Monitor} label="平台数" value="6" delta="0 (0%)" tone="purple" />
        <Kpi icon={Folder} label="项目级安装" value="74" delta="57.8%" tone="orange" />
        <Kpi icon={ShieldCheck} label="用户级安装" value="54" delta="42.2%" tone="green" />
        <Kpi icon={AlertTriangle} label="失效 symlink" value="5" delta="3.9%" tone="red" />
        <Kpi icon={RefreshCcw} label="可更新" value="15" delta="11.7%" tone="cyan" />
      </div>
      <div className="table-layout">
        <Panel title="按 Skill" toolbar={<Toolbar />}>
          <DataTable>
            <thead>
              <tr>
                <th>Skill 名称</th>
                <th>版本</th>
                <th>来源</th>
                <th>已安装平台</th>
                <th>Scope</th>
                <th>模式</th>
                <th>状态</th>
                <th>更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {[...installed, ...catalog].slice(0, 8).map((skill) => (
                <tr key={skill.id} className={selectedSkill?.id === skill.id ? 'selected-row' : ''} onClick={() => onSelectSkill(skill.id)}>
                  <td>
                    <div className="name-cell">
                      <StarIcon active={skill.id === 'context7-docs'} />
                      <PlatformLogo label={skill.name.slice(0, 2)} />
                      <div>
                        <b>{skill.name}</b>
                        <span>{skill.tags.slice(0, 2).join(' · ')}</span>
                      </div>
                    </div>
                  </td>
                  <td>{skill.version}</td>
                  <td>{sourceLabel(skill.sourceId)}</td>
                  <td>
                    <PlatformBadges platforms={skill.platforms.slice(0, 4)} />
                  </td>
                  <td>{skill.installed ? '用户级' : '项目级'}</td>
                  <td>{skill.id.length % 2 ? 'symlink' : '复制'}</td>
                  <td>
                    <Badge tone={skill.riskCount ? 'red' : 'green'}>{skill.riskCount ? '失败链接' : '健康'}</Badge>
                  </td>
                  <td>{skill.updateVersion ? <Badge tone="orange">可更新 {skill.updateVersion}</Badge> : '—'}</td>
                  <td>
                    <MoreHorizontal size={18} />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Panel>
        <SkillDetail skill={selectedSkill} platforms={platforms} mode="installed" />
      </div>
    </section>
  )
}

function LocalScan({
  results,
  busy,
  onRunScan,
  platforms
}: {
  results: LocalSkillCandidate[]
  busy: boolean
  onRunScan: () => void
  platforms: PlatformConfig[]
}): JSX.Element {
  const rows = results.length > 0 ? results : []
  const selected = rows[0]
  return (
    <section>
      <PageTitle title="本地扫描" description="自动发现本地的 SKILL.md 文件，无需复制粘贴，一键导入并分发到多平台。" />
      <div className="scan-config">
        <div>
          <b>扫描配置</b>
          <div className="chips">
            {['~/.claude/skills', '~/.agents/skills', '~/.gemini/skills', '~/work/tools/skills'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div>
          <b>忽略模式</b>
          <div className="chips">
            {['node_modules', '.git', 'dist', 'build', '.venv', '*.log'].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div>
          <b>平台快速扫描</b>
          <PlatformBadges platforms={platforms.slice(0, 5).map((platform) => platform.key)} />
        </div>
        <button className="primary large" onClick={onRunScan}>
          {busy ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
          开始扫描
        </button>
      </div>
      <div className="kpi-grid four">
        <Kpi icon={Folder} label="已扫描目录数" value={rows.length ? '4' : '0'} delta="较上次 +0" tone="blue" />
        <Kpi icon={FileCode2} label="发现 Skill 候选数" value={rows.length || 12} delta="较上次 +3" tone="purple" />
        <Kpi icon={Database} label="已识别平台数" value="5" delta="较上次 +0" tone="green" />
        <Kpi icon={AlertTriangle} label="风险项数" value={selected?.risks.length ?? 2} delta="较上次 +1" tone="orange" />
      </div>
      <div className="scan-layout">
        <Panel title={`扫描结果（${rows.length || 12}）`} toolbar={<Toolbar />}>
          <div className="scan-list">
            {(rows.length ? rows : fallbackScan()).map((item, index) => (
              <div key={item.id} className={index === 0 ? 'scan-row selected-row' : 'scan-row'}>
                <input type="checkbox" defaultChecked={index % 2 === 0} />
                <TerminalSquare size={20} />
                <div>
                  <b>{item.name}</b>
                  <span>{item.path}</span>
                </div>
                <TagGroup tags={item.tags} />
                <span>{item.fileCount} files</span>
                <span>{item.detectedPlatform ?? 'Generic'}</span>
                <ShieldCheck size={17} className={item.risks.length ? 'warn-text' : 'ok-text'} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={selected?.name ?? 'terminal-master'} action="可导入">
          <Tabs labels={['概览', 'SKILL.md', '文件列表', '导入选项']} active={0} />
          <div className="candidate-detail">
            <div>
              <h3>{selected?.description ?? '提供安全、智能的终端命令执行与输出解析能力，支持命令建议。'}</h3>
              <TagGroup tags={selected?.tags ?? ['Shell', 'CLI', 'Terminal', 'Utilities']} />
            </div>
            <div className="stats-box">
              <b>文件统计</b>
              <p>SKILL.md 1</p>
              <p>其他文件 {selected?.fileCount ?? 7}</p>
            </div>
          </div>
          <Notice tone="warning" title="检测到可执行脚本文件" text="scripts/run.sh、scripts/install.sh，建议导入前进行安全评估。" />
          <Notice tone="danger" title="未在 SKILL.md 中发现 version 字段" text="建议补充 version 字段以便更新检测与回滚。" />
          <div className="form-grid two">
            <RadioGroup title="导入模式" options={['Copy（复制）', 'Symlink（符号链接）', '仅登记（不复制）']} />
            <CheckboxGroup title="分发到平台" options={['Claude Code', 'Codex', 'Cursor', 'Gemini CLI', 'Qoder']} />
          </div>
          <div className="panel-actions">
            <button className="button">取消</button>
            <button className="primary">导入并分发</button>
          </div>
        </Panel>
      </div>
    </section>
  )
}

function RuleCenter({ rules, selectedRule, onSelectRule }: { rules: RulePackage[]; selectedRule?: RulePackage; onSelectRule: (id: string) => void }): JSX.Element {
  return (
    <section>
      <PageTitle title="Rule Center" description="集中管理项目规则、AGENTS.md、CLAUDE.md、.cursor/rules 及 Rule 包，实现统一分发与版本治理。" />
      <div className="kpi-grid four">
        <Kpi icon={Box} label="Rule 包数量" value="28" delta="所有来源规则包总数" tone="blue" />
        <Kpi icon={Folder} label="已扫描项目数" value="9" delta="已关联并扫描的项目" tone="green" />
        <Kpi icon={Upload} label="可更新 Rule 包" value="5" delta="存在新版本可更新" tone="purple" />
        <Kpi icon={AlertTriangle} label="冲突数" value="3" delta="需要处理的规则冲突" tone="orange" />
      </div>
      <div className="rule-layout">
        <Panel title="Rule 包" toolbar={<Toolbar />}>
          <div className="rule-list">
            {rules.map((rule) => (
              <button key={rule.id} className={selectedRule?.id === rule.id ? 'rule-item selected-row' : 'rule-item'} onClick={() => onSelectRule(rule.id)}>
                <PlatformLogo label={rule.name.slice(0, 1).toUpperCase()} />
                <div>
                  <b>{rule.name}</b>
                  <span>v{rule.version} · {rule.appliesTo}</span>
                </div>
                <Badge tone={rule.status === 'applied' ? 'green' : rule.status === 'updateable' ? 'orange' : 'gray'}>
                  {rule.status === 'applied' ? '已应用' : rule.status === 'updateable' ? '可更新' : '未应用'}
                </Badge>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={selectedRule?.name ?? 'frontend-nextjs'} toolbar={<RuleActions />}>
          <div className="rule-detail">
            <div className="detail-head">
              <PlatformLogo label={selectedRule?.name.slice(0, 1).toUpperCase() ?? 'N'} />
              <div>
                <h2>{selectedRule?.name}</h2>
                <p>v{selectedRule?.version} · 创建于 2025-05-20 · 所有者 acme-org/team-platform</p>
              </div>
            </div>
            <TagGroup tags={selectedRule?.tags ?? []} />
            <dl className="kv">
              <dt>applies_to</dt>
              <dd>{selectedRule?.appliesTo}</dd>
              <dt>规则项总数</dt>
              <dd>{selectedRule?.ruleCount}，启用 {selectedRule?.enabledRules}</dd>
            </dl>
            <DataTable>
              <thead>
                <tr>
                  <th>规则项</th>
                  <th>类型</th>
                  <th>描述</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {['nextjs-dark-mode', 'component-structure', 'data-fetching'].map((name) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>最佳实践</td>
                    <td>推荐的工程规则与约束</td>
                    <td>
                      <Badge tone="green">已启用</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <DiffPreview />
          </div>
        </Panel>
      </div>
    </section>
  )
}

function SourcesPage({
  sources,
  selectedSource,
  onSelectSource
}: {
  sources: SourceConfig[]
  selectedSource?: SourceConfig
  onSelectSource: (id: string) => void
}): JSX.Element {
  return (
    <section>
      <div className="page-header">
        <PageTitle title="商店源 / Sources" description="管理 GitHub、GitLab、自托管 GitLab、skills.sh 和本地源，用于同步 Skills 与 Rules。" />
        <div className="header-actions">
          <button className="primary">
            <Plus size={16} />
            添加源
          </button>
          <button className="button">
            <RefreshCcw size={16} />
            全部同步
          </button>
          <button className="button">
            <Import size={16} />
            导入配置
          </button>
          <button className="button">
            <ExternalLink size={16} />
            导出配置
          </button>
        </div>
      </div>
      <div className="kpi-grid four">
        <Kpi icon={Database} label="已启用源" value="5 / 7" delta="已启用 5 个源" tone="blue" />
        <Kpi icon={Check} label="上次同步成功数" value="213" delta="成功同步 Skills" tone="green" />
        <Kpi icon={AlertTriangle} label="失败源数" value="1" delta="存在失败的源" tone="red" />
        <Kpi icon={KeyRound} label="Token 状态" value="3 正常 / 2 警告" delta="点击查看详情" tone="purple" />
      </div>
      <div className="sources-layout">
        <Panel title="源列表">
          <div className="source-list">
            {sources.map((source) => (
              <button key={source.id} className={selectedSource?.id === source.id ? 'source-item selected-row' : 'source-item'} onClick={() => onSelectSource(source.id)}>
                <SourceIcon source={source} />
                <div>
                  <b>{source.name}</b>
                  <span>{source.url}</span>
                </div>
                <Badge tone={source.status === 'success' ? 'green' : source.status === 'warning' ? 'orange' : 'red'}>
                  {source.status === 'success' ? '同步成功' : source.status === 'warning' ? '受限' : '鉴权失败'}
                </Badge>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={`源配置：${selectedSource?.name ?? 'skills.sh 官方源'}`} action="默认源">
          <Tabs labels={['基本配置', 'Token & 连接', '同步设置', '高级选项', 'YAML 预览']} active={0} />
          <div className="source-editor">
            <FormPreview source={selectedSource} />
            <div>
              <CredentialBox title="GitHub Token" state="正常" text="已配置，剩余 4,632 / 5,000 (92.6%)" />
              <CredentialBox title="GitLab Token（可选）" state="警告" text="未配置 Token，将受限于未登录访问。" />
              <Notice tone="info" title="自托管 GitLab 提示" text="若使用自托管 GitLab，请在 API Base 中填写正确地址，并确保迁移受信任。" />
              <Panel title="同步日志（最近 10 条）" compact>
                <DataTable>
                  <tbody>
                    {['成功同步 47 个 Skills', '成功同步 45 个 Rules', '鉴权失败：Invalid credentials', '分支不存在：feature/abc'].map((row, index) => (
                      <tr key={row}>
                        <td>2025-05-27 0{index + 6}:23:11</td>
                        <td>
                          <Badge tone={index < 2 ? 'green' : 'red'}>{index < 2 ? '成功' : '失败'}</Badge>
                        </td>
                        <td>{row}</td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </Panel>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  )
}

function PlatformSettings({
  platforms,
  selectedPlatform,
  onSelectPlatform
}: {
  platforms: PlatformConfig[]
  selectedPlatform?: PlatformConfig
  onSelectPlatform: (key: string) => void
}): JSX.Element {
  return (
    <section>
      <PageTitle title="平台设置" description="配置各平台的 Skill 目录、Rule 目标、安装模式与扫描行为。" />
      <div className="kpi-grid four">
        <Kpi icon={Box} label="已配置平台数" value="15 / 16" delta="当前可用平台" tone="blue" />
        <Kpi icon={Folder} label="使用默认目录数" value="10" delta="官方默认路径" tone="green" />
        <Kpi icon={Archive} label="自定义目录数" value="5" delta="团队覆盖配置" tone="orange" />
        <Kpi icon={Search} label="参与自动扫描的平台数" value="12" delta="扫描已启用" tone="purple" />
      </div>
      <div className="settings-layout">
        <Panel title="平台列表" toolbar={<SearchBox placeholder="搜索平台..." />}>
          <div className="platform-list">
            {platforms.map((platform) => (
              <button key={platform.key} className={selectedPlatform?.key === platform.key ? 'platform-row selected-row' : 'platform-row'} onClick={() => onSelectPlatform(platform.key)}>
                <PlatformSymbol platform={platform} />
                <b>{platform.displayName}</b>
                <span className={platform.health === 'healthy' ? 'ok-text' : platform.health === 'warning' ? 'warn-text' : 'muted'}>
                  {platform.health === 'healthy' ? '健康' : platform.health === 'warning' ? '警告' : '禁用'}
                </span>
                <span className={platform.enabled ? 'switch on' : 'switch'} />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={selectedPlatform?.displayName ?? 'Claude Code'} toolbar={<button className="button">重置默认</button>}>
          <Tabs labels={['基本设置', 'Skill 目标目录', 'Rule 目标', '安装行为', '扫描行为', '兼容性说明']} active={0} />
          <div className="platform-editor">
            <div className="settings-form">
              <h3>基本设置</h3>
              <LabeledInput label="平台标识" value={selectedPlatform?.key ?? ''} />
              <LabeledInput label="显示名称" value={selectedPlatform?.displayName ?? ''} />
              <div className="field-row">
                <label>平台状态</label>
                <select defaultValue={selectedPlatform?.enabled ? 'enabled' : 'disabled'}>
                  <option value="enabled">启用中</option>
                  <option value="disabled">禁用</option>
                </select>
              </div>
              <h3>安装行为</h3>
              <RadioInline options={['Copy（复制）', 'Symlink（符号链接）']} active={selectedPlatform?.installMode === 'copy' ? 0 : 1} />
              <ToggleRow label="是否允许 symlink" checked={selectedPlatform?.allowSymlink ?? true} />
              <LabeledInput label="冲突处理策略" value="覆盖（覆盖已有文件）" />
              <h3>扫描行为</h3>
              <ToggleRow label="是否参与自动扫描" checked={selectedPlatform?.scanEnabled ?? true} />
              <LabeledInput label="扫描优先级" value="中（默认）" />
            </div>
            <div className="side-stack">
              <Panel title="安装目标映射预览" compact>
                <DataTable>
                  <tbody>
                    <tr>
                      <td>用户级 Skill</td>
                      <td>{selectedPlatform?.installMode}</td>
                      <td>{selectedPlatform?.userSkillDir}</td>
                    </tr>
                    <tr>
                      <td>项目级 Skill</td>
                      <td>symlink</td>
                      <td>{selectedPlatform?.projectSkillDir}</td>
                    </tr>
                    <tr>
                      <td>Rule 文件</td>
                      <td>copy</td>
                      <td>{selectedPlatform?.ruleTargets.join(', ')}</td>
                    </tr>
                  </tbody>
                </DataTable>
              </Panel>
              <Panel title="兼容性说明" compact>
                <ul className="check-list">
                  <li>官方默认目录可用</li>
                  <li>支持用户级、项目级安装</li>
                  <li>支持 Copy 与 Symlink 模式</li>
                  <li>Windows 不支持时自动回退到 Junction 或 Copy</li>
                </ul>
              </Panel>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  )
}

function JobsAudit({ jobs, audit }: { jobs: JobRecord[]; audit: AuditRecord[] }): JSX.Element {
  return (
    <section>
      <PageTitle title="Jobs & Audit" description="查看后台任务、实时日志、审计记录、失败重试和历史清理。" />
      <div className="dashboard-grid equal">
        <Panel title="后台任务" action="清理历史">
          <TaskTable jobs={jobs} />
        </Panel>
        <Panel title="审计日志" action="导出审计日志">
          <AuditList audit={audit} />
        </Panel>
      </div>
    </section>
  )
}

function Projects({ platforms }: { platforms: PlatformConfig[] }): JSX.Element {
  return (
    <section>
      <PageTitle title="Projects" description="管理项目根目录、项目级 Skills、Rules、lockfile 与分发策略。" />
      <div className="project-grid">
        {['E:/Projects/WebConsole', 'E:/Projects/PolarionTools', 'E:/Projects/AgentRules'].map((project, index) => (
          <Panel key={project} title={project} action={index === 0 ? '当前项目' : '打开'}>
            <div className="project-card-content">
              <Folder size={32} />
              <div>
                <b>{18 - index * 4} Skills</b>
                <span>{7 - index} Rule packages · lockfile 已同步</span>
              </div>
            </div>
            <PlatformBadges platforms={platforms.slice(index, index + 5).map((platform) => platform.key)} />
          </Panel>
        ))}
      </div>
    </section>
  )
}

function SettingsPage(): JSX.Element {
  return (
    <section>
      <PageTitle title="Settings" description="配置语言、主题、离线模式、缓存、安全存储、自动更新与企业策略。" />
      <div className="settings-page-grid">
        <Panel title="应用偏好">
          <ToggleRow label="离线模式" checked={false} />
          <ToggleRow label="启动时自动同步内容" checked />
          <ToggleRow label="企业环境禁用 App 自动更新" checked={false} />
          <RadioGroup title="语言" options={['简体中文', '繁體中文', 'English']} />
        </Panel>
        <Panel title="安全与缓存">
          <StatusPill icon={KeyRound} title="Token 加密" value="系统安全存储" tone="ok" />
          <StatusPill icon={Database} title="本地数据库" value="userData/skillport" tone="info" />
          <StatusPill icon={HardDrive} title="缓存目录" value="可写，12.4 GB 已使用" tone="info" />
        </Panel>
      </div>
    </section>
  )
}

function PageTitle({ title, description }: { title: string; description: string }): JSX.Element {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )
}

function Panel({
  title,
  action,
  toolbar,
  compact,
  children
}: {
  title: string
  action?: string
  toolbar?: JSX.Element
  compact?: boolean
  children: React.ReactNode
}): JSX.Element {
  return (
    <section className={compact ? 'panel compact-panel' : 'panel'}>
      <div className="panel-header">
        <h2>{title}</h2>
        <div>{toolbar ?? (action ? <button className="text-button">{action}</button> : null)}</div>
      </div>
      {children}
    </section>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  tone,
  trend
}: {
  icon: typeof Box
  label: string
  value: string | number
  delta: string
  tone: string
  trend?: boolean
}): JSX.Element {
  return (
    <div className="kpi-card">
      <div className={`icon-tile ${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{delta}</small>
      </div>
      {trend && <div className="sparkline" />}
    </div>
  )
}

function SkillDetail({ skill, platforms, mode }: { skill?: CatalogItem; platforms: PlatformConfig[]; mode: 'store' | 'installed' }): JSX.Element {
  if (!skill) return <Panel title="Skill 详情">暂无数据</Panel>
  return (
    <Panel title={skill.name} toolbar={<DetailActions installed={skill.installed} mode={mode} />}>
      <div className="detail-subtitle">{skill.description}</div>
      <TagGroup tags={skill.tags} />
      <dl className="kv">
        <dt>名称</dt>
        <dd>{skill.name}</dd>
        <dt>版本</dt>
        <dd>
          {skill.version} {skill.updateVersion && <Badge tone="orange">可更新 {skill.updateVersion}</Badge>}
        </dd>
        <dt>来源</dt>
        <dd>{sourceLabel(skill.sourceId)}</dd>
        <dt>信任等级</dt>
        <dd>
          <Badge tone={skill.trustLevel === 'official' ? 'blue' : skill.trustLevel === 'team' ? 'green' : 'gray'}>{trustLabel(skill.trustLevel)}</Badge>
        </dd>
        <dt>Checksum</dt>
        <dd className="mono">{skill.checksum.slice(0, 28)}...</dd>
      </dl>
      <Tabs labels={['概览', 'SKILL.md 预览', '文件列表', `风险提示（${skill.riskCount}）`, '版本历史']} active={0} />
      <div className="markdown-preview">
        <h3># {skill.name}</h3>
        <p>{skill.description}</p>
        <h3>功能特性</h3>
        <ul>
          <li>代码风格与一致性检查</li>
          <li>潜在问题与安全风险检测</li>
          <li>生成可操作的评审建议</li>
        </ul>
      </div>
      {skill.riskCount > 0 && (
        <div className="notice-stack">
          <Notice tone="warning" title="包含 scripts/ 目录" text="脚本可能在运行时执行，请在受信任环境下使用。" />
          <Notice tone="warning" title="缺少 version 字段" text="无法参与 SemVer 自动升级。" />
        </div>
      )}
      <div className="install-box">
        <b>安装到平台</b>
        <div className="platform-pick-grid">
          {platforms.slice(0, 6).map((platform) => (
            <button key={platform.key} className={skill.platforms.includes(platform.key) ? 'picked' : ''}>
              <PlatformSymbol platform={platform} />
              {platform.displayName}
            </button>
          ))}
        </div>
      </div>
      <div className="segmented">
        <button className="active">Copy</button>
        <button>Symlink</button>
      </div>
      <button className="primary full">安装到 {Math.min(skill.platforms.length, 6)} 个平台</button>
    </Panel>
  )
}

function TaskTable({ jobs }: { jobs: JobRecord[] }): JSX.Element {
  return (
    <DataTable>
      <thead>
        <tr>
          <th>任务类型</th>
          <th>目标/描述</th>
          <th>状态</th>
          <th>触发者</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id}>
            <td>{job.type}</td>
            <td>{job.target}</td>
            <td>
              <Badge tone={job.status === 'success' ? 'green' : job.status === 'failed' ? 'red' : 'orange'}>
                {job.status === 'success' ? '成功' : job.status === 'failed' ? '失败' : '部分成功'}
              </Badge>
            </td>
            <td>{job.actor}</td>
            <td>{job.createdAt}</td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  )
}

function DataTable({ children }: { children: React.ReactNode }): JSX.Element {
  return <table className="data-table">{children}</table>
}

function PlatformTile({ platform }: { platform: PlatformConfig }): JSX.Element {
  return (
    <div className="platform-tile">
      <PlatformSymbol platform={platform} />
      <div>
        <b>{platform.displayName}</b>
        <strong>{platform.installedCount}</strong>
        <span>installed</span>
      </div>
      <small className={platform.health === 'healthy' ? 'ok-text' : platform.health === 'warning' ? 'warn-text' : 'muted'}>
        {platform.health === 'healthy' ? '健康' : platform.health === 'warning' ? '警告' : '未启用'}
      </small>
    </div>
  )
}

function PlatformSymbol({ platform }: { platform: PlatformConfig }): JSX.Element {
  const Icon = platformIconMap[platform.key] ?? Box
  return (
    <span className={`platform-symbol ${platform.key}`}>
      <Icon size={18} />
    </span>
  )
}

function PlatformBadges({ platforms }: { platforms: string[] }): JSX.Element {
  return (
    <div className="badge-row">
      {platforms.map((platform) => {
        const Icon = platformIconMap[platform] ?? Box
        return (
          <span key={platform} className="tiny-platform" title={platform}>
            <Icon size={14} />
          </span>
        )
      })}
    </div>
  )
}

function SkillCard({ skill, selected, onClick }: { skill: CatalogItem; selected: boolean; onClick: () => void }): JSX.Element {
  return (
    <button className={selected ? 'skill-card selected' : 'skill-card'} onClick={onClick}>
      <div className="skill-card-head">
        <PlatformLogo label={skill.name.slice(0, 2)} />
        <div>
          <b>{skill.name}</b>
          <span>{skill.description}</span>
        </div>
        {selected && <Check size={16} />}
      </div>
      <TagGroup tags={skill.tags.slice(0, 3)} />
      <div className="skill-card-foot">
        <span>{sourceLabel(skill.sourceId)}</span>
        <Badge tone={skill.installed ? 'green' : skill.updateVersion ? 'orange' : 'gray'}>{skill.installed ? '已安装' : skill.updateVersion ? '可更新' : '未安装'}</Badge>
      </div>
      <div className="card-actions">
        <button>预览</button>
        <button className="primary small">{skill.installed ? '打开' : skill.updateVersion ? '更新' : '安装'}</button>
      </div>
    </button>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: string }): JSX.Element {
  return <span className={`badge ${tone}`}>{children}</span>
}

function TagGroup({ tags }: { tags: string[] }): JSX.Element {
  return (
    <div className="tag-row">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  )
}

function StatusPill({ icon: Icon, title, value, tone }: { icon: typeof Box; title: string; value: string; tone: string }): JSX.Element {
  return (
    <div className="status-pill">
      <Icon size={24} className={`${tone}-text`} />
      <div>
        <b>{title}</b>
        <span>{value}</span>
      </div>
    </div>
  )
}

function AuditList({ audit }: { audit: AuditRecord[] }): JSX.Element {
  return (
    <div className="audit-list">
      {audit.map((item) => (
        <div key={item.id} className="audit-row">
          <span className={`dot ${item.level === 'warning' ? 'warn' : item.level === 'error' ? 'danger' : 'ok'}`} />
          <div>
            <b>{item.action}</b>
            <span>{item.target}</span>
          </div>
          <time>{item.createdAt}</time>
          <span>{item.actor}</span>
        </div>
      ))}
    </div>
  )
}

function FilterBar({ labels }: { labels: string[] }): JSX.Element {
  return (
    <div className="filter-bar">
      {labels.map((label) => (
        <label key={label}>
          <span>{label}</span>
          <select>
            <option>全部</option>
            <option>官方</option>
            <option>团队</option>
          </select>
        </label>
      ))}
      <label className="switch-label">
        仅显示支持当前平台
        <span className="switch on" />
      </label>
    </div>
  )
}

function Toolbar(): JSX.Element {
  return (
    <div className="toolbar">
      <button className="button">
        <RefreshCcw size={15} />
        刷新
      </button>
      <button className="icon-button">
        <Settings size={15} />
      </button>
    </div>
  )
}

function RuleActions(): JSX.Element {
  return (
    <div className="toolbar">
      <button className="button">预览 Diff</button>
      <button className="primary">应用到项目</button>
      <button className="button">
        <Upload size={15} />
        更新
      </button>
    </div>
  )
}

function DetailActions({ installed, mode }: { installed: boolean; mode: string }): JSX.Element {
  return (
    <div className="toolbar">
      <button className="button">{mode === 'store' ? '预览' : '打开目录'}</button>
      <button className="primary">{installed ? '打开' : '安装'}</button>
      <button className="icon-button">
        <X size={16} />
      </button>
    </div>
  )
}

function SearchBox({ placeholder }: { placeholder: string }): JSX.Element {
  return (
    <label className="search-box">
      <Search size={15} />
      <input placeholder={placeholder} />
    </label>
  )
}

function Notice({ tone, title, text }: { tone: string; title: string; text: string }): JSX.Element {
  return (
    <div className={`notice ${tone}`}>
      <AlertTriangle size={17} />
      <div>
        <b>{title}</b>
        <span>{text}</span>
      </div>
    </div>
  )
}

function Tabs({ labels, active }: { labels: string[]; active: number }): JSX.Element {
  return (
    <div className="tabs">
      {labels.map((label, index) => (
        <button key={label} className={index === active ? 'active' : ''}>
          {label}
        </button>
      ))}
    </div>
  )
}

function DiffPreview(): JSX.Element {
  return (
    <div className="diff">
      <div className="diff-head">Diff 预览 · AGENTS.md</div>
      <div className="diff-grid">
        <pre className="removed">- 使用 CSS Modules 管理组件样式{'\n'}- 避免内联样式{'\n'}- 优先使用函数式组件与 Hooks</pre>
        <pre className="added">+ 使用 Tailwind CSS 进行样式开发{'\n'}+ 遵循 Atomic Design 组件设计原则{'\n'}+ 组件 props 使用 TypeScript 严格类型</pre>
      </div>
    </div>
  )
}

function ActionList(): JSX.Element {
  return (
    <div className="action-list">
      {[
        ['可更新 Skills', '有 15 个 Skills 可更新', '15'],
        ['失效 symlink', '检测到 7 个失效的符号链接', '7'],
        ['Rule 冲突', '检测到 3 处 Rule 冲突', '3'],
        ['Token 即将过期', '2 个 Token 将在 30 天内过期', '2']
      ].map(([title, text, count]) => (
        <button key={title}>
          <AlertTriangle size={18} />
          <div>
            <b>{title}</b>
            <span>{text}</span>
          </div>
          <Badge tone="orange">{count}</Badge>
        </button>
      ))}
    </div>
  )
}

function Legend(): JSX.Element {
  return (
    <div className="legend">
      <span><i className="dot ok" />健康</span>
      <span><i className="dot warn" />警告</span>
      <span><i className="dot danger" />异常</span>
      <span><i className="dot muted" />未启用</span>
    </div>
  )
}

function RadioGroup({ title, options }: { title: string; options: string[] }): JSX.Element {
  return (
    <div className="option-group">
      <b>{title}</b>
      {options.map((option, index) => (
        <label key={option}>
          <input type="radio" name={title} defaultChecked={index === 0} />
          {option}
        </label>
      ))}
    </div>
  )
}

function CheckboxGroup({ title, options }: { title: string; options: string[] }): JSX.Element {
  return (
    <div className="option-group">
      <b>{title}</b>
      {options.map((option, index) => (
        <label key={option}>
          <input type="checkbox" defaultChecked={index < 3} />
          {option}
        </label>
      ))}
    </div>
  )
}

function RadioInline({ options, active }: { options: string[]; active: number }): JSX.Element {
  return (
    <div className="radio-inline">
      {options.map((option, index) => (
        <label key={option}>
          <input type="radio" name="inline" defaultChecked={index === active} />
          {option}
        </label>
      ))}
    </div>
  )
}

function ToggleRow({ label, checked }: { label: string; checked: boolean }): JSX.Element {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <span className={checked ? 'switch on' : 'switch'} />
    </div>
  )
}

function LabeledInput({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="field-row">
      <label>{label}</label>
      <input defaultValue={value} />
    </div>
  )
}

function FormPreview({ source }: { source?: SourceConfig }): JSX.Element {
  return (
    <div className="settings-form">
      <LabeledInput label="名称" value={source?.name ?? ''} />
      <LabeledInput label="类型" value={source?.kind ?? ''} />
      <LabeledInput label="URL" value={source?.url ?? ''} />
      <LabeledInput label="API Base" value={source?.apiBase ?? 'https://api.skills.sh'} />
      <LabeledInput label="Branch" value={source?.branch ?? 'main'} />
      <LabeledInput label="Paths" value={source?.paths?.join(', ') ?? '/skills,/rules'} />
      <LabeledInput label="AuthRef" value={source?.authRef ?? 'default'} />
      <ToggleRow label="Enabled" checked={source?.enabled ?? true} />
      <div className="panel-actions">
        <button className="primary">保存</button>
        <button className="button">重置</button>
        <button className="danger-button">删除源</button>
      </div>
    </div>
  )
}

function CredentialBox({ title, state, text }: { title: string; state: string; text: string }): JSX.Element {
  return (
    <div className="credential-box">
      <div>
        <b>{title}</b>
        <Badge tone={state === '正常' ? 'green' : 'orange'}>{state}</Badge>
      </div>
      <p>{text}</p>
      <button className="button">配置 Token</button>
      <button className="button">测试</button>
    </div>
  )
}

function SourceIcon({ source }: { source: SourceConfig }): JSX.Element {
  const Icon = source.kind.includes('git') ? GitBranch : source.kind === 'local-dir' ? Folder : Database
  return (
    <span className={`source-icon ${source.kind}`}>
      <Icon size={22} />
    </span>
  )
}

function PlatformLogo({ label }: { label: string }): JSX.Element {
  return <span className="platform-logo">{label.toUpperCase()}</span>
}

function StarIcon({ active }: { active: boolean }): JSX.Element {
  return <span className={active ? 'star active' : 'star'}>★</span>
}

function UsersIcon(): JSX.Element {
  return <Grid2X2 size={16} />
}

function fallbackScan(): LocalSkillCandidate[] {
  return [
    {
      id: 'terminal-master',
      name: 'terminal-master',
      version: '1.2.0',
      description: '终端技能',
      tags: ['Shell', 'CLI'],
      path: '~/.claude/skills/terminal-master',
      detectedPlatform: 'Claude Code',
      fileCount: 8,
      checksum: 'sha256:demo',
      risks: [{ level: 'medium', message: '脚本目录' }],
      importable: true
    },
    {
      id: 'code-reviewer',
      name: 'code-reviewer',
      version: '0.8.0',
      description: '代码评审',
      tags: ['Review', 'Quality'],
      path: '~/.claude/skills/code-reviewer',
      detectedPlatform: 'Claude Code',
      fileCount: 5,
      checksum: 'sha256:demo',
      risks: [],
      importable: true
    },
    {
      id: 'incident-responder',
      name: 'incident-responder',
      version: '1.0.0',
      description: '事故响应',
      tags: ['Ops', 'Incident'],
      path: '~/.agents/skills/incident-responder',
      detectedPlatform: 'Codex',
      fileCount: 7,
      checksum: 'sha256:demo',
      risks: [],
      importable: true
    }
  ]
}

function sourceLabel(sourceId: string): string {
  if (sourceId.includes('github')) return 'GitHub'
  if (sourceId.includes('gitlab')) return 'GitLab'
  if (sourceId.includes('skills')) return 'Skill Store'
  return 'Local'
}

function trustLabel(level: string): string {
  return ({ official: '官方', team: '团队', community: '社区', unknown: '未知' } as Record<string, string>)[level] ?? level
}

export default App
