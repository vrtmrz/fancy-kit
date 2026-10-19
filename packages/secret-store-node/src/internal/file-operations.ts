import { constants, type BigIntStats } from "node:fs";
import { lstat, open, rename, unlink } from "node:fs/promises";

/** The descriptor operations used by the private file-store test boundary. */
export interface SecretFileHandle {
  /** Inspects this opened descriptor without following another pathname. */
  stat(): Promise<BigIntStats>;
  /** Reads at most length bytes at an explicit position and returns the count. */
  read(buffer: Uint8Array, offset: number, length: number, position: number): Promise<number>;
  /** Completes an entire ciphertext write, without encoding or text conversion. */
  writeFile(bytes: Uint8Array): Promise<void>;
  /** Requests the filesystem's descriptor synchronisation operation. */
  sync(): Promise<void>;
  /** Releases the descriptor; callers own its lifetime. */
  close(): Promise<void>;
}

/**
 * Private, instance-injected operations for deterministic failure tests.
 * This is not a public general-purpose filesystem abstraction.
 */
export interface SecretFileOperations {
  /** Reports whether POSIX ownership and no-follow flags are available. */
  supportsAuthority(): boolean;
  /** Returns the current effective user, including after a privilege change. */
  effectiveUserId(): number;
  /** Inspects the final path component itself, including symbolic links. */
  statPath(path: string): Promise<BigIntStats>;
  /** Opens with the exact supplied flags and optional creation mode. */
  openFile(path: string, flags: number, mode?: number): Promise<SecretFileHandle>;
  /** Replaces the destination using the platform rename operation only. */
  rename(source: string, destination: string): Promise<void>;
  /** Removes one previously verified, operation-owned temporary file. */
  unlink(path: string): Promise<void>;
}

/** Real Node operations; this fixed capability contains no per-store state. */
export const nodeFileOperations: SecretFileOperations = {
  supportsAuthority: () => process.platform !== "win32"
    && typeof process.geteuid === "function"
    && typeof constants.O_NOFOLLOW === "number"
    && typeof constants.O_DIRECTORY === "number",
  effectiveUserId: () => process.geteuid!(),
  statPath: (path) => lstat(path, { bigint: true }),
  async openFile(path, flags, mode) {
    const handle = await open(path, flags, mode);
    return {
      stat: () => handle.stat({ bigint: true }),
      read: async (buffer, offset, length, position) =>
        (await handle.read(buffer, offset, length, position)).bytesRead,
      writeFile: (bytes) => handle.writeFile(bytes),
      sync: () => handle.sync(),
      close: () => handle.close(),
    };
  },
  rename,
  unlink,
};
