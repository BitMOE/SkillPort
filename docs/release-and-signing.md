# Release and Signing

SkillPort uses `electron-builder` for release packaging and `electron-updater` for application update checks.

## Targets

| Platform | Target |
| --- | --- |
| macOS | `dmg`, `zip` |
| Windows | `nsis` |
| Linux | `AppImage`, `deb` |

## Update Policy

- Provider: GitHub draft releases by default.
- Channel: `stable`.
- Auto-check: enabled.
- Auto-download: disabled.
- Enterprise policy can disable app update checks through `appUpdates.setEnterpriseDisabled`.

## Signing Policy

- macOS requires Developer ID signing and notarization before public release.
- Windows requires Authenticode signing for installer reputation and auto-update trust.
- Linux package signing follows the enterprise package repository strategy.

Unsigned local builds are allowed for development only.
