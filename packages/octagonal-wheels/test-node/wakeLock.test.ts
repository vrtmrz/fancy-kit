import assert from "node:assert/strict";
import { test } from "node:test";
import { createScreenWakeLockManager } from "../src/browser/wakeLock.ts";

test("the browser wake-lock module is safe to import and use without DOM globals", async () => {
    const manager = createScreenWakeLockManager();

    assert.equal(manager.supported, false);
    assert.equal(await manager.run(() => "node"), "node");
    await manager.dispose();
});
