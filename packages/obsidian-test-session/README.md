# @vrtmrz/obsidian-test-session

Local, real-Obsidian test infrastructure for plug-in consumers. It creates isolated Vault and application state, installs built plug-in artefacts, launches Obsidian, completes plug-in bootstrap, and exposes the active Electron renderer through Playwright.

The package owns generic session infrastructure only. Plug-in settings, fixtures, commands, databases, selectors, workflows, and assertions remain consumer-owned.

It is used by maintained TagFolder, DiffZip, Screwdriver, and Self-hosted LiveSync E2E suites. See [Proven in maintained consumers](https://github.com/vrtmrz/fancy-kit/blob/main/docs/proven-in-use.md) for what the shared session proves and what each consumer still verifies for itself.

> [!IMPORTANT]
> This package is in initial `0.x` development. npm's normal compatible range accepts patch releases but not the next minor release. Commit the lockfile for repeatable installations; use `--save-exact` when every upgrade must be reviewed explicitly. It is development tooling and must not be bundled into an Obsidian plug-in.

```bash
npm install -D @vrtmrz/obsidian-test-session playwright @types/node
```

The package has one ESM entry point:

```ts
import {
  createTemporaryVault,
  startObsidianPluginSession,
  withObsidianPage,
} from "@vrtmrz/obsidian-test-session";
```

## Requirements and support boundary

- Node.js 20 or later;
- consumer-installed `playwright` and `@types/node` 20 or later;
- a local Obsidian executable and the matching `obsidian-cli`; and
- a local test environment that can launch Electron and connect to its remote-debugging port.

Executable discovery is implemented for Linux, macOS, and Windows. This project exercises complete real-Obsidian sessions on Linux and macOS; Windows discovery exists but the end-to-end workflow remains unverified. Automated AppImage download and optional `xvfb-run` wrapping are Linux-specific.

Set `OBSIDIAN_BINARY` and `OBSIDIAN_CLI` when the executables are outside the built-in discovery paths. Importing the package has no side effects. AppImage download, Vault creation, artefact installation, process launch, and cleanup occur only through explicit calls.

## Start an isolated plug-in session

```ts
import {
  createTemporaryVault,
  requireObsidianBinary,
  requireObsidianCli,
  startObsidianPluginSession,
  withObsidianPage,
  type ObsidianPluginSession,
} from "@vrtmrz/obsidian-test-session";

const vault = await createTemporaryVault({
  prefix: "example-plugin-e2e-",
  pluginIds: ["example-plugin"],
});

let session: ObsidianPluginSession | undefined;
try {
  session = await startObsidianPluginSession({
    binary: requireObsidianBinary(),
    cliBinary: requireObsidianCli(),
    vault,
    pluginId: "example-plugin",
    artifactRoot: "dist/example-plugin",
    pluginData: { mode: "automation" },
    localStorageEntries: {
      "example-plugin-device-schema": "3",
    },
  });

  await withObsidianPage(session.remoteDebuggingPort, async (page) => {
    await page.getByRole("button", { name: "Run example" }).click();
    await page.getByText("Example complete").waitFor();
  });
} finally {
  await session?.app.stop();
  await vault.dispose();
}
```

The high-level session installs `main.js`, `manifest.json`, and optional `styles.css`, writes `pluginData` as `data.json` when supplied, launches an isolated Obsidian profile, seeds any exact `localStorageEntries`, opens the exact Vault, enables and reloads the plug-in, and waits for renderer readiness. A failed bootstrap stops the launched process. After a successful start, the caller owns `session.app.stop()` and `vault.dispose()`.

`pluginData` is optional. Omitting it preserves an existing `data.json`; supplying it writes deterministic consumer-owned data before Obsidian starts.

`localStorageEntries` is also optional. It writes exact string keys and values to the session's isolated renderer before the plug-in is enabled. Use it only for consumer-owned device-local state which must exist on first load, such as an acknowledged schema marker. The package does not derive keys, serialise values, or copy state from the user's real Obsidian profile.

## Inspect layout

The package provides composable assertions for a consumer-selected Playwright locator:

```ts
import {
  assertLocatorHasMinimumTouchTarget,
  assertLocatorWithinSafeArea,
  assertLocatorWithinViewport,
  assertNoHorizontalOverflow,
} from "@vrtmrz/obsidian-test-session";

await withObsidianPage(session.remoteDebuggingPort, async (page) => {
  const actions = page.locator('[data-testid="backup-actions"]');
  await actions.scrollIntoViewIfNeeded();

  await assertLocatorWithinViewport(page, actions);
  await assertNoHorizontalOverflow(page, actions);
  await assertLocatorWithinSafeArea(page, actions);
  await assertLocatorHasMinimumTouchTarget(page, actions);
});
```

The helpers measure and assert; they do not scroll, resize, click, take screenshots, or choose plug-in-specific selectors. The touch-target default is a practical 44 by 44 CSS-pixel review policy and can be overridden by the consumer. It is not a claim that every platform or standard requires that value.

When a desktop test calls Obsidian's `app.emulateMobile(true)`, treat the renderer as a different platform mode rather than only a narrow viewport. Obsidian may change platform-dependent command registration, so perform later fixture setup and interaction through `withObsidianPage`; do not assume that CLI `eval` remains available. See the usage guide for the complete switch-and-wait sequence and its limits.

For the full session lifecycle, lower-level APIs, safe-area measurements, environment controls, and the tests and consumers behind the documented contracts, see the [usage guide](https://github.com/vrtmrz/fancy-kit/blob/main/packages/obsidian-test-session/docs/usage-guide.md). See [updates](updates.md) for release changes.
