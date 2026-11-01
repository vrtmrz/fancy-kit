[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / createScreenWakeLockManager

# Function: createScreenWakeLockManager()

```ts
function createScreenWakeLockManager(
  options?: ScreenWakeLockManagerOptions,
): ScreenWakeLockManager;
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:243

Creates a reference-counted screen wake-lock manager.

Browser globals are resolved only when this function is called, so importing
this module is safe in Node.js and other non-browser runtimes. A screen wake
lock prevents display sleep only while the user agent permits it; it does not
guarantee background execution or prevent operating-system suspension.
Dispose the returned manager when its owning application or plug-in unloads.

## Parameters

| Parameter | Type                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `options` | [`ScreenWakeLockManagerOptions`](../ScreenWakeLockManagerOptions/README.md) |

## Returns

[`ScreenWakeLockManager`](../ScreenWakeLockManager/README.md)

## Examples

**Recommended closure-based usage**

```ts
import { createScreenWakeLockManager } from "octagonal-wheels/browser/wakeLock";

const wakeLock = createScreenWakeLockManager();

await wakeLock.run(async () => {
  await createBackup();
});

await wakeLock.dispose();
```

**Explicit lease for a bounded split lifecycle**

```ts
async function keepForegroundSyncAwake(signal: AbortSignal) {
  const lease = await wakeLock.acquire({ signal, label: "foreground-sync" });

  try {
    await runForegroundSync();
  } finally {
    await lease.dispose();
  }
}
```
