# Updates

## Unreleased

### New features

- Added optional, exact local-storage seeding before plug-in enablement. Consumers can now prepare isolated device-local schema or acknowledgement markers without weakening the plug-in's first-load safety checks.

### Documentation

- Added a comprehensive package guide covering the public API areas, session lifecycle, injected boundaries, layout assertions, platform constraints, and the tests behind those contracts. The guide is now included in the npm package.
- Documented that `app.emulateMobile(true)` changes Obsidian's platform mode, can affect CLI command availability, and requires renderer-based fixture operations and explicit readiness waits.

## 0.2.0

### New features

- Added structured Playwright layout inspection and retrying assertions for viewport containment and unexpected horizontal overflow. Consumers select the locator to inspect, and vertical scrolling remains valid unless explicitly checked.
- Added minimum touch-target and device safe-area assertions. Layout inspections now report measured or consumer-supplied safe-area insets and per-edge overflow, so mobile controls can be inside the viewport while still failing an iPhone-style safe-area check.
