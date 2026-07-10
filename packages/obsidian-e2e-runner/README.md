# Obsidian E2E Runner

`@vrtmrz/obsidian-e2e-runner` provides local, real-Obsidian E2E session infrastructure for plug-in consumers.

It creates isolated vault and application state, installs built plug-in artefacts, launches Obsidian, opens the vault through `obsidian-cli`, and uses Playwright over the active Electron renderer for plug-in bootstrap and UI readiness.

The package owns only generic test infrastructure. Consumer workflows, fixtures, assertions, settings, databases, and synchronisation remain consumer-owned.

> [!NOTE]
> This package is under initial development and is not yet published. It is development tooling and must not be bundled into an Obsidian plug-in.

## Requirements

- Node.js 20 or later;
- `playwright` installed by the consumer;
- a local Obsidian executable and the matching `obsidian-cli`;
- Linux, macOS, or Windows for executable discovery. Automated AppImage download and headless `xvfb-run` support are Linux-specific.

Set `OBSIDIAN_BINARY` and `OBSIDIAN_CLI` when the executables are outside the built-in discovery paths. Importing the package has no side effects: downloading, extracting, and launching Obsidian require explicit function calls.

The real-Obsidian session and E2E workflows are currently validated on Linux only. macOS and Windows executable discovery paths are implemented but have not been exercised by this project, so they should be treated as unverified rather than supported platforms until consumer smoke tests cover them.

## Example

```ts
import {
  createTemporaryVault,
  discoverObsidianCli,
  requireObsidianBinary,
  startObsidianPluginSession,
  type ObsidianPluginSession,
} from "@vrtmrz/obsidian-e2e-runner";

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
  });

  // Run consumer-owned assertions through session.remoteDebuggingPort.
} finally {
  await session?.app.stop();
  await vault.dispose();
}
```

`startObsidianPluginSession` stops a process whose bootstrap fails. After a successful start, the caller owns both `session.app.stop()` and `vault.dispose()` as shown above.

## Session boundary

The high-level session installs built plug-in artefacts, launches an isolated Obsidian process, pre-seeds vault trust, opens the vault through the CLI, enables and reloads the plug-in through CDP, and waits for readiness. It returns:

- `remoteDebuggingPort` for consumer-owned Playwright operations;
- `cliEnv` for consumer-owned `obsidian-cli eval` or other CLI commands;
- readiness and installed artefact details;
- the process lifecycle handle.

Use the lower-level exports only when a consumer needs a different bootstrap sequence. Keep plug-in-specific settings, databases, commands, stories, and assertions outside this package.

## Preparing a Linux AppImage

Linux consumers can explicitly download and extract a supported Obsidian AppImage. The version defaults to the runner's currently tested release and should be pinned by a consumer that requires repeatability.

```ts
import { installObsidianAppImage } from "@vrtmrz/obsidian-e2e-runner";

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
