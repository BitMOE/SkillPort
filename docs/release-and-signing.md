# Release and Signing

SkillPort uses `electron-builder` for release packaging and `electron-updater` for application update checks.

## Targets

| Platform | Target |
| --- | --- |
| macOS | `dmg`, `zip`, `tar.gz` |
| Windows | `msi`, `portable` |
| Linux | `AppImage`, `deb` |

## GitHub Release Workflow

`.github/workflows/release-packages.yml` builds release assets automatically when a GitHub Release is published with a tag whose name starts with `v`.

Examples:

- `v0.1.0`
- `v1.2.3`
- `v2.0.0-beta.1`

The workflow runs two jobs:

- Windows on `windows-latest`: builds `msi` and `portable` packages.
- macOS on `macos-latest`: builds `dmg`, `zip`, and `tar.gz` packages.

Both jobs upload generated assets from `release/` back to the published GitHub Release with `gh release upload --clobber`.

## Update Policy

- Provider: GitHub releases.
- Channel: `stable`.
- Auto-check: enabled.
- Auto-download: disabled.
- Enterprise policy can disable app update checks through `appUpdates.setEnterpriseDisabled`.

## Signing Policy

- macOS requires Developer ID signing and notarization before public release.
- Windows requires Authenticode signing for installer reputation and auto-update trust.
- Linux package signing follows the enterprise package repository strategy.

Unsigned local builds are allowed for development only.
