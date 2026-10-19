import { Plugin } from "obsidian";
import { SecretStoreError } from "@vrtmrz/secret-store";
import type { ObjectValue } from "@vrtmrz/secret-store";
import { createObsidianSecretStore } from "@vrtmrz/obsidian-plugin-kit/secrets";

const cases = [
  ["empty", ""],
  ["whitespace", " \tvalue\r\n "],
  ["nul", "\0embedded\0"],
  ["bom", "\ufeffleading-bom"],
  ["unicode", "é e\u0301 日本語 🔐"],
  ["surrogate-pairs", "\ud800\udc00\udbff\udfff"],
] as const;

export default class SecretStorageFixture extends Plugin {
  async exercise(prefix: string, write: boolean): Promise<Record<string, boolean>> {
    const store = createObsidianSecretStore(this.app.secretStorage);
    const results: Record<string, boolean> = {
      absent: await store.getValue(`${prefix}-absent`) === null,
    };
    for (const [label, value] of cases) {
      const name = `${prefix}-${label}`;
      if (write) {
        try { await store.setValue(name, value); results[`${label}-write`] = true; }
        catch { results[`${label}-write`] = false; }
      }
      try { results[label] = await store.getValue(name) === value; }
      catch { results[label] = false; }
    }

    const objectName = `${prefix}-object`;
    const objectValue: ObjectValue = {
      text: "synthetic-secret-object",
      values: [null, false, 0, "", { nested: [true, "日本語"] }],
    };
    if (write) {
      try {
        await store.setObject(objectName, objectValue);
        results["object-write"] = true;
      } catch {
        results["object-write"] = false;
      }
    }
    try {
      results["object-round-trip"] =
        JSON.stringify(await store.getObject(objectName)) === JSON.stringify(objectValue);
    } catch {
      results["object-round-trip"] = false;
    }

    const jsonNullName = `${prefix}-json-null`;
    if (write) await store.setObject(jsonNullName, null);
    results["json-null-is-data"] = await store.getObject(jsonNullName) === null;

    const replacement = `${prefix}-replacement`;
    try {
      if (write) {
        await store.setValue(replacement, "synthetic-before");
        await store.setValue(replacement, "synthetic-after");
      }
      results.replacement = await store.getValue(replacement) === "synthetic-after";
    } catch { results.replacement = false; }

    for (const length of [63, 64]) {
      const name = prefix + "a".repeat(length - prefix.length);
      try {
        if (write) await store.setValue(name, "synthetic-boundary");
        results[`name-${length}`] = await store.getValue(name) === "synthetic-boundary";
      } catch { results[`name-${length}`] = false; }
    }
    for (const length of [65, 128]) {
      const name = prefix + "a".repeat(length - prefix.length);
      for (const operation of ["get", "set"] as const) {
        try {
          if (operation === "get") await store.getValue(name);
          else await store.setValue(name, "synthetic-boundary");
          results[`name-${length}-${operation}-rejected`] = false;
        } catch (error) {
          results[`name-${length}-${operation}-rejected`] =
            error instanceof SecretStoreError && error.code === "invalid-name";
        }
      }
      if (write) {
        // Retain the native failure which established the portable name limit.
        try {
          this.app.secretStorage.setSecret(name, "synthetic-boundary");
          results[`native-name-${length}-rejected`] = false;
        } catch { results[`native-name-${length}-rejected`] = true; }
      }
    }
    return results;
  }
}
