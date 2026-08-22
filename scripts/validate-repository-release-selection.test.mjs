import assert from "node:assert/strict";
import test from "node:test";

import {
  isRepositoryReleaseVersion,
  validateRepositoryReleaseSelection,
} from "./validate-repository-release-selection.mjs";

const sha = "a".repeat(40);
const base = {
  version: "2026.08.22.1",
  expectedSha: sha,
  actualSha: sha,
  ref: "refs/heads/main",
  confirmation: `release fancy-kit@2026.08.22.1 from ${sha}`,
};

test("accepts a repository snapshot selected from an exact main commit", () => {
  assert.deepEqual(validateRepositoryReleaseSelection(base), {
    tag: "fancy-kit-2026.08.22.1",
    requiredConfirmation: base.confirmation,
  });
});

test("accepts valid calendar dates and positive sequences", () => {
  for (const version of [
    "2024.02.29.1",
    "2026.01.01.2",
    "9999.12.31.999",
  ]) {
    assert.equal(isRepositoryReleaseVersion(version), true, version);
  }
});

test("rejects malformed versions and impossible calendar dates", () => {
  for (const version of [
    "2026.8.22.1",
    "2026.08.22",
    "2026.08.22.0",
    "2026.08.22.01",
    "0000.01.01.1",
    "2023.02.29.1",
    "2026.04.31.1",
    "2026.13.01.1",
  ]) {
    assert.equal(isRepositoryReleaseVersion(version), false, version);
    assert.throws(
      () => validateRepositoryReleaseSelection({ ...base, version }),
      /Invalid repository snapshot version/,
    );
  }
});

test("requires a full lowercase commit SHA", () => {
  for (const expectedSha of ["a".repeat(39), "A".repeat(40), "g".repeat(40)]) {
    assert.throws(
      () => validateRepositoryReleaseSelection({ ...base, expectedSha }),
      /40 lowercase hexadecimal characters/,
    );
  }
});

test("requires the workflow to run from the selected main commit", () => {
  assert.throws(
    () => validateRepositoryReleaseSelection({ ...base, ref: "refs/heads/topic" }),
    /must run from main/,
  );
  assert.throws(
    () => validateRepositoryReleaseSelection({ ...base, actualSha: "b".repeat(40) }),
    /workflow is running/,
  );
});

test("requires the exact release confirmation", () => {
  assert.throws(
    () => validateRepositoryReleaseSelection({ ...base, confirmation: "release" }),
    new RegExp(`Confirmation must be exactly: ${base.confirmation}`),
  );
});
