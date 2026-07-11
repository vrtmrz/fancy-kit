import assert from "node:assert/strict";
import test from "node:test";

import { assertBootstrapPublish } from "./assert-bootstrap-publish.mjs";

const allowed = {
  FANCY_KIT_BOOTSTRAP_PUBLISH: "1",
  npm_package_name: "@vrtmrz/ui-interactions",
  npm_package_version: "0.1.0-rc.0",
  npm_config_tag: "next",
};

test("allows the explicit prerelease bootstrap on next", () => {
  assert.doesNotThrow(() => assertBootstrapPublish(allowed));
});

test("rejects ordinary manual publication", () => {
  assert.throws(() => assertBootstrapPublish({ ...allowed, FANCY_KIT_BOOTSTRAP_PUBLISH: undefined }), /protected npm workflow/);
});

test("rejects a stable bootstrap and the latest dist-tag", () => {
  assert.throws(() => assertBootstrapPublish({ ...allowed, npm_package_version: "0.1.0" }), /prerelease version/);
  assert.throws(() => assertBootstrapPublish({ ...allowed, npm_config_tag: "latest" }), /--tag next/);
});

test("requires octagonal-wheels to use the protected staged workflow", () => {
  assert.throws(
    () => assertBootstrapPublish({ ...allowed, npm_package_name: "octagonal-wheels", npm_package_version: "0.1.48-preview.0" }),
    /protected npm workflow/,
  );
});
