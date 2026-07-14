import { spawn } from "node:child_process";

const steps = [
  "smoke.ts",
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
    const child = spawn(command, args, { cwd: process.cwd(), env: process.env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} failed with ${signal ?? `exit code ${code}`}`));
    });
  });
}

async function main(): Promise<void> {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  await run(npm, ["run", "build:harness"]);
  for (const step of steps) {
    console.log(`\n# ${step}`);
    await run(npx, ["tsx", `test/e2e-obsidian/scripts/${step}`]);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
