# SkillPort MVP Progress

The implementation follows the milestones in `spec/skillport.md`.

| MVP | Scope | Status | Evidence |
| --- | --- | --- | --- |
| M1 | Electron framework, secure window, preload API, i18n | Complete | `src/main/index.ts`, `src/preload/index.ts`, `src/shared/api.ts`, `src/renderer/src/i18n/*`, build passing |
| M2 | SQLite, config system, logs, app data directory, token encryption | Complete | `src/main/services/storage/database.ts`, `src/main/services/config/config-service.ts`, `src/main/services/audit/log-service.ts`, `src/main/services/security/token-store.ts`, build passing |
| M3 | Source management for GitHub, GitLab, skills.sh, local directory | Complete | `src/main/services/sources/source-service.ts`, persisted `sources` table, source IPC upsert/delete/sync/testConnection, build passing |
| M4 | Catalog parsing, search, tags, versions | Complete | `src/main/services/catalog/catalog-service.ts`, persisted `catalog_items` table, frontmatter parser, search filters, validate risks, build passing |
| M5 | Local scan in background worker, risk detection, import | Complete | `src/main/services/scan/scan-service.ts`, Worker Thread scan, scripts/executable/hidden-comment/link/version risks, import to Catalog, build passing |
| M6 | Platform adapters, overrides, health checks | Complete | `src/main/services/platforms/platform-service.ts`, YAML adapter loading, persisted platform overrides, reset defaults, validateTarget health checks, build passing |
| M7 | Install copy/symlink/junction/fallback, backup, rollback | Complete | `src/main/services/install/install-service.ts`, install plans, artifact materialization, backup-and-replace, copy/symlink/junction fallback, uninstall/rollback/openTargetDir IPC, build passing |
| M8 | Rule Center package scan, diff, apply, rollback | Complete | `src/main/services/rules/rule-service.ts`, project rule target scan, managed block diff, backup + apply, `.skillport.lock.yaml`, rollback IPC, build passing |
| M9 | Update Manager for Skills and Rules | Complete | `src/main/services/updates/update-service.ts`, content update policy, major-version/risk/trust gates, check/apply update IPC, build passing |
| M10 | App packaging, signing policy, auto-update | Complete | `electron-builder` targets, GitHub draft publish config, `electron-updater` AppUpdateService, enterprise disable switch, `docs/release-and-signing.md`, build passing |
| M11 | CLI, doctor, lockfile, import/export | Complete | `bin/skillport.mjs`, package bin, doctor, sources list, config import/export, lockfile write, CLI command catalog, build passing |
| M12 | Beta hardening, security audit, recovery, docs | Pending | Not implemented yet |

Each completed MVP should be committed separately.
