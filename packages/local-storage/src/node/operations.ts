import { closeSync, fstatSync, fsyncSync, lstatSync, openSync, readSync, renameSync, statSync, unlinkSync, writeSync, type BigIntStats } from "node:fs";

/** Private synchronous I/O boundary for deterministic filesystem failure tests. */
export interface LocalFileOperations {
  /** Inspects the configured parent, following its explicitly selected path. */
  statDirectory(path: string): BigIntStats;
  /** Inspects an entry without following its final symbolic link. */
  statPath(path: string): BigIntStats;
  /** Opens an entry with the supplied flags and creation mode. */
  open(path: string, flags: number, mode?: number): number;
  /** Inspects the opened descriptor. */
  statDescriptor(descriptor: number): BigIntStats;
  /** Reads at most length bytes at an explicit file offset. */
  read(descriptor: number, bytes: Uint8Array, offset: number, length: number, position: number): number;
  /** Writes a bounded portion of the buffer at an explicit file offset. */
  write(descriptor: number, bytes: Uint8Array, offset: number, length: number, position: number): number;
  /** Requests synchronisation of the opened file. */
  sync(descriptor: number): void;
  /** Closes a descriptor without retrying a possibly completed close. */
  close(descriptor: number): void;
  /** Replaces the destination using the filesystem rename operation. */
  rename(source: string, destination: string): void;
  /** Removes the verified temporary entry. */
  unlink(path: string): void;
}

/** Real operations with no shared store state. */
export const nodeLocalFileOperations: LocalFileOperations = {
  statDirectory: (path) => statSync(path, { bigint: true }),
  statPath: (path) => lstatSync(path, { bigint: true }),
  open: openSync,
  statDescriptor: (descriptor) => fstatSync(descriptor, { bigint: true }),
  read: readSync,
  write: writeSync,
  sync: fsyncSync,
  close: closeSync,
  rename: renameSync,
  unlink: unlinkSync,
};
