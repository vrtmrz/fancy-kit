# Obsidian E2E Runner

`@vrtmrz/obsidian-e2e-runner` provides local, real-Obsidian E2E session infrastructure for plug-in consumers.

It creates isolated vault and application state, installs built plug-in artefacts, launches Obsidian, opens the vault through `obsidian-cli`, and uses Playwright over the active Electron renderer for plug-in bootstrap and UI readiness.

The package owns only generic test infrastructure. Consumer workflows, fixtures, assertions, settings, databases, and synchronisation remain consumer-owned.

## Example

```ts
import {
  createTemporaryVault,
  discoverObsidianCli,
  requireObsidianBinary,
  startObsidianPluginSession,
} from "@vrtmrz/obsidian-e2e-runner";

const vault = await createTemporaryVault({
  prefix: "example-plugin-e2e-",
  pluginIds: ["example-plugin"],
});
const cli = discoverObsidianCli();
if (!cli.binary) throw new Error("obsidian-cli is required");

const session = await startObsidianPluginSession({
  binary: requireObsidianBinary(),
  cliBinary: cli.binary,
  vault,
  pluginId: "example-plugin",
  artifactRoot: "dist/example-plugin",
});

try {
  // Run consumer-owned assertions through session.remoteDebuggingPort.
} finally {
  await session.app.stop();
  await vault.dispose();
}
```

Real Obsidian execution is intentionally a local workflow. Merely importing this package does not download or launch Obsidian.
