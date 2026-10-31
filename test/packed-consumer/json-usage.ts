import { cloneViaJSON } from "octagonal-wheels/encoding/json";

interface Settings {
    title: string;
    nested: { enabled: boolean };
    optional?: string;
    items: readonly number[];
}
declare const settings: Settings;
const copy: Settings = cloneViaJSON(settings);
const tuple = ["entry", { enabled: true }] as const;
const tupleCopy: typeof tuple = cloneViaJSON(tuple);
const plain: string = cloneViaJSON("entry");
const nullValue: null = cloneViaJSON(null);
const explicit: { title: string } = cloneViaJSON<Settings, { title: string }>(settings);
void [copy, tupleCopy, plain, nullValue, explicit];

// @ts-expect-error Date is not a JSON-data input.
cloneViaJSON(new Date());
// @ts-expect-error Nested Date values are not JSON data.
cloneViaJSON({ dates: [new Date()] });
// @ts-expect-error Functions are not JSON data.
cloneViaJSON({ callback() {} });
// @ts-expect-error Bigint is not JSON data.
cloneViaJSON(1n);
// @ts-expect-error Undefined has no root JSON representation.
cloneViaJSON(undefined);
// @ts-expect-error Symbol has no root JSON representation.
cloneViaJSON(Symbol("entry"));
// @ts-expect-error Unknown data needs validation or an explicit caller assertion.
cloneViaJSON(settings as unknown);

class Item { value = 1; }
// @ts-expect-error Constructors are functions rather than JSON data.
cloneViaJSON(Item);
