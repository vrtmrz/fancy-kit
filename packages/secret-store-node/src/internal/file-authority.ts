import type { BigIntStats } from "node:fs";
import { dirname, resolve } from "node:path";
import { SecretStoreError, type SecretStoreErrorCode } from "@vrtmrz/secret-store";
import type { SecretFileOperations } from "./file-operations.js";

/** Device and inode identity, retained only within this process. */
export interface FileIdentity {
  /** Device identifier from descriptor or no-follow path inspection. */
  dev: bigint;
  /** Inode identifier, without conversion through floating-point numbers. */
  ino: bigint;
}

/** Returns an allowlisted platform status without coercing an upstream error. */
export function fileErrorCode(error: unknown): string | undefined {
  try {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}

/** Reconstructs a safe error rather than retaining an upstream message or cause. */
export function sanitiseFileError(error: unknown): SecretStoreError {
  try {
    if (error instanceof SecretStoreError) return new SecretStoreError((fileErrorCode(error) ?? "operation-failed") as SecretStoreErrorCode);
  } catch {
    // A thrown Proxy can fail even during prototype inspection.
    return new SecretStoreError("operation-failed");
  }
  switch (fileErrorCode(error)) {
    case "EACCES":
    case "EPERM": return new SecretStoreError("access-denied");
    case "ENOENT": return new SecretStoreError("unavailable");
    case "ELOOP":
    case "ENOTDIR": return new SecretStoreError("invalid-data");
    default: return new SecretStoreError("operation-failed");
  }
}

/** Tests whether two inspections describe the same filesystem object. */
export function sameFile(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

/** Validates a private readable regular file, allowing an opened old inode. */
export function validateSecretFile(stat: BigIntStats, userId: bigint, allowUnlinked = false): void {
  if (!stat.isFile() || stat.nlink > 1n || (stat.nlink === 0n && !allowUnlinked)) {
    throw new SecretStoreError("invalid-data");
  }
  if (stat.uid !== userId || (stat.mode & 0o7177n) !== 0n || (stat.mode & 0o400n) === 0n) {
    throw new SecretStoreError("access-denied");
  }
}

/** A bound private directory whose original ancestry is rechecked per operation. */
export interface RootAuthority {
  /** Absolute, lexically resolved pathname, with no symbolic path components. */
  path: string;
  /** Original root identity, used to validate opened directory descriptors. */
  identity: FileIdentity;
  /** Rechecks authority and identity; returns the current effective user. */
  validate(writable?: boolean): Promise<bigint>;
}

/**
 * Binds an existing root without creating, changing modes, or retaining handles.
 * Trusted owners are the effective user and root. Writable sticky ancestors are
 * accepted only with trusted ownership of every component below them. A hostile
 * trusted owner racing path replacement is outside the portable Node boundary.
 */
export async function createRootAuthority(
  rootPath: string,
  writable: boolean,
  operations: SecretFileOperations,
): Promise<RootAuthority> {
  if (typeof rootPath !== "string" || rootPath.length === 0 || rootPath.includes("\0")) {
    throw new SecretStoreError("invalid-value");
  }
  if (!operations.supportsAuthority()) throw new SecretStoreError("unavailable");
  const path = resolve(rootPath);
  const paths = [path];
  while (dirname(paths[0]) !== paths[0]) paths.unshift(dirname(paths[0]));

  async function inspect(needsWrite: boolean): Promise<{ userId: bigint; identities: BigIntStats[] }> {
    const userId = BigInt(operations.effectiveUserId());
    const identities: BigIntStats[] = [];
    for (const component of paths) {
      const stat = await operations.statPath(component);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new SecretStoreError("invalid-data");
      if (component === path) {
        const required = needsWrite ? 0o700n : 0o500n;
        if (stat.uid !== userId || (stat.mode & 0o7077n) !== 0n || (stat.mode & required) !== required) {
          throw new SecretStoreError("access-denied");
        }
      } else if (
        (stat.uid !== 0n && stat.uid !== userId)
        || ((stat.mode & 0o022n) !== 0n && (stat.mode & 0o1000n) === 0n)
      ) {
        throw new SecretStoreError("access-denied");
      }
      identities.push(stat);
    }
    return { userId, identities };
  }

  const initial = await inspect(writable);
  return {
    path,
    identity: initial.identities.at(-1)!,
    async validate(needsWrite = false) {
      const current = await inspect(needsWrite);
      if (current.identities.some((stat, index) => !sameFile(stat, initial.identities[index]))) {
        throw new SecretStoreError("unavailable");
      }
      return current.userId;
    },
  };
}
