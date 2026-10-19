import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { chmod, link, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Encrypter, generateIdentity, identityToRecipient } from "age-encryption";
import { SecretStoreError } from "@vrtmrz/secret-store";
import { secretStoreContract } from "../../secret-store/test/contract-cases.js";
import { createAgeFileSecretReader, createAgeFileSecretStore } from "../src/age.js";
import { createAgeReaderWithOperations, createAgeStoreWithOperations } from "../src/internal/age-files.js";
import { nodeFileOperations, type SecretFileHandle, type SecretFileOperations } from "../src/internal/file-operations.js";

let identities: string[];
let recipients: string[];
const ownedRoots: string[] = [];
const provider = async () => [identities[0]];
const file = (root: string, name = "api-token") => join(root, `secret-${name}.age`);
const failure = (code = "EIO") => Object.assign(new Error("SENTINEL-SECRET-PATH"), { code });

async function root(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "fancy-kit-age-files-"));
  ownedRoots.push(directory);
  return directory;
}

async function store(rootPath: string, operations = nodeFileOperations) {
  return createAgeStoreWithOperations({ rootPath, recipients, identityProvider: provider }, operations);
}

function countedOperations() {
  const calls: string[] = [];
  const operations: SecretFileOperations = {
    ...nodeFileOperations,
    statPath: async (path) => { calls.push("stat"); return nodeFileOperations.statPath(path); },
    openFile: async (...args) => { calls.push("open"); return nodeFileOperations.openFile(...args); },
    rename: async (...args) => { calls.push("rename"); return nodeFileOperations.rename(...args); },
    unlink: async (...args) => { calls.push("unlink"); return nodeFileOperations.unlink(...args); },
  };
  return { operations, calls };
}

beforeAll(async () => {
  identities = await Promise.all([generateIdentity(), generateIdentity()]);
  recipients = await Promise.all(identities.map(identityToRecipient));
});

afterEach(async () => {
  for (const directory of ownedRoots.splice(0).reverse()) {
    await chmod(directory, 0o700).catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
});

describe("age file SecretStore", () => {
  secretStoreContract(async () => store(await root()));

  it("constructs without entries, policy files, identities, or key acquisition", async () => {
    const directory = await root();
    let requests = 0;
    const identityProvider = async () => { requests++; return identities; };
    const writer = await createAgeFileSecretStore({ rootPath: directory, recipients, identityProvider });
    const reader = await createAgeFileSecretReader({ rootPath: directory, identityProvider });
    expect(Object.keys(reader).sort()).toEqual(["getObject", "getValue"]);
    expect(await readdir(directory)).toEqual([]);
    expect(await reader.getValue("absent")).toBeNull();
    await writer.setValue("api-token", "");
    expect(requests).toBe(0);
    expect(await reader.getValue("api-token")).toBe("");
    expect(requests).toBe(1);
    expect(await readdir(directory)).toEqual(["secret-api-token.age"]);
  });

  it("persists binary ciphertext with 0600 mode and survives reconstruction", async () => {
    const directory = await root();
    const writer = await store(directory);
    const value = "SYNTHETIC-SECRET\0\uFEFF日本語🔐\n";
    await writer.setValue("api-token", value);
    const ciphertext = await readFile(file(directory));
    expect(ciphertext.subarray(0, 22).toString()).toBe("age-encryption.org/v1\n");
    expect(ciphertext.includes(Buffer.from(value))).toBe(false);
    expect((await stat(file(directory))).mode & 0o777).toBe(0o600);
    const reconstructed = await createAgeFileSecretReader({ rootPath: directory, identityProvider: async () => [identities[1]] });
    expect(await reconstructed.getValue("api-token")).toBe(value);
  });

  it("validates bad names and values before any filesystem call", async () => {
    const { operations, calls } = countedOperations();
    const writer = await store(await root(), operations);
    calls.length = 0;
    for (const name of ["../escape", "a/b", "A", "x\n", "a".repeat(65)]) {
      await expect(writer.getValue(name)).rejects.toMatchObject({ code: "invalid-name" });
      await expect(writer.setValue(name, "value")).rejects.toMatchObject({ code: "invalid-name" });
    }
    for (const value of ["\uD800", "x".repeat(65537), "🔐".repeat(16384) + "x"]) {
      await expect(writer.setValue("api-token", value)).rejects.toMatchObject({ code: "invalid-value" });
    }
    expect(calls).toEqual([]);
  });

  it("accepts Windows reserved words through the fixed filename prefix", async () => {
    const writer = await store(await root());
    for (const name of ["con", "aux", "nul", "com1"]) {
      await writer.setValue(name, name);
      expect(await writer.getValue(name)).toBe(name);
    }
  });

  it("enforces inclusive byte limits and ignores unrelated entries", async () => {
    const directory = await root();
    const writer = await store(directory);
    await writeFile(join(directory, "recipients.txt"), "deliberately not a recipient", { mode: 0o600 });
    await writeFile(join(directory, ".secret-store-abandoned.tmp"), "not a secret", { mode: 0o600 });
    await writer.setValue("api-token", "🔐".repeat(16384));
    expect(await writer.getValue("api-token")).toBe("🔐".repeat(16384));
    await expect(writer.setValue("api-token", "x".repeat(65537))).rejects.toMatchObject({ code: "invalid-value" });
    expect(await writer.getValue("missing")).toBeNull();
    expect(await readFile(join(directory, "recipients.txt"), "utf8")).toBe("deliberately not a recipient");
  });

  it("does not cache identity results and sanitises provider exceptions", async () => {
    const directory = await root();
    await (await store(directory)).setValue("api-token", "value");
    let requests = 0;
    const reader = await createAgeFileSecretReader({
      rootPath: directory,
      identityProvider: async () => { requests++; if (requests === 1) return identities; throw failure(); },
    });
    expect(await reader.getValue("api-token")).toBe("value");
    const error = await reader.getValue("api-token").catch((error: unknown) => error);
    expect(error).toMatchObject({ code: "operation-failed" });
    expect(String(error) + JSON.stringify(error)).not.toContain("SENTINEL");
    expect(error).not.toHaveProperty("cause");
    expect(requests).toBe(2);
  });

  it("copies recipients and keeps each root and provider instance-scoped", async () => {
    const firstRoot = await root();
    const secondRoot = await root();
    const policy = [recipients[0]];
    const first = await createAgeFileSecretStore({ rootPath: firstRoot, recipients: policy, identityProvider: provider });
    const second = await store(secondRoot);
    policy[0] = recipients[1];
    await first.setValue("api-token", "first");
    expect(await first.getValue("api-token")).toBe("first");
    expect(await second.getValue("api-token")).toBeNull();
    const wrongReader = await createAgeFileSecretReader({ rootPath: firstRoot, identityProvider: async () => [identities[1]] });
    await expect(wrongReader.getValue("api-token")).rejects.toMatchObject({ code: "decryption-failed" });
  });
});

describe("file authority and read bounds", () => {
  it("never creates a missing root or repairs permissive modes", async () => {
    const parent = await root();
    const missing = join(parent, "missing");
    await expect(store(missing)).rejects.toMatchObject({ code: "unavailable" });
    expect(await readdir(parent)).toEqual([]);
    await chmod(parent, 0o755);
    await expect(store(parent)).rejects.toMatchObject({ code: "access-denied" });
    expect((await stat(parent)).mode & 0o777).toBe(0o755);
  });

  it("rejects unsupported authority and invalid options before I/O", async () => {
    const { operations, calls } = countedOperations();
    await expect(createAgeReaderWithOperations({ rootPath: "/unused", identityProvider: provider }, { ...operations, supportsAuthority: () => false })).rejects.toMatchObject({ code: "unavailable" });
    for (const rootPath of ["", "a\0b", null]) {
      await expect(createAgeReaderWithOperations({ rootPath: rootPath as string, identityProvider: provider }, operations)).rejects.toMatchObject({ code: "invalid-value" });
    }
    await expect(createAgeStoreWithOperations({ rootPath: "/unused", recipients: [], identityProvider: provider }, operations)).rejects.toMatchObject({ code: "invalid-value" });
    expect(calls).toEqual([]);
  });

  it("sanitises even a thrown SecretStoreError with a hostile code getter", async () => {
    const upstream = new SecretStoreError("operation-failed");
    Object.defineProperty(upstream, "code", { get() { throw new Error("SENTINEL-PRIVATE-OPTION"); } });
    const options = { get rootPath(): string { throw upstream; }, identityProvider: provider };
    const error = await createAgeFileSecretReader(options).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(SecretStoreError);
    expect(error).toMatchObject({ code: "operation-failed" });
    expect(String(error) + JSON.stringify(error)).not.toContain("SENTINEL");
  });

  it("sanitises a thrown object whose prototype inspection throws", async () => {
    const upstream = new Proxy({}, { getPrototypeOf() { throw new Error("SENTINEL-PRIVATE-PROTOTYPE"); } });
    const options = { get rootPath(): string { throw upstream; }, identityProvider: provider };
    const error = await createAgeFileSecretReader(options).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(SecretStoreError);
    expect(error).toMatchObject({ code: "operation-failed" });
    expect(String(error) + JSON.stringify(error)).not.toContain("SENTINEL");
  });

  it("rejects symlinked roots and writable non-sticky ancestors", async () => {
    const parent = await root();
    const child = join(parent, "private");
    await mkdir(child, { mode: 0o700 });
    const alias = join(parent, "alias");
    await symlink(child, alias);
    await expect(store(alias)).rejects.toMatchObject({ code: "invalid-data" });
    await chmod(parent, 0o777);
    await expect(store(child)).rejects.toMatchObject({ code: "access-denied" });
    await chmod(parent, 0o700);
  });

  it("distinguishes root loss and replacement from an absent entry", async () => {
    const parent = await root();
    const original = join(parent, "store");
    await mkdir(original, { mode: 0o700 });
    const writer = await store(original);
    await rename(original, join(parent, "retired"));
    await expect(writer.getValue("missing")).rejects.toMatchObject({ code: "unavailable" });
    await mkdir(original, { mode: 0o700 });
    await expect(writer.getValue("missing")).rejects.toMatchObject({ code: "unavailable" });
    await expect(writer.setValue("api-token", "value")).rejects.toMatchObject({ code: "unavailable" });
    expect(await readdir(original)).toEqual([]);
  });

  it("rechecks root availability when entry lookup reports absence", async () => {
    const parent = await root();
    const directory = join(parent, "store");
    await mkdir(directory, { mode: 0o700 });
    const operations = { ...nodeFileOperations, statPath: async (path: string) => {
      if (path === file(directory, "missing")) {
        await rename(directory, join(parent, "retired"));
        throw failure("ENOENT");
      }
      return nodeFileOperations.statPath(path);
    } };
    const reader = await createAgeReaderWithOperations({ rootPath: directory, identityProvider: provider }, operations);
    await expect(reader.getValue("missing")).rejects.toMatchObject({ code: "unavailable" });
  });

  it.each(["symlink", "hardlink", "directory", "permissive"])("rejects an unsafe %s entry before requesting identities or replacing it", async (kind) => {
    const directory = await root();
    const outside = await root();
    const target = join(outside, "retained");
    await writeFile(target, "outside", { mode: 0o600 });
    if (kind === "symlink") await symlink(target, file(directory));
    if (kind === "hardlink") await link(target, file(directory));
    if (kind === "directory") await mkdir(file(directory), { mode: 0o700 });
    if (kind === "permissive") await writeFile(file(directory), "unsafe", { mode: 0o644 });
    let requests = 0;
    const writer = await createAgeFileSecretStore({ rootPath: directory, recipients, identityProvider: async () => { requests++; return identities; } });
    const code = kind === "permissive" ? "access-denied" : "invalid-data";
    await expect(writer.getValue("api-token")).rejects.toMatchObject({ code });
    await expect(writer.setValue("api-token", "replacement")).rejects.toMatchObject({ code });
    expect(requests).toBe(0);
    expect(await readFile(target, "utf8")).toBe("outside");
  });

  it("uses no-follow open to reject a final-component swap", async () => {
    const directory = await root();
    await (await store(directory)).setValue("api-token", "original");
    const target = join(await root(), "outside");
    await writeFile(target, "outside", { mode: 0o600 });
    const operations = { ...nodeFileOperations, openFile: async (path: string, flags: number, mode?: number) => {
      if (path === file(directory)) {
        expect(flags & constants.O_NOFOLLOW).not.toBe(0);
        await rm(path);
        await symlink(target, path);
      }
      return nodeFileOperations.openFile(path, flags, mode);
    } };
    const reader = await createAgeReaderWithOperations({ rootPath: directory, identityProvider: provider }, operations);
    await expect(reader.getValue("api-token")).rejects.toMatchObject({ code: "invalid-data" });
  });

  it("bounds large or growing files before requesting identities", async () => {
    const directory = await root();
    await writeFile(file(directory), "", { mode: 0o600 });
    await truncate(file(directory), 1024 * 1024 + 1);
    let requests = 0;
    const identityProvider = async () => { requests++; return identities; };
    const reader = await createAgeFileSecretReader({ rootPath: directory, identityProvider });
    await expect(reader.getValue("api-token")).rejects.toMatchObject({ code: "invalid-data" });
    await truncate(file(directory), 1);
    let requestedBytes = 0;
    const operations = { ...nodeFileOperations, openFile: async (...args: Parameters<SecretFileOperations["openFile"]>) => {
      const handle = await nodeFileOperations.openFile(...args);
      return { ...handle, read: async (...readArgs: Parameters<SecretFileHandle["read"]>) => {
        await truncate(file(directory), 1024 * 1024 + 1);
        requestedBytes += readArgs[2];
        return handle.read(...readArgs);
      } };
    } };
    const growingReader = await createAgeReaderWithOperations({ rootPath: directory, identityProvider }, operations);
    await expect(growingReader.getValue("api-token")).rejects.toMatchObject({ code: "invalid-data" });
    expect(requestedBytes).toBe(2);
    expect(requests).toBe(0);
  });

  it("rejects authenticated invalid UTF-8 and oversized plaintext", async () => {
    const directory = await root();
    const encrypter = new Encrypter();
    encrypter.addRecipient(recipients[0]);
    const reader = await createAgeFileSecretReader({ rootPath: directory, identityProvider: provider });
    for (const value of [new Uint8Array([0xff]), new Uint8Array(65537)]) {
      await writeFile(file(directory), await encrypter.encrypt(value), { mode: 0o600 });
      await expect(reader.getValue("api-token")).rejects.toMatchObject({ code: "invalid-data" });
    }
  });

  it("allows private read-only roots for readers and rejects writes", async () => {
    const directory = await root();
    const writer = await store(directory);
    await writer.setValue("api-token", "value");
    await chmod(directory, 0o500);
    const reader = await createAgeFileSecretReader({ rootPath: directory, identityProvider: provider });
    expect(await reader.getValue("api-token")).toBe("value");
    expect(await writer.getValue("api-token")).toBe("value");
    await expect(writer.setValue("api-token", "replacement")).rejects.toMatchObject({ code: "access-denied" });
  });
});

describe("replacement failures and concurrency", () => {
  it.each(["create", "write", "file-sync", "file-close", "rename", "rename-after", "directory-sync", "directory-close"])(
    "reports a safe error and preserves the truthful final state after %s failure",
    async (stage) => {
      const directory = await root();
      const realStore = await store(directory);
      await realStore.setValue("api-token", "original");
      const operations: SecretFileOperations = {
        ...nodeFileOperations,
        async openFile(path, flags, mode) {
          const temporary = path.endsWith(".tmp");
          if (temporary && stage === "create") throw failure();
          const handle = await nodeFileOperations.openFile(path, flags, mode);
          return {
            ...handle,
            async writeFile(bytes) {
              if (temporary && stage === "write") {
                await handle.writeFile(bytes.subarray(0, 12));
                throw failure();
              }
              await handle.writeFile(bytes);
            },
            async sync() {
              if ((temporary && stage === "file-sync") || (path === directory && stage === "directory-sync")) throw failure();
              await handle.sync();
            },
            async close() {
              await handle.close();
              if ((temporary && stage === "file-close") || (path === directory && stage === "directory-close")) throw failure();
            },
          };
        },
        async rename(source, destination) {
          if (stage === "rename") throw failure();
          await nodeFileOperations.rename(source, destination);
          if (stage === "rename-after") throw failure();
        },
      };
      const writer = await store(directory, operations);
      const error = await writer.setValue("api-token", "replacement").catch((error: unknown) => error);
      expect(error).toBeInstanceOf(SecretStoreError);
      expect(error).toMatchObject({ code: "operation-failed" });
      expect(error).not.toHaveProperty("cause");
      expect(String(error) + JSON.stringify(error)).not.toContain("SENTINEL");
      const replaced = ["rename-after", "directory-sync", "directory-close"].includes(stage);
      expect(await realStore.getValue("api-token")).toBe(replaced ? "replacement" : "original");
      expect(await readdir(directory)).toEqual(["secret-api-token.age"]);
    },
  );

  it("uses the required flush/close/replace/sync sequence without plaintext files", async () => {
    const directory = await root();
    const realStore = await store(directory);
    await realStore.setValue("api-token", "original");
    const events: string[] = [];
    const operations: SecretFileOperations = {
      ...nodeFileOperations,
      async openFile(path, flags, mode) {
        const temporary = path.endsWith(".tmp");
        if (temporary) {
          expect(flags & constants.O_EXCL).not.toBe(0);
          expect(mode).toBe(0o600);
        }
        const handle = await nodeFileOperations.openFile(path, flags, mode);
        return {
          ...handle,
          async writeFile(bytes) { events.push("write-ciphertext"); expect(Buffer.from(bytes).includes(Buffer.from("replacement"))).toBe(false); await handle.writeFile(bytes); },
          async sync() { events.push(temporary ? "sync-file" : "sync-directory"); await handle.sync(); },
          async close() { events.push(temporary ? "close-file" : "close-directory"); await handle.close(); },
        };
      },
      async rename(source, destination) {
        expect(await realStore.getValue("api-token")).toBe("original");
        expect((await stat(source)).mode & 0o777).toBe(0o600);
        events.push("rename");
        await nodeFileOperations.rename(source, destination);
      },
    };
    await (await store(directory, operations)).setValue("api-token", "replacement");
    expect(events).toEqual(["write-ciphertext", "sync-file", "close-file", "rename", "sync-directory", "close-directory"]);
    expect(await realStore.getValue("api-token")).toBe("replacement");
  });

  it("leaves a private residue when cleanup fails without claiming success", async () => {
    const directory = await root();
    const realStore = await store(directory);
    await realStore.setValue("api-token", "original");
    const operations: SecretFileOperations = {
      ...nodeFileOperations,
      async openFile(...args) {
        const handle = await nodeFileOperations.openFile(...args);
        return { ...handle, async writeFile(bytes) { await handle.writeFile(bytes); throw failure(); } };
      },
      unlink: async () => { throw failure("EPERM"); },
    };
    await expect((await store(directory, operations)).setValue("api-token", "replacement")).rejects.toBeInstanceOf(SecretStoreError);
    expect(await realStore.getValue("api-token")).toBe("original");
    const temporary = (await readdir(directory)).find((name) => name.endsWith(".tmp"));
    expect(temporary).toBeDefined();
    expect((await stat(join(directory, temporary!))).mode & 0o777).toBe(0o600);
    expect((await readFile(join(directory, temporary!))).includes(Buffer.from("replacement"))).toBe(false);
  });

  it("never removes a replacement inode at its temporary pathname", async () => {
    const directory = await root();
    const realStore = await store(directory);
    await realStore.setValue("api-token", "original");
    let foreignPath = "";
    const operations: SecretFileOperations = {
      ...nodeFileOperations,
      async openFile(path, flags, mode) {
        const handle = await nodeFileOperations.openFile(path, flags, mode);
        if (!path.endsWith(".tmp")) return handle;
        return { ...handle, async writeFile() {
          await rm(path);
          await writeFile(path, "foreign-operation", { mode: 0o600, flag: "wx" });
          foreignPath = path;
          throw failure();
        } };
      },
    };
    await expect((await store(directory, operations)).setValue("api-token", "replacement")).rejects.toBeInstanceOf(SecretStoreError);
    expect(await readFile(foreignPath, "utf8")).toBe("foreign-operation");
    expect(await realStore.getValue("api-token")).toBe("original");
  });

  it("rejects a destination changed to a symlink before replacement", async () => {
    const directory = await root();
    const outside = join(await root(), "retained");
    await writeFile(outside, "outside", { mode: 0o600 });
    const operations: SecretFileOperations = {
      ...nodeFileOperations,
      async openFile(path, flags, mode) {
        const handle = await nodeFileOperations.openFile(path, flags, mode);
        if (!path.endsWith(".tmp")) return handle;
        return { ...handle, async close() { await handle.close(); await symlink(outside, file(directory)); } };
      },
    };
    await expect((await store(directory, operations)).setValue("api-token", "replacement")).rejects.toMatchObject({ code: "invalid-data" });
    expect(await readFile(outside, "utf8")).toBe("outside");
    expect(await readdir(directory)).toEqual(["secret-api-token.age"]);
  });

  it("uses last-writer-wins at replacement with independent writers", async () => {
    const directory = await root();
    const normal = await store(directory);
    await normal.setValue("api-token", "original");
    let reached!: () => void;
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => { reached = resolve; });
    const resume = new Promise<void>((resolve) => { release = resolve; });
    const delayed = await store(directory, { ...nodeFileOperations, rename: async (source, destination) => {
      reached();
      await resume;
      await nodeFileOperations.rename(source, destination);
    } });
    const firstWrite = delayed.setValue("api-token", "first-started-last-replaced");
    try {
      await waiting;
      expect(await normal.getValue("api-token")).toBe("original");
      await normal.setValue("api-token", "second-started-first-replaced");
      expect(await normal.getValue("api-token")).toBe("second-started-first-replaced");
    } finally {
      release();
      await firstWrite;
    }
    expect(await normal.getValue("api-token")).toBe("first-started-last-replaced");
    expect(await readdir(directory)).toEqual(["secret-api-token.age"]);
  });

  it("allows a complete old descriptor read during atomic replacement", async () => {
    const directory = await root();
    const writer = await store(directory);
    await writer.setValue("api-token", "old".repeat(20000));
    let replaced = false;
    const operations: SecretFileOperations = { ...nodeFileOperations, openFile: async (...args) => {
      const handle = await nodeFileOperations.openFile(...args);
      if (args[0] === file(directory) && !replaced) {
        replaced = true;
        await writer.setValue("api-token", "new".repeat(20000));
      }
      return handle;
    } };
    const reader = await createAgeReaderWithOperations({ rootPath: directory, identityProvider: provider }, operations);
    expect(await reader.getValue("api-token")).toBe("old".repeat(20000));
    expect(await writer.getValue("api-token")).toBe("new".repeat(20000));
  });

  it.each(["before", "after"])("keeps a readable final entry when a process is killed %s replacement", async (phase) => {
    const directory = await root();
    const writer = await store(directory);
    await writer.setValue("api-token", "original");
    const fixture = fileURLToPath(new URL("./fixtures/crash-writer.mjs", import.meta.url));
    const child = spawn(process.execPath, [fixture, directory, recipients[0], phase], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
    const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Writer did not reach the controlled crash boundary")), 10_000);
        child.once("error", (error) => { clearTimeout(timeout); reject(error); });
        child.once("exit", () => { clearTimeout(timeout); reject(new Error("Writer exited before its controlled crash boundary")); });
        child.once("message", () => { clearTimeout(timeout); resolve(); });
      });
    } finally {
      child.kill("SIGKILL");
      await exited;
    }
    expect(await writer.getValue("api-token")).toBe(phase === "before" ? "original" : "synthetic-crash-value");
    const residues = (await readdir(directory)).filter((name) => name.endsWith(".tmp"));
    expect(residues).toHaveLength(phase === "before" ? 1 : 0);
    if (residues.length) {
      const bytes = await readFile(join(directory, residues[0]));
      expect(bytes.subarray(0, 22).toString()).toBe("age-encryption.org/v1\n");
      expect(bytes.includes(Buffer.from("synthetic-crash-value"))).toBe(false);
    }
    await writer.setValue("api-token", "later-write");
    expect(await writer.getValue("api-token")).toBe("later-write");
    expect((await readdir(directory)).filter((name) => name.endsWith(".tmp"))).toEqual(residues);
  });
});

describe("age serializer composition", () => {
  it("applies one injected transform inside the existing age encryption boundary", async () => {
    const rootPath = await root();
    let serializations = 0;
    let deserializations = 0;
    const serializer = {
      async serialize(name: string, value: string) { serializations++; return JSON.stringify([name, value]); },
      async deserialize(name: string, value: string) {
        deserializations++;
        const [storedName, storedValue] = JSON.parse(value) as [string, string];
        if (storedName !== name) throw failure();
        return storedValue;
      },
    };
    const writer = await createAgeFileSecretStore({ rootPath, recipients, identityProvider: provider, serializer });
    const value = { enabled: false, count: 0, label: "", empty: null };
    await writer.setObject("api-token", value);
    const raw = await createAgeFileSecretReader({ rootPath, identityProvider: provider });
    expect(await raw.getValue("api-token")).toBe(JSON.stringify(["api-token", JSON.stringify(value)]));
    const reader = await createAgeFileSecretReader({ rootPath, identityProvider: provider, serializer });
    expect(await reader.getObject("api-token")).toEqual(value);
    expect(serializations).toBe(1);
    expect(deserializations).toBe(1);
    expect(await reader.getObject("missing")).toBeUndefined();
    expect(deserializations).toBe(1);
  });

  it("rejects a failed transform without replacing an existing age entry", async () => {
    const rootPath = await root();
    await (await store(rootPath)).setValue("api-token", "original");
    const original = await readFile(file(rootPath));
    const { operations, calls } = countedOperations();
    const writer = await createAgeStoreWithOperations({
      rootPath, recipients, identityProvider: provider,
      serializer: { serialize: async () => { throw new Error("SENTINEL-SECRET"); }, deserialize: (_name, value) => value },
    }, operations);
    calls.length = 0;
    const error = await writer.setValue("api-token", "plaintext-input").catch((error: unknown) => error);
    expect(error).toMatchObject({ code: "operation-failed" });
    expect((error as Error).message).not.toContain("SENTINEL");
    expect(calls).toEqual([]);
    expect(await readFile(file(rootPath))).toEqual(original);
  });
});
