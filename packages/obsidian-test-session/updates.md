# Updates

## Unreleased

## 0.2.3

### Fixes

- Scoped stale-process clean-up to each temporary Vault's unique isolated profile, so starting a concurrent session no longer terminates an active sibling session created by the same consumer.

### Documentation

- Documented the distinct remote-debugging ports and process-before-profile teardown order required by concurrent multi-device workflows.

## 0.2.2

### Fixes

- Kept isolated macOS Obsidian profiles below a socket-safe temporary root and launched them with Chromium's mock keychain, preventing CLI socket truncation and blocking login-keychain dialogues.

### New features

- Added an optional `temporaryRoot` to `createTemporaryVault` for consumers which own another short, writable isolation root.

### Documentation

- Documented the macOS process-isolation defaults and the additional responsibility accepted when `E2E_OBSIDIAN_ARGS` replaces the complete default argument list.

## 0.2.1

### New features

- Added optional, exact local-storage seeding before plug-in enablement. Consumers can now prepare isolated device-local schema or acknowledgement markers without weakening the plug-in's first-load safety checks.

### Documentation

- Added a comprehensive package guide covering the public API areas, session lifecycle, injected boundaries, layout assertions, platform constraints, and the tests behind those contracts. The guide is now included in the npm package.
- Documented that `app.emulateMobile(true)` changes Obsidian's platform mode, can affect CLI command availability, and requires renderer-based fixture operations and explicit readiness waits.

## 0.2.0

### New features

- Added structured Playwright layout inspection and retrying assertions for viewport containment and unexpected horizontal overflow. Consumers select the locator to inspect, and vertical scrolling remains valid unless explicitly checked.
- Added minimum touch-target and device safe-area assertions. Layout inspections now report measured or consumer-supplied safe-area insets and per-edge overflow, so mobile controls can be inside the viewport while still failing an iPhone-style safe-area check.
