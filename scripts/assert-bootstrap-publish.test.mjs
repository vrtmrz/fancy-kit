import assert from "node:assert/strict";
import test from "node:test";

import { assertBootstrapPublish } from "./assert-bootstrap-publish.mjs";

const legacyBootstrap = {
  FANCY_KIT_BOOTSTRAP_PUBLISH: "1",
  npm_package_name: "@vrtmrz/ui-interactions",
  npm_package_version: "0.1.0-rc.0",
  npm_config_tag: "next",
};

test("rejects direct prerelease publication with the legacy flag and next tag", () => {
  assert.throws(
    () => assertBootstrapPublish(legacyBootstrap),
    /stage a verified tarball.*protected npm workflow/,
  );
});

test("rejects direct prerelease publication with the legacy flag and latest tag", () => {
  assert.throws(
    () => assertBootstrapPublish({ ...legacyBootstrap, npm_config_tag: "latest" }),
    /stage a verified tarball.*protected npm workflow/,
  );
});

test("rejects ordinary manual publication", () => {
  assert.throws(
    () => assertBootstrapPublish({ ...legacyBootstrap, FANCY_KIT_BOOTSTRAP_PUBLISH: undefined }),
    /stage a verified tarball.*protected npm workflow/,
  );
});

for (const tag of ["next", "latest"]) {
  test(`rejects direct stable publication with the legacy flag and ${tag} tag`, () => {
    assert.throws(
      () => assertBootstrapPublish({ ...legacyBootstrap, npm_package_version: "0.1.0", npm_config_tag: tag }),
      /stage a verified tarball.*protected npm workflow/,
    );
  });
}

test("requires octagonal-wheels to use the protected staged workflow", () => {
  assert.throws(
    () => assertBootstrapPublish({ ...legacyBootstrap, npm_package_name: "octagonal-wheels", npm_package_version: "0.1.48-preview.0" }),
    /protected npm workflow/,
  );
});
