# Usage guide

`@vrtmrz/obsidian-test-session` provides a reusable boundary around local Obsidian process, Vault, CLI, CDP, and Playwright setup. It is intended for development and end-to-end tests, not plug-in runtime bundles or hosted browser tests.

## Public API areas

All public APIs are exported from `@vrtmrz/obsidian-test-session`:

| Area                          | Principal APIs                                                                                 | Responsibility                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Executable discovery          | `discoverObsidianBinary`, `requireObsidianBinary`, `discoverObsidianCli`, `requireObsidianCli` | Resolve explicit environment overrides or known platform paths.                                                 |
| Linux AppImage preparation    | `obsidianAppImageArchitecture`, `obsidianAppImageUrl`, `installObsidianAppImage`               | Select, download, and optionally extract an Obsidian AppImage through an explicit call.                         |
| Isolated state                | `createTemporaryVault`                                                                         | Create a temporary Vault, isolated profile directories, Vault registry, process marker, and disposal operation. |
| Artefact installation         | `installBuiltPlugin`                                                                           | Copy the required built plug-in artefacts and optional data into one Vault.                                     |
| Process lifecycle             | `cleanupStaleObsidianE2EProcesses`, `launchObsidian`                                           | Launch and stop an isolated Obsidian process tree, with optional Linux `xvfb-run`.                              |
| CLI operations                | `runObsidianCli`, `openVaultWithObsidianCli`, `evalObsidianJson`                               | Run the selected CLI in the isolated profile environment.                                                       |
| High-level composition        | `startObsidianPluginSession`                                                                   | Install, launch, open, trust, enable, reload, and await one plug-in.                                            |
| Renderer access and readiness | `withObsidianPage`, `waitForObsidianVault`, `waitForPluginReady`, and related helpers          | Connect to the active Electron renderer and coordinate generic bootstrap phases.                                |
| Layout inspection             | `inspectLocatorLayout` and the four layout assertions                                          | Measure a consumer-selected locator against the viewport, safe area, content overflow, or minimum size.         |

Use `startObsidianPluginSession` for the standard sequence. The lower-level functions are public for consumers that deliberately own a different bootstrap order; they are not required for an ordinary session.

## Compose a consumer-owned session fixture

Keep the generic package result separate from the plug-in-specific helpers used by the test suite:

```ts
import { resolve } from "node:path";
import {
  createTemporaryVault,
  requireObsidianBinary,
  requireObsidianCli,
  startObsidianPluginSession,
  type ObsidianPluginSession,
  type TemporaryVault,
} from "@vrtmrz/obsidian-test-session";

interface ExampleTestSession {
  session: ObsidianPluginSession;
  vault: TemporaryVault;
}

export async function startExampleTestSession(): Promise<ExampleTestSession> {
  const vault = await createTemporaryVault({
    prefix: "example-plugin-e2e-",
    pluginIds: ["example-plugin"],
    idPrefix: "example-plugin-e2e",
  });

  try {
    const session = await startObsidianPluginSession({
      binary: requireObsidianBinary(),
      cliBinary: requireObsidianCli(),
      vault,
      pluginId: "example-plugin",
      artifactRoot: resolve("dist/example-plugin"),
      pluginData: { schemaVersion: 1, mode: "automation" },
      localStorageEntries: {
        "example-plugin-device-schema": "3",
      },
    });
    return { session, vault };
  } catch (error) {
    await vault.dispose();
    throw error;
  }
}

export async function stopExampleTestSession(
  testSession: ExampleTestSession,
): Promise<void> {
  await testSession.session.app.stop();
  await testSession.vault.dispose();
}
```

The package does not interpret `pluginData`. The consumer defines its schema, validates it inside the plug-in, and owns any one-shot request semantics. Omit `pluginData` to preserve an existing `data.json` in the destination.

Use `localStorageEntries` when deterministic device-local state must exist before the plug-in's first load. The keys and string values are written exactly as supplied to the isolated renderer profile. The consumer remains responsible for namespacing, serialisation, schema meaning, and avoiding credentials or state copied from a real profile.

## High-level bootstrap contract

`startObsidianPluginSession` performs these phases:

1. install `main.js`, `manifest.json`, and optional `styles.css` under the selected Vault;
2. optionally write the supplied JSON-serialisable `pluginData` to `data.json`;
3. select a remote-debugging port and launch Obsidian with the isolated profile directories;
4. pre-seed Vault trust state and any consumer-owned `localStorageEntries`, then ask `obsidian-cli` to open the Vault;
5. if CLI delivery fails, continue only when CDP confirms that the active renderer opened the exact isolated Vault path;
6. handle generic trust prompts, wait for the installed manifest, enable community plug-ins, reload the selected plug-in, and await readiness; and
7. wait for the start-up overlay to stop blocking interaction unless `waitForUiIdle` is `false`.

The result contains the process handle, remote-debugging port, isolated CLI environment, installed artefact details, plug-in identifier, and renderer-observed readiness. If a bootstrap phase fails after launch, the function stops the process and adds captured Obsidian output to the error. The caller must dispose both process and Vault after a successful return.

The package does not decide whether a consumer flow has passed. Use `withObsidianPage`, `session.cliEnv`, or another consumer-owned integration to execute commands and assertions.

## macOS process isolation

`createTemporaryVault` places both the Vault and the isolated application profile below `/tmp` on macOS. The ordinary macOS temporary directory can have a long `/var/folders/...` path; nesting an isolated HOME below it can exceed the Unix-domain socket path limit used by `obsidian-cli`. Other platforms retain the operating system's normal temporary root. A consumer can supply `temporaryRoot` when it owns another short, writable location.

The default `launchObsidian` arguments also include Chromium's `--use-mock-keychain` flag on macOS. This prevents the isolated HOME, which intentionally has no user login keychain, from opening a blocking system dialogue. The flag applies only to the test process and does not access or modify the user's keychain.

These defaults apply to both `startObsidianPluginSession` and direct `launchObsidian` calls. Supplying `E2E_OBSIDIAN_ARGS` replaces the complete argument list, including the macOS keychain flag, user-data directory, remote-debugging port, and Vault URI. A consumer which takes that low-level ownership must restore every argument its flow requires.

## Use explicit dependencies in tests

The public functions accept their important environment and runtime dependencies through arguments:

- discovery functions accept a `NodeJS.ProcessEnv`;
- CLI functions accept the executable, arguments or code, environment, and optional timeout;
- `launchObsidian` accepts paths, port, launch environment, and lifecycle controls;
- `startObsidianPluginSession` accepts the prepared Vault, executables, artefact root, optional plug-in data, exact local-storage entries, and environment overrides; and
- layout helpers accept a Playwright `Page` and consumer-selected `Locator`.

This keeps plug-in-specific fixtures and assertions outside the package and lets focused tests supply controlled paths, environments, and Playwright doubles. Process spawning and filesystem operations are real effects once their explicit functions are called; they are not in-memory test doubles.

## Install built plug-in artefacts

`installBuiltPlugin(vaultPath, options)` copies only:

- required `main.js` and `manifest.json`;
- optional `styles.css`; and
- generated `data.json` when `pluginData` is supplied.

It then writes the selected plug-in identifier to `community-plugins.json`. Missing required artefacts reject before a session is launched. `pluginData` must be JSON-serialisable. Supplying `undefined` leaves any existing `data.json` unchanged.

## Prepare a Linux AppImage explicitly

```ts
import { installObsidianAppImage } from "@vrtmrz/obsidian-test-session";

const prepared = await installObsidianAppImage({
  version: "1.12.7",
  architecture: "x86_64",
});

process.env.OBSIDIAN_BINARY = prepared.extractedBinary;
```

`installObsidianAppImage` is Linux-oriented and performs network and filesystem writes. It defaults to the package's currently tested Obsidian release, derives the official release URL unless one is supplied, reuses an existing download by default, and extracts unless `extract` is `false`. Pin `version` when a consumer needs repeatability.

Importing the package, discovering executables, and starting a session with an existing binary never call this function automatically.

## Inspect the active renderer

`withObsidianPage(port, callback)` connects Playwright to Electron's DevTools endpoint, selects the Obsidian renderer page, invokes the callback, and closes the browser connection afterwards. The page belongs to the callback; consumer code chooses selectors, commands, and assertions.

```ts
await withObsidianPage(session.remoteDebuggingPort, async (page) => {
  const runButton = page.getByRole("button", { name: "Run backup" });
  await runButton.click();
  await page.getByText("Backup complete").waitFor();
});
```

The lower-level readiness helpers are useful when a consumer owns a custom sequence. They expose generic operations such as exact Vault-path confirmation, trust-prompt handling, plug-in catalogue readiness, enable-and-reload, and start-up-overlay handling. They intentionally do not know consumer command identifiers, settings, or success state.

### Switch Obsidian into mobile mode

`app.emulateMobile(true)` changes Obsidian's platform mode as well as its CSS classes. It can alter platform-dependent command registration and plug-in behaviour; it is not equivalent to setting a small Playwright viewport. In particular, a CLI command such as `eval` which was available in desktop mode must not be assumed to remain available after the switch.

Invoke the Obsidian API through the active renderer, wait for both the body class and the plug-in to be ready, and then keep mobile-mode fixtures and interactions on the same renderer boundary:

```ts
await withObsidianPage(session.remoteDebuggingPort, async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const app = (
      globalThis as typeof globalThis & {
        app?: { emulateMobile?: (enabled: boolean) => void };
      }
    ).app;
    if (typeof app?.emulateMobile !== "function") {
      throw new Error("app.emulateMobile is unavailable");
    }
    app.emulateMobile(true);
  });
  await page.waitForFunction(() => {
    const app = (
      globalThis as typeof globalThis & {
        app?: { plugins?: { plugins: Record<string, unknown> } };
      }
    ).app;
    return (
      document.body.classList.contains("is-mobile") &&
      app?.plugins?.plugins["example-plugin"] !== undefined
    );
  });

  // Set consumer-owned fixtures, interact, and inspect layout here.
});
```

Prepare data through the CLI before entering mobile mode when that is sufficient. If a later step genuinely needs a desktop-only CLI command, call `app.emulateMobile(false)`, restore the desktop viewport, wait for `is-mobile` to clear and the plug-in to remain ready, and only then retry the command. A desktop emulation run still does not prove native operating-system overlays, suspension, keyboard, or safe-area behaviour; retain a focused real-device review for those boundaries.

## Compose layout assertions

`inspectLocatorLayout` returns one `LocatorLayoutInspection` containing:

- the visible bounding box, or `null` when none is available;
- viewport width and height;
- horizontal and vertical viewport overflow;
- content overflow based on scroll and client dimensions;
- effective top, right, bottom, and left safe-area insets; and
- overflow into each safe-area edge.

The assertions retry transient layouts and return the final inspection:

| Assertion                            | Contract                                                                                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assertLocatorWithinViewport`        | The visible bounding box remains within the selected viewport axes.                                                                                   |
| `assertNoHorizontalOverflow`         | The locator remains horizontally inside the viewport and its content does not require horizontal scrolling. Legitimate vertical scrolling is allowed. |
| `assertLocatorWithinSafeArea`        | The visible bounding box remains outside the effective unsafe insets on the selected axes.                                                            |
| `assertLocatorHasMinimumTouchTarget` | The visible bounding box meets the selected minimum width and height. Both default to 44 CSS pixels.                                                  |

Configure `timeoutMs`, `pollIntervalMs`, `tolerancePx`, and the diagnostic `label` when defaults do not suit the component. Viewport and safe-area assertions accept `axes: "horizontal"`, `"vertical"`, or `"both"`.

### Safe-area overrides

The inspection reads inherited Obsidian `--safe-area-inset-*` custom properties, then browser `env(safe-area-inset-*)` values. Desktop mobile emulation often reports zero hardware insets. Supply logical CSS-pixel values with the matching logical viewport when a device profile requires deterministic insets:

```ts
await page.setViewportSize({ width: 390, height: 844 });

await assertLocatorWithinSafeArea(page, closeButton, {
  label: "note lookup close button",
  safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
});
```

An override replaces only the supplied edges. The helpers do not infer a larger hit area from pseudo-elements, prove that an element receives pointer events, detect operating-system overlays, scroll, resize, click, or scan descendants. Keep those interaction and policy checks in the consumer.

## Environment controls

The principal controls are:

| Variable                                                                                                                                        | Purpose                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `OBSIDIAN_BINARY`, `OBSIDIAN_CLI`                                                                                                               | Override executable discovery.                               |
| `E2E_OBSIDIAN_KEEP_VAULT=true`                                                                                                                  | Preserve the isolated Vault and profile state for debugging. |
| `E2E_OBSIDIAN_REMOTE_DEBUGGING_PORT`                                                                                                            | Select a fixed CDP port.                                     |
| `E2E_OBSIDIAN_USE_XVFB=false`                                                                                                                   | Disable automatic headless Linux `xvfb-run` wrapping.        |
| `E2E_OBSIDIAN_CLEANUP_STALE_PROCESSES=false`                                                                                                    | Disable consumer-marker stale-process cleanup.               |
| `E2E_OBSIDIAN_ARGS`                                                                                                                             | Replace the complete default Obsidian argument list.         |
| `E2E_OBSIDIAN_CLI_TIMEOUT_MS`, `E2E_OBSIDIAN_CLI_READY_TIMEOUT_MS`                                                                              | Adjust CLI process and socket readiness timeouts.            |
| `E2E_OBSIDIAN_CDP_TIMEOUT_MS`, `E2E_OBSIDIAN_VAULT_TIMEOUT_MS`                                                                                  | Adjust renderer connection and Vault confirmation timeouts.  |
| `E2E_OBSIDIAN_TRUST_PROMPT_TIMEOUT_MS`, `E2E_OBSIDIAN_CATALOGUE_TIMEOUT_MS`, `E2E_OBSIDIAN_READY_TIMEOUT_MS`, `E2E_OBSIDIAN_UI_IDLE_TIMEOUT_MS` | Adjust individual bootstrap phases.                          |

`E2E_OBSIDIAN_ARGS` transfers ownership of the complete launch argument list to the consumer. A high-level session still needs a reachable remote-debugging endpoint and the intended Vault in order for later bootstrap phases to succeed, so prefer the typed options unless a test deliberately controls every argument.

Real Obsidian execution is a local workflow and is not expected in ordinary CI.

## Contract evidence and consumers

| Public area                                                                             | Focused evidence                                                                          | Maintained consumer                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Executable discovery and explicit overrides                                             | [`src/environment.test.ts`](../src/environment.test.ts)                                   | High-level harness fixture in [`test/e2e-obsidian/runner/harness.ts`](../../../test/e2e-obsidian/runner/harness.ts)                                                                                                       |
| AppImage architecture and release URL selection                                         | [`src/appimage.test.ts`](../src/appimage.test.ts)                                         | [`test/e2e-obsidian/scripts/install-appimage.ts`](../../../test/e2e-obsidian/scripts/install-appimage.ts)                                                                                                                 |
| Isolated Vault/profile creation and disposal                                            | [`src/vault.test.ts`](../src/vault.test.ts)                                               | [`test/e2e-obsidian/runner/harness.ts`](../../../test/e2e-obsidian/runner/harness.ts)                                                                                                                                     |
| Required and optional artefacts, plug-in data, and preservation                         | [`src/plugin-installer.test.ts`](../src/plugin-installer.test.ts)                         | High-level session composition in [`src/session.ts`](../src/session.ts)                                                                                                                                                   |
| CLI socket readiness and Vault opening                                                  | [`src/cli.test.ts`](../src/cli.test.ts)                                                   | High-level session bootstrap in [`src/session.ts`](../src/session.ts)                                                                                                                                                     |
| Exact active-Vault confirmation, pre-enable local-storage seeding, and UI-idle handling | [`src/session.test.ts`](../src/session.test.ts) and [`src/ui.test.ts`](../src/ui.test.ts) | Real-Obsidian harness scripts under [`test/e2e-obsidian/scripts`](../../../test/e2e-obsidian/scripts)                                                                                                                     |
| Layout measurements, retry behaviour, safe areas, and touch targets                     | [`src/layout.test.ts`](../src/layout.test.ts)                                             | [`test/e2e-obsidian/scripts/mobile.ts`](../../../test/e2e-obsidian/scripts/mobile.ts) and the packed-consumer fixture [`test/packed-consumer/test-session-usage.ts`](../../../test/packed-consumer/test-session-usage.ts) |

Focused tests establish package-owned logic with controlled collaborators. The repository's real-Obsidian scripts exercise the remaining Electron, Obsidian, process, and platform integration. Consumer-specific workflows still require their own assertions.

The macOS temporary-root and launch-argument policies are covered by [`src/platform.test.ts`](../src/platform.test.ts), while the explicit temporary-root override is covered by [`src/vault.test.ts`](../src/vault.test.ts).

Maintained TagFolder, DiffZip, Screwdriver, and Self-hosted LiveSync suites use this division in their own repositories. [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md) links their session composition and domain-specific scenarios so that a new consumer can follow an application example rather than treating the internal Harness as the only integration model.
