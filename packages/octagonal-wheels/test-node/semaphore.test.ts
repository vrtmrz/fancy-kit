import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("semaphore scopes import without host globals and release real queued permits", () => {
    const fixture = readFileSync(
        new URL("../../../test/packed-consumer/semaphore-runtime.mjs", import.meta.url),
        "utf8"
    );
    const moduleUrl = new URL("../src/concurrency/semaphore.ts", import.meta.url).href;
    const scenario = fixture.replace(
        JSON.stringify("octagonal-wheels/concurrency/semaphore"),
        JSON.stringify(moduleUrl)
    );
    assert.notEqual(scenario, fixture);
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", scenario], {
        encoding: "utf8",
        timeout: 10_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
});
