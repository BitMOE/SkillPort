# SkillPort / 技能港 🚢

> 团队 AI Skills & Rules 的统一管理与分发工具  
> Manager for team AI Skills, Rules, and multi-platform distribution.

SkillPort 是一个 **本地优先（local-first）** 的 Electron 桌面应用，用于集中管理团队内的 AI Skills、Rules、平台适配目录、安装策略、更新策略和审计记录。它面向使用 Claude Code、Cursor、Codex、Gemini CLI、Windsurf、Cline、Kiro、Trae、OpenCode 等多种 AI 编码工具的团队，帮助团队把零散的 `SKILL.md`、Rules、平台目录和分发流程收拢到一个安全、可审计、可恢复的桌面工作台中。

This README is bilingual. The English guide starts at [English](#english).

---

## 中文

### ✨ 核心能力

- 🧭 **Skill Store / Catalog**：解析、索引、搜索团队 Skills 与 Rule Packages。
- 📦 **多源管理**：支持 GitHub、GitLab、自托管 GitLab、skills.sh、本地目录和归档源的配置模型。
- 🔎 **本地扫描**：扫描本地 `SKILL.md`，识别版本、标签、脚本风险、隐藏注释、外部链接等信息。
- 🛠️ **多平台适配**：内置主流 AI 编码平台适配器，支持用户目录、项目目录、Rule 目标和安装模式覆写。
- 🚀 **一键安装计划**：支持 copy、symlink、Windows junction fallback、备份、回滚和卸载流程。
- 📜 **Rule Center**：扫描项目规则文件，预览 diff，应用托管区块，写入 lockfile，并支持回滚。
- 🔄 **更新管理**：区分内容更新和 App 更新，支持信任等级、主版本、脚本风险和企业禁用策略。
- 🧪 **Beta Hardening**：安全审计、运行时恢复、性能快照和 Beta 发布检查清单。
- 🧾 **审计与日志**：关键写入操作记录 audit log，便于团队追踪变更。
- 🌐 **三语言 UI 基础**：内置简体中文、繁体中文、英文语言资源。
- 💻 **CLI**：提供 doctor、sources list、config import/export、lockfile write 等命令。

### 🖼️ 当前实现状态

本仓库已经完成规格书中 M1-M12 MVP：

| MVP | 范围 | 状态 |
| --- | --- | --- |
| M1 | Electron 框架、安全窗口、Preload API、i18n | ✅ Complete |
| M2 | SQLite、配置、日志、数据目录、Token 加密状态 | ✅ Complete |
| M3 | Source 管理：GitHub / GitLab / skills.sh / 本地目录 | ✅ Complete |
| M4 | Catalog 解析、搜索、标签、版本 | ✅ Complete |
| M5 | 本地扫描 Worker、风险检测、导入 | ✅ Complete |
| M6 | 平台适配器、路径覆写、健康检查 | ✅ Complete |
| M7 | 安装、copy/symlink/junction fallback、备份、回滚 | ✅ Complete |
| M8 | Rule Center 扫描、diff、应用、回滚 | ✅ Complete |
| M9 | Skills 与 Rules 内容更新管理 | ✅ Complete |
| M10 | App 打包、签名策略、自更新服务 | ✅ Complete |
| M11 | CLI、doctor、lockfile、配置导入导出 | ✅ Complete |
| M12 | Beta 性能优化、安全审计、错误恢复、文档 | ✅ Complete |

更多细节见 [docs/mvp-progress.md](docs/mvp-progress.md)。

### 🧱 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面框架 | Electron |
| 构建工具 | electron-vite / Vite |
| 前端 | React + TypeScript |
| 图标 | lucide-react |
| 主进程服务 | TypeScript + Node.js APIs |
| 本地数据库 | `node:sqlite` |
| 配置格式 | YAML |
| 校验 | Zod |
| 文件扫描 | fast-glob + Worker Threads |
| 版本比较 | semver |
| 日志 | electron-log + 本地 audit log |
| 打包 | electron-builder |
| 自更新 | electron-updater |

### 📁 目录结构

```text
SkillPort/
  adapters/                  # 平台适配器 YAML
  bin/                       # CLI 入口
  docs/                      # 架构、安全、发布、Beta hardening 文档
  spec/                      # 产品规格书与截图
  src/
    cli/                     # CLI 命令清单
    main/                    # Electron main process 与服务层
      services/
        audit/
        catalog/
        config/
        hardening/
        install/
        platforms/
        rules/
        scan/
        security/
        sources/
        storage/
        updates/
    preload/                 # contextBridge 安全 API
    renderer/                # React UI
    shared/                  # 跨进程共享类型与 API 契约
  electron.vite.config.ts
  package.json
  tsconfig.json
```

### 🚀 快速开始

#### 环境要求

- Node.js 22+，推荐使用当前 LTS 或仓库已验证的新版 Node。
- npm。
- Windows、macOS 或 Linux 桌面环境。

#### 安装依赖

```bash
npm install
```

#### 启动开发环境

```bash
npm run dev
```

#### 类型检查与构建

```bash
npm run typecheck
npm run build
```

构建产物输出到 `out/`。安装包目标由 `package.json` 中的 `build` 配置控制，发布产物默认输出到 `release/`。

### 💻 CLI

本仓库提供 `skillport` CLI 入口：

```bash
npm run skillport -- help
npm run skillport -- doctor
npm run skillport -- sources list
npm run skillport -- config export ./skillport-config.yaml
npm run skillport -- config import ./skillport-config.yaml
npm run skillport -- lockfile write .
```

CLI 默认使用当前工作目录下的 `.skillport/` 作为本地数据目录。也可以通过环境变量覆盖：

```bash
SKILLPORT_HOME=/path/to/skillport-data npm run skillport -- doctor
```

Windows PowerShell 示例：

```powershell
$env:SKILLPORT_HOME="C:\tmp\skillport-data"
npm run skillport -- doctor
```

### 🧩 桌面功能概览

#### Dashboard

展示安装数量、可更新数量、平台健康、缓存状态、最近任务和 audit 记录。

#### Skill Store

展示 Catalog 中的 Skills 和 Rule Packages，支持搜索、标签、信任等级、版本和风险信息。

#### Local Scan

扫描本地目录中的 `SKILL.md`，识别：

- `version` 字段。
- 标签和描述。
- 可执行脚本。
- 隐藏注释。
- 外部链接。
- 缺失版本等风险。

#### Platform Settings

管理各平台适配器，包括：

- 用户级 Skill 目录。
- 项目级 Skill 目录。
- Rule 目标文件。
- 默认安装模式。
- symlink 是否允许。
- 平台健康检查。

#### Rule Center

支持项目规则文件扫描、托管区块 diff 预览、Rule 包应用、lockfile 写入和回滚。

#### Updates

内容更新和 App 更新分开处理：

- Skills / Rules 内容更新：信任等级、主版本升级、脚本风险、自动应用策略。
- App 更新：`electron-updater`、GitHub draft release、企业禁用开关。

#### Settings / Beta Hardening

Beta Hardening 面板提供：

- 安全审计分数与检查项。
- 运行时目录恢复。
- 轻量性能快照。

### 🔐 安全模型

SkillPort 的安全边界基于 Electron 推荐实践：

- Renderer 不启用 Node integration。
- Renderer 启用 context isolation、sandbox 和 web security。
- Renderer 不能直接访问文件系统、SQLite、Token 或 `ipcRenderer`。
- Preload 只通过 `window.skillport` 暴露白名单 API。
- 主进程 IPC 使用统一 `ApiResult` 返回结构。
- 关键输入使用 Zod 校验。
- Token 存储通过安全存储能力或降级保护状态管理。
- 安装与 Rule 应用先生成计划，再执行写入。
- 写入操作尽量包含 backup 与 audit log。
- 外部链接使用系统浏览器打开。

更多说明见 [docs/security.md](docs/security.md) 与 [docs/beta-hardening.md](docs/beta-hardening.md)。

### 🧾 数据与文件

桌面应用运行时数据默认存放在 Electron `userData` 下的 `skillport/` 子目录中，包含：

- `catalog.sqlite`：本地 SQLite 数据库。
- `config.yaml`：本地配置。
- `logs/`：应用日志与审计日志。
- `artifacts/`：Skill / Rule 物料缓存。
- `backups/`：安装和 Rule 应用备份。
- `rules/`：Rule 相关运行时数据。
- `temp/`：临时目录。

CLI 默认使用仓库内 `.skillport/`，该目录已被 `.gitignore` 忽略。

### 📦 打包与发布

当前 `electron-builder` 目标：

| 平台 | Target |
| --- | --- |
| macOS | `dmg`, `zip`, `tar.gz` |
| Windows | `msi`, `portable` |
| Linux | `AppImage`, `deb` |

发布与签名策略见 [docs/release-and-signing.md](docs/release-and-signing.md)。

GitHub Release 自动打包由 `.github/workflows/release-packages.yml` 负责：发布 `v*` 格式 tag 的 Release 时，会自动构建 Windows MSI、Windows Portable、macOS DMG、macOS ZIP 和 macOS tar.gz，并上传到该 Release。

> ⚠️ 本地未签名构建仅适合开发测试。公开发布前需要配置 macOS Developer ID / notarization、Windows Authenticode、Linux 包签名或企业仓库策略。

### 🧪 验证命令

常用验证：

```bash
npm run typecheck
npm run build
npm run skillport -- doctor
```

当前项目没有单独的 `npm test` 脚本；构建命令会执行 TypeScript 检查并构建 main、preload、renderer 三部分。

### 🛠️ 常见问题

#### `node:sqlite` 不可用

请使用支持 `node:sqlite` 的 Node/Electron 运行时。若本地 Node 版本过旧，请升级到 Node.js 22+。

#### CLI 写入目录失败

CLI 默认写入当前工作目录下 `.skillport/`。如果需要写到其他位置，请设置 `SKILLPORT_HOME`。

#### App 更新检查在开发模式返回不可用

这是预期行为。`AppUpdateService` 在未打包开发环境中不会执行真实更新检查。

#### 构建产物过大

Renderer bundle 目前包含完整 UI 与依赖。后续可按路由拆分、延迟加载重型模块或增加 bundle analysis。

### 🤝 贡献约定

- 修改前先查看 `git status --short`。
- 保持改动聚焦，不提交本地数据、日志、缓存或 `.env`。
- 涉及写入、认证、Token、下载、路径、IPC 的改动必须考虑安全边界。
- 功能改动完成后运行相关验证命令。
- 提交信息使用 Conventional Commits，例如：

```bash
git commit -m "feat: add source health diagnostics"
git commit -m "fix: guard rule rollback path"
git commit -m "docs: update release checklist"
```

### 📚 相关文档

- [docs/electron-architecture.md](docs/electron-architecture.md)
- [docs/security.md](docs/security.md)
- [docs/release-and-signing.md](docs/release-and-signing.md)
- [docs/beta-hardening.md](docs/beta-hardening.md)
- [docs/mvp-progress.md](docs/mvp-progress.md)
- [spec/skillport.md](spec/skillport.md)

---

## English

### What Is SkillPort? 🚢

SkillPort is a **local-first Electron desktop app** for managing team AI Skills, Rules, platform adapters, installation policies, update policies, and audit records. It is designed for teams that use multiple AI coding tools such as Claude Code, Cursor, Codex, Gemini CLI, Windsurf, Cline, Kiro, Trae, and OpenCode.

The goal is simple: turn scattered `SKILL.md` files, rule packages, platform-specific directories, and manual distribution steps into a safer, searchable, auditable desktop workflow.

### ✨ Features

- 🧭 **Skill Store / Catalog**: parse, index, search, and inspect Skills and Rule Packages.
- 📦 **Source Management**: model GitHub, GitLab, self-hosted GitLab, skills.sh, local directory, and archive sources.
- 🔎 **Local Scan**: scan local `SKILL.md` files and detect metadata, version fields, scripts, hidden comments, links, and risks.
- 🛠️ **Platform Adapters**: manage user skill directories, project skill directories, rule targets, install modes, and health checks.
- 🚀 **Install Plans**: support copy, symlink, Windows junction fallback, backup, rollback, and uninstall flows.
- 📜 **Rule Center**: scan project rule files, preview diffs, apply managed blocks, write lockfiles, and rollback rule applications.
- 🔄 **Update Manager**: separate content updates from application updates with trust, major-version, script-risk, and enterprise policies.
- 🧪 **Beta Hardening**: security audit, runtime recovery, performance snapshots, and Beta release checklist.
- 🧾 **Audit Logs**: record important write operations for traceability.
- 🌐 **i18n Foundation**: Simplified Chinese, Traditional Chinese, and English resources.
- 💻 **CLI**: doctor, sources list, config import/export, lockfile write, and command catalog.

### Current MVP Status

All M1-M12 MVP milestones from the specification are complete:

| MVP | Scope | Status |
| --- | --- | --- |
| M1 | Electron framework, secure window, preload API, i18n | ✅ Complete |
| M2 | SQLite, config, logs, data directory, token encryption status | ✅ Complete |
| M3 | Source management for GitHub / GitLab / skills.sh / local directory | ✅ Complete |
| M4 | Catalog parsing, search, tags, versions | ✅ Complete |
| M5 | Local scan worker, risk detection, import | ✅ Complete |
| M6 | Platform adapters, overrides, health checks | ✅ Complete |
| M7 | Install, copy/symlink/junction fallback, backup, rollback | ✅ Complete |
| M8 | Rule Center scan, diff, apply, rollback | ✅ Complete |
| M9 | Skills and Rules content update manager | ✅ Complete |
| M10 | App packaging, signing policy, auto-update service | ✅ Complete |
| M11 | CLI, doctor, lockfile, config import/export | ✅ Complete |
| M12 | Beta performance, security audit, error recovery, docs | ✅ Complete |

See [docs/mvp-progress.md](docs/mvp-progress.md) for detailed evidence.

### Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop | Electron |
| Build | electron-vite / Vite |
| Frontend | React + TypeScript |
| Icons | lucide-react |
| Main services | TypeScript + Node.js APIs |
| Local database | `node:sqlite` |
| Config | YAML |
| Validation | Zod |
| File scan | fast-glob + Worker Threads |
| Versioning | semver |
| Logs | electron-log + local audit log |
| Packaging | electron-builder |
| App updates | electron-updater |

### Project Structure

```text
SkillPort/
  adapters/                  # Platform adapter YAML files
  bin/                       # CLI entry
  docs/                      # Architecture, security, release, hardening docs
  spec/                      # Product specification and screenshots
  src/
    cli/                     # CLI command catalog
    main/                    # Electron main process and services
      services/
        audit/
        catalog/
        config/
        hardening/
        install/
        platforms/
        rules/
        scan/
        security/
        sources/
        storage/
        updates/
    preload/                 # contextBridge safe API
    renderer/                # React UI
    shared/                  # Shared types and API contract
  electron.vite.config.ts
  package.json
  tsconfig.json
```

### Quick Start

#### Requirements

- Node.js 22+.
- npm.
- Windows, macOS, or Linux desktop environment.

#### Install Dependencies

```bash
npm install
```

#### Start Dev App

```bash
npm run dev
```

#### Typecheck and Build

```bash
npm run typecheck
npm run build
```

Build output is written to `out/`. Release package output is configured under `build.directories.output` in `package.json` and defaults to `release/`.

### CLI

SkillPort includes a local CLI:

```bash
npm run skillport -- help
npm run skillport -- doctor
npm run skillport -- sources list
npm run skillport -- config export ./skillport-config.yaml
npm run skillport -- config import ./skillport-config.yaml
npm run skillport -- lockfile write .
```

By default, the CLI stores local data under `.skillport/` in the current working directory. Override it with `SKILLPORT_HOME`:

```bash
SKILLPORT_HOME=/path/to/skillport-data npm run skillport -- doctor
```

Windows PowerShell:

```powershell
$env:SKILLPORT_HOME="C:\tmp\skillport-data"
npm run skillport -- doctor
```

### Desktop Modules

#### Dashboard

Shows installed count, updateable count, platform health, cache state, recent jobs, and audit records.

#### Skill Store

Displays catalog items with search, tags, trust levels, versions, checksums, and risk metadata.

#### Local Scan

Scans local directories for `SKILL.md` and detects:

- Version fields.
- Tags and descriptions.
- Executable scripts.
- Hidden comments.
- External links.
- Missing version risks.

#### Platform Settings

Manages platform adapters:

- User-level skill directories.
- Project-level skill directories.
- Rule target files.
- Default install mode.
- Symlink permission.
- Platform health checks.

#### Rule Center

Scans rule targets, previews managed-block diffs, applies rule packages, writes lockfiles, and supports rollback.

#### Updates

Content updates and app updates are separated:

- Skills / Rules content updates: trust gates, major-version gates, script-risk gates, and auto-apply policy.
- App updates: `electron-updater`, GitHub draft release provider, and enterprise disable switch.

#### Settings / Beta Hardening

The Beta Hardening panel provides:

- Security audit score and check details.
- Runtime directory recovery.
- Lightweight performance snapshot.

### Security Model

SkillPort follows Electron security best practices:

- Renderer Node integration is disabled.
- Context isolation, sandbox, and web security are enabled.
- Renderer cannot directly access filesystem, SQLite, tokens, or `ipcRenderer`.
- Preload exposes only the typed `window.skillport` API.
- Main-process IPC returns a unified `ApiResult`.
- Critical inputs are validated with Zod.
- Token storage reports secure storage availability and fallback protection.
- Install and Rule operations generate plans before writing files.
- Write operations are designed to include backup and audit logs.
- External links are opened through the system browser.

See [docs/security.md](docs/security.md) and [docs/beta-hardening.md](docs/beta-hardening.md).

### Runtime Data

The desktop app stores runtime data under Electron `userData/skillport/`:

- `catalog.sqlite`: local SQLite database.
- `config.yaml`: local configuration.
- `logs/`: app and audit logs.
- `artifacts/`: Skill / Rule artifacts.
- `backups/`: install and rule backups.
- `rules/`: rule runtime data.
- `temp/`: temporary files.

The CLI uses `.skillport/` in the current working directory by default, and this path is ignored by Git.

### Packaging and Release

Current `electron-builder` targets:

| Platform | Target |
| --- | --- |
| macOS | `dmg`, `zip`, `tar.gz` |
| Windows | `msi`, `portable` |
| Linux | `AppImage`, `deb` |

Release and signing details are documented in [docs/release-and-signing.md](docs/release-and-signing.md).

GitHub Release packaging is handled by `.github/workflows/release-packages.yml`: publishing a Release with a `v*` tag automatically builds Windows MSI, Windows Portable, macOS DMG, macOS ZIP, and macOS tar.gz assets, then uploads them to that Release.

> ⚠️ Unsigned local builds are for development only. Public releases should configure macOS Developer ID / notarization, Windows Authenticode signing, and Linux package signing or enterprise repository policy.

### Validation

Common validation commands:

```bash
npm run typecheck
npm run build
npm run skillport -- doctor
```

There is currently no dedicated `npm test` script. The build command runs TypeScript checking and builds the main, preload, and renderer bundles.

### Troubleshooting

#### `node:sqlite` is unavailable

Use a Node/Electron runtime that supports `node:sqlite`. Upgrade to Node.js 22+ if your local Node version is too old.

#### CLI cannot write data

The CLI writes to `.skillport/` in the current working directory by default. Set `SKILLPORT_HOME` to use another writable directory.

#### App update check returns unavailable in development

This is expected. `AppUpdateService` does not run real update checks in unpackaged development mode.

#### Renderer bundle is large

The current MVP ships a complete UI bundle. Future optimization can add route-level code splitting, lazy loading for heavier modules, and bundle analysis.

### Contributing

- Check `git status --short` before editing.
- Keep changes focused.
- Do not commit local data, logs, cache files, or `.env` files.
- Treat IPC, auth, tokens, downloads, paths, and file writes as security-sensitive.
- Run relevant validation before committing.
- Use Conventional Commits:

```bash
git commit -m "feat: add source health diagnostics"
git commit -m "fix: guard rule rollback path"
git commit -m "docs: update release checklist"
```

### Documentation

- [docs/electron-architecture.md](docs/electron-architecture.md)
- [docs/security.md](docs/security.md)
- [docs/release-and-signing.md](docs/release-and-signing.md)
- [docs/beta-hardening.md](docs/beta-hardening.md)
- [docs/mvp-progress.md](docs/mvp-progress.md)
- [spec/skillport.md](spec/skillport.md)
