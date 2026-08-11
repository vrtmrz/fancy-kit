import { spawn } from "node:child_process";
import {
  obsidianE2EVersionPolicy,
  selectObsidianVersion,
} from "@vrtmrz/obsidian-test-session";

const steps = [
  "session-lifecycle.ts",
  "smoke.ts",
  "profile-restart.ts",
  "modes.ts",
  "dialogs.ts",
  "progress.ts",
  "notices.ts",
  "frontmatter.ts",
  "contracts.ts",
  "mobile.ts",
];

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${command} failed with ${signal ?? `exit code ${code}`}`),
        );
    });
  });
}

async function main(): Promise<void> {
  const versionPolicy = obsidianE2EVersionPolicy();
  const requireValidated = process.argv.includes("--validated");
  if (requireValidated && versionPolicy.allowUnverifiedVersion) {
    throw new Error(
      "The validated Obsidian E2E suite does not permit E2E_OBSIDIAN_ALLOW_UNVERIFIED_VERSION=true",
    );
  }
  const target = versionPolicy.expectedVersion
    ? selectObsidianVersion(
        versionPolicy.expectedVersion,
        versionPolicy.allowUnverifiedVersion,
      )
    : undefined;
  console.log(
    JSON.stringify({
      event: "obsidian-e2e-target",
      requestedVersion: target?.version ?? null,
      support: target?.support ?? "observed-at-runtime",
      validatedSuite: requireValidated,
    }),
  );
  if (target?.support === "unverified") {
    console.warn(
      `Warning: Obsidian ${target.version} is not in the validated E2E release catalogue. A passing probe does not establish supported-version status.`,
    );
  }
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  await run(npm, ["run", "build:harness"]);
  for (const step of steps) {
    console.log(`\n# ${step}`);
    await run(npx, ["tsx", `test/e2e-obsidian/scripts/${step}`]);
  }
  console.log(
    JSON.stringify({
      event: "obsidian-e2e-result",
      requestedVersion: target?.version ?? null,
      support: target?.support ?? "observed-at-runtime",
      suite: "passed",
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
