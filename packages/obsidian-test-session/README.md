# Obsidian Test Session

`@vrtmrz/obsidian-test-session` provides local, real-Obsidian test session infrastructure for plug-in consumers.

It creates isolated vault and application state, installs built plug-in artefacts, launches Obsidian, opens the vault through `obsidian-cli`, and uses Playwright over the active Electron renderer for plug-in bootstrap and UI readiness.

The package owns only generic test infrastructure. Consumer workflows, fixtures, assertions, settings, databases, and synchronisation remain consumer-owned.

> [!IMPORTANT]
> This package is in initial `0.x` development. npm's normal compatible range accepts patch releases but not the next minor release. Commit the lockfile for repeatable installations; use `--save-exact` when every upgrade must be reviewed explicitly. It is development tooling and must not be bundled into an Obsidian plug-in.

```bash
npm install -D @vrtmrz/obsidian-test-session
npm install -D playwright @types/node
```

## Requirements

- Node.js 20 or later;
- `playwright` installed by the consumer;
- `@types/node` 20 or later for TypeScript consumers;
- a local Obsidian executable and the matching `obsidian-cli`;
- Linux, macOS, or Windows for executable discovery. Automated AppImage download and headless `xvfb-run` support are Linux-specific.

Set `OBSIDIAN_BINARY` and `OBSIDIAN_CLI` when the executables are outside the built-in discovery paths. Importing the package has no side effects: downloading, extracting, and launching Obsidian require explicit function calls.

The real-Obsidian session and E2E workflows are validated on Linux and macOS. Windows executable discovery paths are implemented but have not been exercised by this project, so Windows should be treated as unverified rather than supported until consumer smoke tests cover it.

## Example

```ts
import {
  createTemporaryVault,
  discoverObsidianCli,
  requireObsidianBinary,
  startObsidianPluginSession,
  type ObsidianPluginSession,
} from "@vrtmrz/obsidian-test-session";

const vault = await createTemporaryVault({
  prefix: "example-plugin-e2e-",
  pluginIds: ["example-plugin"],
});
let session: ObsidianPluginSession | undefined;
try {
  const cli = discoverObsidianCli();
  if (!cli.binary) throw new Error("obsidian-cli is required");
  session = await startObsidianPluginSession({
    binary: requireObsidianBinary(),
    cliBinary: cli.binary,
    vault,
    pluginId: "example-plugin",
    artifactRoot: "dist/example-plugin",
    pluginData: { mode: "automation" },
  });

  // Run consumer-owned assertions through session.remoteDebuggingPort.
} finally {
  await session?.app.stop();
  await vault.dispose();
}
```

`startObsidianPluginSession` stops a process whose bootstrap fails. After a successful start, the caller owns both `session.app.stop()` and `vault.dispose()` as shown above.

`pluginData` is optional. When supplied, the session writes it as the plug-in's `data.json` before Obsidian starts. This supports deterministic modes and one-shot test requests. When omitted, an existing `data.json` is preserved.

## Layout inspection

The package provides focused Playwright inspection helpers for real-renderer layout checks. Consumers choose the locator and remain responsible for plug-in-specific selectors and workflow assertions.

```ts
import {
  assertLocatorHasMinimumTouchTarget,
  assertLocatorWithinSafeArea,
  assertLocatorWithinViewport,
  assertNoHorizontalOverflow,
  inspectLocatorLayout,
  withObsidianPage,
} from "@vrtmrz/obsidian-test-session";

await withObsidianPage(session.remoteDebuggingPort, async (page) => {
  const actions = page.locator('[data-testid="backup-actions"]');
  await actions.scrollIntoViewIfNeeded();

  await assertLocatorWithinViewport(page, actions, {
    label: "backup actions",
  });
  await assertNoHorizontalOverflow(page, actions, {
    label: "backup actions",
  });

  const closeButton = page.locator(
    ".modal-container .modal:last-child .modal-close-button",
  );
  await assertLocatorWithinSafeArea(page, closeButton, {
    label: "backup dialogue close button",
  });
  await assertLocatorHasMinimumTouchTarget(page, closeButton, {
    label: "backup dialogue close button",
  });

  const measurements = await inspectLocatorLayout(page, actions);
  console.log({
    contentOverflow: measurements.contentOverflow,
    safeAreaInsets: measurements.safeAreaInsets,
    safeAreaOverflow: measurements.safeAreaOverflow,
  });
});
```

The public assertions have separate, composable responsibilities:

| Assertion                            | Contract                                                                                                                                       |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `assertLocatorWithinViewport`        | The visible bounding box remains within the selected viewport axes.                                                                            |
| `assertNoHorizontalOverflow`         | The locator remains within the horizontal viewport and its content does not require horizontal scrolling. Vertical scrolling remains valid.    |
| `assertLocatorWithinSafeArea`        | The visible bounding box remains outside status-bar, notch, rounded-corner, home-indicator, and equivalent unsafe insets on the selected axes. |
| `assertLocatorHasMinimumTouchTarget` | The visible bounding box meets the configured minimum width and height. Both default to 44 CSS pixels for a practical mobile review target.    |

Every assertion retries transient layouts and returns the final `LocatorLayoutInspection`. Configure `timeoutMs`, `pollIntervalMs`, and `tolerancePx` when the defaults do not suit the rendered component. `assertLocatorWithinViewport` and `assertLocatorWithinSafeArea` also accept `axes: "horizontal"`, `"vertical"`, or `"both"`.

### Safe-area checks

`inspectLocatorLayout` measures Obsidian's inherited `--safe-area-inset-*` values when present, then falls back to the browser CSS `env(safe-area-inset-*)` values. The result includes the effective `safeAreaInsets` and the distance by which each locator edge enters the unsafe area. A locator can therefore pass viewport containment but fail safe-area containment, as when a mobile dialogue Close control is visible underneath the iPhone status area.

Desktop mobile emulation often reports zero hardware insets. Supply the target device's logical CSS-pixel insets to make that test deterministic:

```ts
await page.setViewportSize({ width: 390, height: 844 });

await assertLocatorWithinSafeArea(page, closeButton, {
  label: "note lookup close button",
  safeAreaInsets: {
    top: 47,
    right: 0,
    bottom: 34,
    left: 0,
  },
});
```

An override replaces only the supplied edges; other edges retain their measured values. Insets and locator dimensions are CSS pixels, not physical screenshot pixels. Use the target viewport's logical dimensions and insets together.

### Touch-target checks

The 44 by 44 CSS-pixel default is an intentionally practical mobile review policy, not a claim that every platform or accessibility standard requires the same threshold. Consumers can select their own policy:

```ts
await assertLocatorHasMinimumTouchTarget(page, closeButton, {
  label: "dialogue close button",
  minimumWidthPx: 24,
  minimumHeightPx: 24,
});
```

The assertion measures the locator's visible bounding box. It does not infer a larger hit area created by pseudo-elements, prove that the element receives pointer events, detect a native operating-system overlay, or click the control. Combine the dimension and safe-area assertions for mobile controls, and retain consumer-owned interaction checks for focus, activation, dismissal, and occlusion.

The helpers do not scroll, resize, take screenshots, or scan descendants. Call `scrollIntoViewIfNeeded()` explicitly when the selected element may be outside a legitimate scroll container. A fixed Playwright viewport is used when available; otherwise, a connected Electron renderer uses its inner window dimensions.

## Session boundary

The high-level session installs built plug-in artefacts, launches an isolated Obsidian process, pre-seeds vault trust, and asks the CLI to open the vault. When a platform CLI cannot connect to the isolated process, the session continues only after CDP confirms that the renderer opened the exact isolated vault path. It then enables and reloads the plug-in through CDP and waits for readiness. It returns:

- `remoteDebuggingPort` for consumer-owned Playwright operations;
- `cliEnv` for consumer-owned `obsidian-cli eval` or other CLI commands;
- readiness and installed artefact details;
- the process lifecycle handle.

Use the lower-level exports only when a consumer needs a different bootstrap sequence. Keep plug-in-specific settings, databases, commands, stories, and assertions outside this package.

## Preparing a Linux AppImage

Linux consumers can explicitly download and extract a supported Obsidian AppImage. The version defaults to the package's currently tested release and should be pinned by a consumer that requires repeatability.

```ts
import { installObsidianAppImage } from "@vrtmrz/obsidian-test-session";

const prepared = await installObsidianAppImage({ version: "1.12.7" });
process.env.OBSIDIAN_BINARY = prepared.extractedBinary;
```

This operation performs network and filesystem writes. It is never triggered by importing the package or starting a session with an already discovered executable.

## Environment controls

The principal overrides are:

- `OBSIDIAN_BINARY` and `OBSIDIAN_CLI` for executable discovery;
- `E2E_OBSIDIAN_KEEP_VAULT=true` to preserve isolated state for debugging;
- `E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT` to select a fixed CDP port;
- `E2E_OBSIDIAN_USE_XVFB=false` to disable automatic headless Linux wrapping;
- `E2E_OBSIDIAN_CLEANUP_STALE_PROCESSES=false` to disable consumer-marker cleanup;
- `E2E_OBSIDIAN_CLI_TIMEOUT_MS`, `E2E_OBSIDIAN_CDP_TIMEOUT_MS`, `E2E_OBSIDIAN_TRUST_PROMPT_TIMEOUT_MS`, `E2E_OBSIDIAN_CATALOGUE_TIMEOUT_MS`, `E2E_OBSIDIAN_READY_TIMEOUT_MS`, and `E2E_OBSIDIAN_UI_IDLE_TIMEOUT_MS` to extend individual phases.

`E2E_OBSIDIAN_ARGS` replaces the complete default launch argument list. A high-level session still requires a remote-debugging argument and a vault-open target, so prefer the typed launch options unless a consumer deliberately owns the entire command line.

Real Obsidian execution is intentionally a local workflow and is not expected in normal CI.
