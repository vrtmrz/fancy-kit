# Updates

## Unreleased

## 0.2.0

### New features

- Added structured Playwright layout inspection and retrying assertions for viewport containment and unexpected horizontal overflow. Consumers select the locator to inspect, and vertical scrolling remains valid unless explicitly checked.
- Added minimum touch-target and device safe-area assertions. Layout inspections now report measured or consumer-supplied safe-area insets and per-edge overflow, so mobile controls can be inside the viewport while still failing an iPhone-style safe-area check.
