import { fileURLToPath } from "node:url";

const versionPattern = /^(\d{4})\.(\d{2})\.(\d{2})\.([1-9]\d*)$/;

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isRepositoryReleaseVersion(version) {
  const match = versionPattern.exec(version);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0 || month < 1 || month > 12) return false;

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysInMonth[month - 1];
}

export function validateRepositoryReleaseSelection({
  version,
  expectedSha,
  actualSha,
  ref,
  confirmation,
}) {
  if (!isRepositoryReleaseVersion(version)) {
    throw new Error(
      `Invalid repository snapshot version: ${version}; expected YYYY.MM.DD.N with a real calendar date and a positive sequence`,
    );
  }
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
    throw new Error("Expected SHA must contain 40 lowercase hexadecimal characters");
  }
  if (ref !== "refs/heads/main") {
    throw new Error(`Repository snapshot releases must run from main, not ${ref}`);
  }
  if (expectedSha !== actualSha) {
    throw new Error(
      `Expected commit ${expectedSha}, but the workflow is running ${actualSha}`,
    );
  }

  const requiredConfirmation = `release fancy-kit@${version} from ${expectedSha}`;
  if (confirmation !== requiredConfirmation) {
    throw new Error(`Confirmation must be exactly: ${requiredConfirmation}`);
  }

  return {
    tag: `fancy-kit-${version}`,
    requiredConfirmation,
  };
}

function main() {
  const [version, expectedSha, actualSha, ref, confirmation] = process.argv.slice(2);
  if (process.argv.slice(2).length !== 5) {
    throw new Error(
      "Usage: node scripts/validate-repository-release-selection.mjs <version> <expected-sha> <actual-sha> <ref> <confirmation>",
    );
  }

  const result = validateRepositoryReleaseSelection({
    version,
    expectedSha,
    actualSha,
    ref,
    confirmation,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
