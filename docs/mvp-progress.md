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
| M7 | Install copy/symlink/junction/fallback, backup, rollback | Pending | Plan preview only |
| M8 | Rule Center package scan, diff, apply, rollback | Pending | Demo diff only |
| M9 | Update Manager for Skills and Rules | Pending | Demo update flags only |
| M10 | App packaging, signing policy, auto-update | Pending | Builder config only |
| M11 | CLI, doctor, lockfile, import/export | Pending | Not implemented yet |
| M12 | Beta hardening, security audit, recovery, docs | Pending | Not implemented yet |

Each completed MVP should be committed separately.
