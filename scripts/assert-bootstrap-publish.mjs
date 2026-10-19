import { fileURLToPath } from "node:url";

export function assertBootstrapPublish(environment = process.env) {
  const packageName = environment.npm_package_name ?? "unknown package";
  if (packageName === "octagonal-wheels") {
    throw new Error("octagonal-wheels must be staged by the protected npm workflow from Fancy Kit");
  }
  throw new Error(`${packageName} cannot be published directly; stage a verified tarball for a new package or use the protected npm workflow`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    assertBootstrapPublish();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
