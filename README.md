# SkillPort

SkillPort 是团队 AI Skills、Rules 与多平台分发策略的本地优先管理工具。本仓库实现了 Electron + React + TypeScript 版本的桌面端 MVP。

## 功能范围

- Electron 主进程、Preload 安全桥与 Renderer 隔离。
- 白名单 IPC API，统一 `ApiResult` 返回结构，核心入参使用 Zod 校验。
- Dashboard、Skill Store、已安装 Skills、本地扫描、Rule Center、Sources、Platform Settings、Projects、Jobs & Audit、Settings 页面。
- 本地 `SKILL.md` 扫描入口，默认忽略 `.git`、`node_modules`、`dist`、`target`、`.venv`。
- 安装计划生成，覆盖 copy、symlink 与 Windows junction fallback 的目标预览。
- 内置平台适配器配置示例，覆盖主流 AI 编码平台。

## 开发命令

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## 安全边界

Renderer 不直接访问 Node.js、文件系统、Token、SQLite 或 `ipcRenderer`。本地能力只能通过 `src/preload/index.ts` 暴露的 `window.skillport` 白名单 API 调用，主进程负责校验和执行。
