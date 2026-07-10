export function assertBootstrapPublish(environment = process.env) {
  const packageName = environment.npm_package_name ?? "unknown package";
  const version = environment.npm_package_version ?? "unknown version";
  if (packageName === "octagonal-wheels") {
    throw new Error("octagonal-wheels must be staged by the protected npm workflow from Fancy Kit");
  }
  if (environment.FANCY_KIT_BOOTSTRAP_PUBLISH !== "1") {
    throw new Error(`${packageName} must be staged by the protected npm workflow; set FANCY_KIT_BOOTSTRAP_PUBLISH=1 only for the one-off interactive bootstrap`);
  }
  if (!/-[0-9A-Za-z.-]+$/.test(version)) throw new Error(`Bootstrap publication requires a prerelease version, not ${version}`);
  if (environment.npm_config_tag !== "next") throw new Error("Bootstrap publication requires --tag next");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    assertBootstrapPublish();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
import { fileURLToPath } from "node:url";
