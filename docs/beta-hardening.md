# Beta Hardening

SkillPort M12 adds a runtime hardening layer for Beta readiness. The goal is to make production risks visible before packaging and to provide low-risk recovery actions for local runtime state.

## Security Audit

The desktop runtime exposes `window.skillport.hardening.securityAudit()` through the preload whitelist. The audit report is generated in the main process and checks:

- Electron renderer boundary: Node integration disabled, context isolation enabled, renderer sandbox enabled, web security enabled, and external links opened by the system browser.
- Preload API boundary: renderer access is limited to `window.skillport`.
- Token storage: reports the active encryption backend and protection level.
- Runtime storage: verifies SQLite and audit logs initialized successfully.
- Source trust: warns when enabled community sources are present.
- Script risk gate: warns when catalog metadata contains script-like risks.

Each run writes a runtime record and audit log entry with the score and summary.

## Runtime Recovery

`window.skillport.hardening.recoverRuntime()` performs conservative repair only:

- Recreates the data directory and managed subdirectories: `artifacts`, `backups`, `logs`, `rules`, and `temp`.
- Reloads or creates `config.yaml` through `ConfigService`.
- Records repaired paths, warnings, and actions in SQLite runtime metadata.
- Writes an audit log entry.

It does not delete user files, rewrite installed Skills, rollback package state, or mutate source configuration.

## Performance Snapshot

`window.skillport.hardening.performanceSnapshot()` captures lightweight operational metrics:

- Process RSS and heap usage.
- Catalog item, source, and platform counts.
- Startup age in milliseconds.
- A bounded data-directory size estimate capped by file count.

The snapshot avoids deep unbounded scans and is safe to run from the Settings page during normal desktop use.

## Beta Checklist

- Run `npm run build` before every release candidate.
- Run the Settings page security audit and resolve any failed checks.
- Keep auto-apply disabled for community sources during Beta.
- Run runtime recovery after abnormal termination or missing directory errors.
- Keep `docs/release-and-signing.md` aligned with release provider, signing, and enterprise update policy.
