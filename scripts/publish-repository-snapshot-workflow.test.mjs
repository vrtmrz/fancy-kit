import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  new URL("../.github/workflows/publish-repository-snapshot.yml", import.meta.url),
  "utf8",
);

test("allows GitHub to select the latest normal repository snapshot", () => {
  assert.match(workflow, /gh release create/);
  assert.doesNotMatch(workflow, /--latest=false/);
  assert.doesNotMatch(workflow, /--prerelease/);
});
