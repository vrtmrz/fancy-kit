/** Compile-only assertions for kind-specific scripted UI steps. */
import { createUiTestHarness } from "@vrtmrz/obsidian-plugin-kit/testing";

createUiTestHarness([
  {
    kind: "promptText",
    value: (request) => {
      const kind: "promptText" = request.kind;
      return request.options.initialValue ?? null;
    },
  },
  {
    kind: "showMessage",
    value: (request) => {
      const kind: "showMessage" = request.kind;
      void kind;
      return undefined;
    },
  },
]);

createUiTestHarness([
  // @ts-expect-error A text response must be a string or null.
  { kind: "promptText", value: 42 },
]);

createUiTestHarness([
  // @ts-expect-error A handled password prompt requires an automated response.
  { kind: "promptPassword" },
]);

createUiTestHarness([
  // @ts-expect-error A passed-through step cannot also provide a response.
  { kind: "promptText", passthrough: true, value: "unexpected" },
]);

createUiTestHarness([
  // @ts-expect-error Message acknowledgement has no response value.
  { kind: "showMessage", value: "acknowledged" },
]);

createUiTestHarness([
  // @ts-expect-error The callback result must match the declared interaction kind.
  { kind: "confirmAction", value: () => 1 },
]);
