import { get } from "node:https";
import { basename } from "node:path";

/** Supported Obsidian AppImage architecture names. */
export type ObsidianAppImageArchitecture = "arm64" | "x86_64";

/** Whether the selected Obsidian release is part of the reviewed E2E matrix. */
export type ObsidianReleaseSupport = "validated" | "unverified";

/** Origin of a resolved AppImage asset. */
export type ObsidianAppImageAssetSource =
  | "validated-catalogue"
  | "github-release"
  | "url-override";

/** One immutable AppImage asset in the validated release catalogue. */
export interface ValidatedObsidianAppImageAsset {
  /** Exact GitHub Release asset name. */
  name: string;
  /** Reviewed SHA-256 digest without an algorithm prefix. */
  sha256: string;
}

/** One Obsidian release whose real-application E2E coverage has been reviewed. */
export interface ValidatedObsidianRelease {
  /** Exact release tag. */
  tag: string;
  /** Reviewed Linux AppImage assets by architecture. */
  appImages: Readonly<
    Record<ObsidianAppImageArchitecture, ValidatedObsidianAppImageAsset>
  >;
}

/** Default release used by managed local E2E sessions. */
export const DEFAULT_VALIDATED_OBSIDIAN_VERSION = "1.13.6";

/** Releases currently covered by the reviewed real-Obsidian E2E matrix. */
export const VALIDATED_OBSIDIAN_RELEASES: Readonly<
  Record<string, ValidatedObsidianRelease>
> = {
  "1.12.7": {
    tag: "v1.12.7",
    appImages: {
      arm64: {
        name: "Obsidian-1.12.7-arm64.AppImage",
        sha256:
          "2a40943a2402cf1f38e71845f294a78d300a78ff21ea4c2103335bca7fbdcbe0",
      },
      x86_64: {
        name: "Obsidian-1.12.7.AppImage",
        sha256:
          "f6d8b96fe685a8632c819cc093a248ace0f6bab410f44a6c929a2611b1ebb17c",
      },
    },
  },
  "1.13.6": {
    tag: "v1.13.6",
    appImages: {
      arm64: {
        name: "Obsidian-1.13.6-arm64.AppImage",
        sha256:
          "61e8186fefc019693857529324f4322f506aebab4229d932128a9641580a654a",
      },
      x86_64: {
        name: "Obsidian-1.13.6.AppImage",
        sha256:
          "7f1d5829263c93ca9d166c2be7aba941ac52f50861a46adda72105411a7b541e",
      },
    },
  },
};

/** Minimal GitHub Release asset metadata used for unverified probes. */
export interface ObsidianGitHubReleaseAsset {
  /** Exact release asset filename. */
  name: string;
  /** GitHub-provided download URL. */
  browser_download_url: string;
  /** Optional GitHub-provided digest such as `sha256:<hex>`. */
  digest?: string | null;
}

/** Minimal GitHub Release metadata used for unverified probes. */
export interface ObsidianGitHubRelease {
  /** Exact release tag requested for the probe. */
  tag_name: string;
  /** Published release assets inspected for the selected architecture. */
  assets: ObsidianGitHubReleaseAsset[];
}

/** Injectable GitHub Release lookup boundary. */
export type ObsidianGitHubReleaseFetcher = (
  version: string,
) => Promise<ObsidianGitHubRelease>;

/** A fully resolved AppImage selection. */
export interface ObsidianAppImageReleaseSelection {
  /** Exact stable Obsidian version. */
  version: string;
  /** Selected Linux AppImage architecture. */
  architecture: ObsidianAppImageArchitecture;
  /** Reviewed-catalogue status. */
  support: ObsidianReleaseSupport;
  /** Source used to resolve the acquisition URI. */
  source: ObsidianAppImageAssetSource;
  /** Exact GitHub Release tag. */
  tag: string;
  /** Exact AppImage asset filename. */
  assetName: string;
  /** Complete acquisition URI. */
  url: string;
  /** Trusted SHA-256 digest when one is available. */
  expectedSha256?: string;
}

/** Options for resolving one official or explicitly overridden AppImage. */
export interface ResolveObsidianAppImageReleaseOptions {
  /** Exact stable version. Defaults to the reviewed E2E release. */
  version?: string;
  /** Required Linux AppImage architecture. */
  architecture: ObsidianAppImageArchitecture;
  /** Whether a version outside the reviewed catalogue may be resolved. */
  allowUnverifiedVersion?: boolean;
  /** Complete acquisition URI override. */
  url?: string;
  /** Injectable official GitHub Release lookup. */
  fetchGitHubRelease?: ObsidianGitHubReleaseFetcher;
}

/** Version and review status selected before any network lookup. */
export interface ObsidianVersionSelection {
  /** Exact stable Obsidian version. */
  version: string;
  /** Reviewed-catalogue status. */
  support: ObsidianReleaseSupport;
}

function exactStableVersion(value: string): boolean {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(value);
}

/** Resolves and validates an exact stable Obsidian version string. */
export function normaliseObsidianVersion(version?: string): string {
  const selected = version?.trim() || DEFAULT_VALIDATED_OBSIDIAN_VERSION;
  if (!exactStableVersion(selected)) {
    throw new Error(
      `Obsidian E2E version must be an exact stable version such as 1.13.6: ${JSON.stringify(selected)}`,
    );
  }
  return selected;
}

/** Returns whether the supplied value explicitly enables unverified probes. */
export function allowUnverifiedObsidianVersion(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.E2E_OBSIDIAN_ALLOW_UNVERIFIED_VERSION === "true";
}

/** Returns the reviewed catalogue entry for a version when one exists. */
export function validatedObsidianRelease(
  version: string,
): ValidatedObsidianRelease | undefined {
  return VALIDATED_OBSIDIAN_RELEASES[version];
}

/** Selects a validated version or an explicitly permitted unverified probe. */
export function selectObsidianVersion(
  version?: string,
  allowUnverifiedVersion = false,
): ObsidianVersionSelection {
  const selectedVersion = normaliseObsidianVersion(version);
  if (validatedObsidianRelease(selectedVersion) !== undefined) {
    return { version: selectedVersion, support: "validated" };
  }
  if (!allowUnverifiedVersion) {
    throw new Error(
      `Unvalidated Obsidian AppImage release ${selectedVersion}. Validated versions: ${Object.keys(VALIDATED_OBSIDIAN_RELEASES).join(", ")}. Set E2E_OBSIDIAN_ALLOW_UNVERIFIED_VERSION=true for an unverified regression probe.`,
    );
  }
  return { version: selectedVersion, support: "unverified" };
}

/** Builds the official AppImage asset name used by current public releases. */
export function obsidianAppImageAssetName(
  version: string,
  architecture: ObsidianAppImageArchitecture,
): string {
  const selectedVersion = normaliseObsidianVersion(version);
  return architecture === "arm64"
    ? `Obsidian-${selectedVersion}-arm64.AppImage`
    : `Obsidian-${selectedVersion}.AppImage`;
}

/** Builds an official GitHub Release download URL from a tag and asset name. */
export function obsidianReleaseAssetUrl(tag: string, assetName: string): string {
  return `https://github.com/obsidianmd/obsidian-releases/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(assetName)}`;
}

/** Builds the official AppImage URL used by current public releases. */
export function obsidianAppImageUrl(
  version: string,
  architecture: ObsidianAppImageArchitecture,
): string {
  const selectedVersion = normaliseObsidianVersion(version);
  return obsidianReleaseAssetUrl(
    `v${selectedVersion}`,
    obsidianAppImageAssetName(selectedVersion, architecture),
  );
}

function readJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "@vrtmrz/obsidian-test-session",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const token = process.env.GITHUB_TOKEN?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const request = get(url, { headers }, (response) => {
      const statusCode = response.statusCode ?? 0;
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        body += chunk;
      });
      response.on("end", () => {
        if (statusCode === 404) {
          reject(new Error(`Unknown Obsidian GitHub Release: ${url}`));
          return;
        }
        if (statusCode !== 200) {
          reject(
            new Error(
              `Could not inspect Obsidian GitHub Release: HTTP ${statusCode}`,
            ),
          );
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(
            new Error("Could not parse Obsidian GitHub Release metadata", {
              cause: error,
            }),
          );
        }
      });
    });
    request.on("error", reject);
  });
}

/** Fetches official GitHub Release metadata for an unverified probe. */
export async function fetchObsidianGitHubRelease(
  version: string,
): Promise<ObsidianGitHubRelease> {
  const selectedVersion = normaliseObsidianVersion(version);
  const value = await readJson(
    `https://api.github.com/repos/obsidianmd/obsidian-releases/releases/tags/v${encodeURIComponent(selectedVersion)}`,
  );
  if (
    typeof value !== "object" ||
    value === null ||
    !("tag_name" in value) ||
    typeof value.tag_name !== "string" ||
    !("assets" in value) ||
    !Array.isArray(value.assets)
  ) {
    throw new Error("Obsidian GitHub Release metadata has an invalid shape");
  }
  return value as ObsidianGitHubRelease;
}

function sha256Digest(digest: string | null | undefined): string | undefined {
  if (digest === undefined || digest === null) return undefined;
  const match = /^sha256:([0-9a-f]{64})$/u.exec(digest);
  return match?.[1];
}

function overrideAssetName(url: string): string {
  const name = basename(new URL(url).pathname);
  if (!name.endsWith(".AppImage")) {
    throw new Error(
      `Obsidian AppImage URL must end with an .AppImage asset name: ${url}`,
    );
  }
  return name;
}

function selectGitHubAsset(
  release: ObsidianGitHubRelease,
  architecture: ObsidianAppImageArchitecture,
): ObsidianGitHubReleaseAsset {
  const candidates = release.assets.filter((asset) => {
    if (!asset.name.endsWith(".AppImage")) return false;
    const arm64 = asset.name.endsWith("-arm64.AppImage");
    return architecture === "arm64" ? arm64 : !arm64;
  });
  if (candidates.length !== 1) {
    throw new Error(
      `Obsidian GitHub Release ${release.tag_name} exposes ${candidates.length} ${architecture} AppImage assets`,
    );
  }
  return candidates[0]!;
}

/** Resolves a validated release or an explicitly permitted unverified probe. */
export async function resolveObsidianAppImageRelease(
  options: ResolveObsidianAppImageReleaseOptions,
): Promise<ObsidianAppImageReleaseSelection> {
  const versionSelection = selectObsidianVersion(
    options.version,
    options.allowUnverifiedVersion,
  );
  const { version } = versionSelection;
  const validated = validatedObsidianRelease(version);
  if (validated !== undefined) {
    const asset = validated.appImages[options.architecture];
    return {
      version,
      architecture: options.architecture,
      support: "validated",
      source: options.url ? "url-override" : "validated-catalogue",
      tag: validated.tag,
      assetName: options.url ? overrideAssetName(options.url) : asset.name,
      url: options.url ?? obsidianReleaseAssetUrl(validated.tag, asset.name),
      expectedSha256: asset.sha256,
    };
  }

  if (options.url) {
    return {
      version,
      architecture: options.architecture,
      support: "unverified",
      source: "url-override",
      tag: `v${version}`,
      assetName: overrideAssetName(options.url),
      url: options.url,
    };
  }

  const release = await (
    options.fetchGitHubRelease ?? fetchObsidianGitHubRelease
  )(version);
  if (release.tag_name !== `v${version}`) {
    throw new Error(
      `Obsidian GitHub Release tag mismatch: requested v${version}, received ${release.tag_name}`,
    );
  }
  const asset = selectGitHubAsset(release, options.architecture);
  return {
    version,
    architecture: options.architecture,
    support: "unverified",
    source: "github-release",
    tag: release.tag_name,
    assetName: asset.name,
    url: asset.browser_download_url,
    expectedSha256: sha256Digest(asset.digest),
  };
}
