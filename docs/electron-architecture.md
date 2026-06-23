# Electron Architecture

SkillPort 使用四层结构：

1. Renderer：React + TypeScript UI，只调用 `window.skillport`。
2. Preload：通过 `contextBridge` 暴露受控 API。
3. Main：窗口、安全配置、IPC、数据服务和本地能力。
4. Worker / Utility：后续用于同步、扫描、安装、checksum 等耗时任务。

当前 MVP 已实现 Main / Preload / Renderer 的安全边界，并将耗时任务入口抽象在服务层，后续可迁移到 `utilityProcess` 或 Worker Threads。

## BrowserWindow 基线

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`
- `allowRunningInsecureContent: false`

## IPC 约束

- Channel 使用业务命名空间，例如 `catalog:search`、`scan:start`。
- Renderer 不接收任意 shell 或任意写入能力。
- 入参通过 Zod 校验。
- 所有响应统一封装为 `ApiResult<T>`。
