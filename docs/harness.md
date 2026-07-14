# Harness architecture

`apps/obsidian-harness` is the public Obsidian application used for component exploration, guided real-device review, and the repository's real Obsidian E2E suite. It is built from current workspace source and is not an npm-package consumption test. Package exports, declarations, tree-shaking, and tarball installation remain the responsibility of packed-consumer checks.

The application has one plug-in ID, `fancy-kit-harness`, and three start-up modes:

| Mode | Purpose | Behaviour |
| --- | --- | --- |
| `review` | Manual BRAT and real-device review | Emphasises selectable contract scenarios and guided instructions. |
| `showcase` | Component exploration | Emphasises individual UI stories while retaining review controls. |
| `automation` | Isolated E2E sessions | Suppresses first-run selection and enables deterministic automation commands. It does not run tests merely by being selected. |

When no mode is stored, the plug-in asks after the Obsidian layout is ready. The selected value is saved through the normal Obsidian plug-in `data.json`. The settings tab can return the plug-in to the unselected state.

## One-shot automation requests

`@vrtmrz/obsidian-test-session` accepts an optional `pluginData` value and writes it before Obsidian starts. A consumer can select Automation mode and provide one pending scenario request:

```json
{
  "schemaVersion": 1,
  "mode": "automation",
  "pendingRun": {
    "requestId": "e2e-20260714-001",
    "scenarios": [
      "vault-text",
      "vault-frontmatter",
      "wake-lock-nested"
    ]
  }
}
```

Loading the plug-in validates the request but does not consume or start it. After Obsidian and the external driver are ready, `startPendingRun()` performs this sequence:

1. require Automation mode, a valid request, and an idle runner;
2. remove `pendingRun` from `data.json` and wait for that save to succeed;
3. record the request ID in memory and run the selected scenarios;
4. expose completion and scenario results under the same request ID.

Consuming before execution prevents an Obsidian reload from repeating Vault operations. Saving failure prevents execution. An unknown scenario leaves the original request unconsumed so the producer can correct it. The persistent Automation mode prevents a first-run prompt after a test-driven reload; the isolated Vault is disposed by the session owner.

Treat this data as a narrow declarative request, not a command channel. Do not accept arbitrary code, command IDs, paths, credentials, or scenario input values through it.

## Safety and ownership

- Every Vault scenario owns one unique fixture root and removes it in a `finally` block.
- Automation mode never relaxes fixture containment or cleanup.
- A mode or pending request never starts work before an explicit UI or driver action.
- Password story results are reduced to a non-secret completion marker.
- Copied reports omit Vault identity, existing content, and user-entered secrets.
- Internal E2E commands are available only while Automation mode is active.

The component showcase and review runner share the same runtime APIs and binary. Keep visual stories safe enough for the public harness. Put deliberately malformed platform hosts, injected failures, and App-free edge cases in unit or contract tests instead.

## Distribution boundary

The Fancy Kit repository cannot itself be a conventional BRAT plug-in repository because its root represents an npm monorepo. `npm run release:prepare:harness` builds the application and creates a distribution directory containing:

- `main.js`, `manifest.json`, and `styles.css` for the GitHub release;
- `versions.json` for the BRAT-compatible mirror root;
- `SOURCE.json` with the exact Fancy Kit commit and dirty-worktree flag; and
- `SHA256SUMS` for all generated metadata and assets.

Only release assets rebuilt from the reviewed clean source commit are suitable for the public mirror. The mirror owns BRAT tags and release metadata; Fancy Kit remains the only source location.
