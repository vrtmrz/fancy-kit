import { Plugin } from "obsidian";
import {
  createCompatibleObsidianLocalStore,
  createObsidianLocalStore,
} from "@vrtmrz/obsidian-plugin-kit/local-storage";
import type { ObjectValue } from "@vrtmrz/local-storage";
import type { ObsidianLocalStorage } from "@vrtmrz/obsidian-plugin-kit/local-storage";
import { createWebStorageLocalStore } from "@vrtmrz/local-storage/web-storage";

/** Values which exercise exact JavaScript string preservation in both adapters. */
const stringCases = [
  ["empty-key", "", "truthy-empty-key"],
  ["nul", "key\u0000suffix", "value\u0000suffix"],
  ["bom", "\uFEFFkey", "\uFEFFvalue"],
  ["high-surrogate", "key\uD800", "value\uD800"],
  ["low-surrogate", "key\uDC00", "value\uDC00"],
  ["surrogate-pair", "key\uD83D\uDE03", "value\uD83D\uDE03"],
  ["unicode", "key-e\u0301", "value-é 日本語"],
] as const;

/** Inputs passed from the isolated Node runner to the fixture plug-in. */
export interface LocalStorageFixtureInput {
  /** Complete Vault-relative prefix for Obsidian local storage. */
  officialPrefix: string;
  /** Complete synthetic raw prefix for direct and compatibility Web Storage. */
  legacyPrefix: string;
  /** A second complete prefix used to verify namespace separation. */
  separatedPrefix: string;
  /** Whether this is the initial write phase rather than a persistence check. */
  write: boolean;
}

/** Results returned to the isolated Node runner after one renderer phase. */
export interface LocalStorageFixtureRun {
  /** Whether both official Obsidian methods were present in this renderer. */
  officialMethodsAvailable: boolean;
  /** The backend selected by the compatibility factory. */
  mode: "official" | "legacy";
  /** Number of times the compatibility factory's lazy legacy provider ran. */
  legacySupplierCalls: number;
  /** Individual behavioural assertions for the current phase. */
  checks: Record<string, boolean>;
}

/** Exercises local-storage adapters inside a real Obsidian renderer. */
export default class LocalStorageFixture extends Plugin {
  async exercise(input: LocalStorageFixtureInput): Promise<LocalStorageFixtureRun> {
    const officialStorage = this.app as unknown as Partial<ObsidianLocalStorage>;
    let legacySupplierCalls = 0;
    const compatibleStore = createCompatibleObsidianLocalStore(officialStorage, {
      prefix: input.officialPrefix,
      legacy: () => {
        legacySupplierCalls += 1;
        return { storage: window.localStorage, prefix: input.legacyPrefix };
      },
    });
    const mode = legacySupplierCalls === 0 ? "official" : "legacy";
    const officialMethodsAvailable = typeof officialStorage.loadLocalStorage === "function"
      && typeof officialStorage.saveLocalStorage === "function";
    const primaryStore = mode === "official"
      ? createObsidianLocalStore(officialStorage as ObsidianLocalStorage, { prefix: input.officialPrefix })
      : compatibleStore;
    const browserStorage = window.localStorage;
    const legacyStore = createWebStorageLocalStore(browserStorage, {
      prefix: input.legacyPrefix,
    });
    const separatedStore = mode === "official"
      ? createObsidianLocalStore(officialStorage as ObsidianLocalStorage, { prefix: input.separatedPrefix })
      : createWebStorageLocalStore(browserStorage, { prefix: input.separatedPrefix });
    const checks: Record<string, boolean> = {
      compatibilitySelectedAvailableBackend:
        legacySupplierCalls === (officialMethodsAvailable ? 0 : 1) &&
        mode === (officialMethodsAvailable ? "official" : "legacy"),
      legacyProviderCallCount: legacySupplierCalls === (mode === "official" ? 0 : 1),
      absentValueIsNull: await primaryStore.getValue("absent") === null,
    };

    const compatibilityKey = "compatibility-selection";
    if (input.write) await compatibleStore.setValue(compatibilityKey, "selected-backend");
    checks.compatibleStorePersists =
      await compatibleStore.getValue(compatibilityKey) === "selected-backend";

    for (const [label, key, value] of stringCases) {
      if (input.write) await primaryStore.setValue(key, value);
      checks[`exact-string-${label}`] = await primaryStore.getValue(key) === value;
    }

    const nestedFalsyValue: ObjectValue = {
      values: [null, false, 0, "", { values: [false, 0, ""] }],
    };
    if (input.write) await primaryStore.setObject("nested-falsy-values", nestedFalsyValue);
    checks.nestedFalsyValuesPersist =
      JSON.stringify(await primaryStore.getObject("nested-falsy-values")) === JSON.stringify(nestedFalsyValue);

    const objectFalsyCases = [
      ["null", null],
      ["false", false],
      ["zero", 0],
      ["empty-string", ""],
    ] as const;
    for (const [label, value] of objectFalsyCases) {
      const key = `object-top-${label}`;
      if (input.write) await primaryStore.setObject(key, value);
      checks[`object-top-${label}-persists`] =
        JSON.stringify(await primaryStore.getObject(key)) === JSON.stringify(value);
    }

    const emptyValueKey = "empty-value-deletes";
    if (input.write) {
      await primaryStore.setValue(emptyValueKey, "present");
      await primaryStore.setValue(emptyValueKey, "");
    }
    checks.emptyValueWriteDeletes = await primaryStore.getValue(emptyValueKey) === null;

    const externalEmptyKey = "external-empty-value";
    if (input.write) {
      if (mode === "official") {
        officialStorage.saveLocalStorage?.(`${input.officialPrefix}${externalEmptyKey}`, "");
      } else {
        browserStorage.setItem(`${input.legacyPrefix}${externalEmptyKey}`, "");
      }
    }
    if (mode === "official") {
      checks.officialEmptyWriteDeletes = await primaryStore.getValue(externalEmptyKey) === null;
    } else {
      checks.externallyStoredEmptyValueIsReadable = await primaryStore.getValue(externalEmptyKey) === "";
    }

    const replacementKey = "replacement";
    if (input.write) {
      await primaryStore.setValue(replacementKey, "before");
      await primaryStore.setValue(replacementKey, "after");
    }
    checks.replacement = await primaryStore.getValue(replacementKey) === "after";

    const deletedKey = "deleted";
    if (input.write) {
      await primaryStore.setValue(deletedKey, "remove-me");
      await primaryStore.delete(deletedKey);
    }
    checks.deleteReturnsToAbsence = await primaryStore.getValue(deletedKey) === null;
    await primaryStore.delete("absent-delete");
    checks.deleteAbsentSucceeds = await primaryStore.getValue("absent-delete") === null;

    const sharedKey = "same-key";
    if (input.write) {
      await primaryStore.setValue(sharedKey, "primary-value");
      await separatedStore.setValue(sharedKey, "separated-value");
    }
    checks.prefixesRemainSeparate =
      await primaryStore.getValue(sharedKey) === "primary-value" &&
      await separatedStore.getValue(sharedKey) === "separated-value";

    let explicitLegacySupplierCalls = 0;
    const explicitLegacy = createCompatibleObsidianLocalStore(undefined, {
      prefix: input.officialPrefix,
      legacy: () => {
        explicitLegacySupplierCalls += 1;
        return { storage: browserStorage, prefix: input.legacyPrefix };
      },
    });
    const legacyObject: ObjectValue = { text: "value\uD800", values: [null, false, 0, ""] };
    if (input.write) {
      browserStorage.setItem(`${input.legacyPrefix}explicit-legacy-external-empty`, "");
      await legacyStore.setValue("explicit-legacy-direct", "raw-value");
      await explicitLegacy.setValue("explicit-legacy-compatible", "raw-value");
      await legacyStore.setObject("explicit-legacy-direct-object", legacyObject);
      await explicitLegacy.setObject("explicit-legacy-compatible-object", legacyObject);
    }
    checks.explicitLegacyProviderCalledOnce = explicitLegacySupplierCalls === 1;
    checks.explicitLegacyReadsExternalEmpty =
      await explicitLegacy.getValue("explicit-legacy-external-empty") === "";
    checks.directLegacyReadsExternalEmpty =
      await legacyStore.getValue("explicit-legacy-external-empty") === "";
    checks.explicitLegacyReadsDirectValue =
      await explicitLegacy.getValue("explicit-legacy-direct") === "raw-value";
    checks.directLegacyReadsCompatibleValue =
      await legacyStore.getValue("explicit-legacy-compatible") === "raw-value";
    checks.explicitLegacyReadsDirectObject =
      JSON.stringify(await explicitLegacy.getObject("explicit-legacy-direct-object")) === JSON.stringify(legacyObject);
    checks.directLegacyReadsCompatibleObject =
      JSON.stringify(await legacyStore.getObject("explicit-legacy-compatible-object")) === JSON.stringify(legacyObject);
    checks.explicitLegacyValueRemainsRaw =
      browserStorage.getItem(`${input.legacyPrefix}explicit-legacy-compatible`) === "raw-value";
    checks.explicitLegacyObjectRemainsJson =
      browserStorage.getItem(`${input.legacyPrefix}explicit-legacy-compatible-object`) === JSON.stringify(legacyObject);

    const migrationKey = "known-key";
    const legacyValue = "synthetic-legacy-value";
    if (mode === "official") {
      if (input.write) {
        await legacyStore.setValue(migrationKey, legacyValue);
        if (await primaryStore.getValue(migrationKey) === null) {
          const sourceValue = await legacyStore.getValue(migrationKey);
          if (sourceValue !== null) await primaryStore.setValue(migrationKey, sourceValue);
        }
      }
      checks.knownKeyCopiedToOfficialTarget =
        await primaryStore.getValue(migrationKey) === legacyValue;
      checks.knownKeyLegacySourcePreserved =
        await legacyStore.getValue(migrationKey) === legacyValue;
      const existingKey = "existing-target";
      if (input.write) {
        await legacyStore.setValue(existingKey, "source");
        await primaryStore.setValue(existingKey, "destination");
        if (await primaryStore.getValue(existingKey) === null) {
          const value = await legacyStore.getValue(existingKey);
          if (value !== null) await primaryStore.setValue(existingKey, value);
        }
      }
      checks.existingDestinationPreserved =
        await primaryStore.getValue(existingKey) === "destination" &&
        await legacyStore.getValue(existingKey) === "source";
    } else {
      if (input.write) await legacyStore.setValue("direct-web-storage", "raw-web-value");
      checks.directWebStorageAvailable =
        await primaryStore.getValue("direct-web-storage") === "raw-web-value";
      checks.legacyPrefixRemainsLiteral =
        browserStorage.getItem(`${input.legacyPrefix}direct-web-storage`) === "raw-web-value";
    }

    return {
      officialMethodsAvailable,
      mode,
      legacySupplierCalls,
      checks,
    };
  }
}
