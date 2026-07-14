export interface HarnessReportField {
  readonly label: string;
  readonly value: string;
}

export interface HarnessReportScenario {
  readonly id: string;
  readonly title: string;
  readonly mode: string;
  readonly status: string;
  readonly detail: string | null;
}

export interface HarnessReportTranscriptEntry {
  readonly at: string;
  readonly event: string;
  readonly detail?: unknown;
}

export interface HarnessMarkdownReportInput {
  readonly generatedAt: string;
  readonly environment: readonly HarnessReportField[];
  readonly scenarios: readonly HarnessReportScenario[];
  readonly guidedReview: readonly HarnessReportField[];
  readonly currentState: readonly HarnessReportField[];
  readonly transcript: readonly HarnessReportTranscriptEntry[];
}

/**
 * Describes optional page-visibility evidence collected during a physical
 * screen-off check. Embedded WebViews do not necessarily expose screen power
 * changes as document visibility transitions, so absence is informational.
 */
export function describeOptionalVisibilityEvidence(
  hiddenObserved: boolean,
  returnedObserved: boolean,
): string {
  if (hiddenObserved && returnedObserved) return "Hidden and return observed";
  if (hiddenObserved) return "Hidden observed; return not observed";
  if (returnedObserved) return "Return observed without hidden event";
  return "Not observed (informational)";
}

function tableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll(/\r?\n/gu, "<br>");
}

function table(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const header = `| ${headers.map(tableCell).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(tableCell).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

function fieldTable(fields: readonly HarnessReportField[]): string {
  return table(
    ["Field", "Value"],
    fields.map(({ label, value }) => [label, value]),
  );
}

/**
 * Formats a self-contained GitHub-flavoured Markdown report for manual review.
 *
 * The caller owns data collection and must exclude Vault paths, contents,
 * credentials, and other consumer data before invoking this formatter.
 */
export function formatHarnessMarkdownReport(
  input: HarnessMarkdownReportInput,
): string {
  const scenarios = table(
    ["Scenario", "Mode", "Status", "Detail"],
    input.scenarios.map(({ id, title, mode, status, detail }) => [
      `${title} (${id})`,
      mode,
      status,
      detail ?? "Not recorded",
    ]),
  );
  const transcript = JSON.stringify(input.transcript, null, 2);
  return `## Fancy Kit Harness report

Generated at \`${tableCell(input.generatedAt)}\`.

### Environment

${fieldTable(input.environment)}

### Contract scenarios

${scenarios}

### Guided wake-lock review

${fieldTable(input.guidedReview)}

### Current state

${fieldTable(input.currentState)}

<details>
<summary>Event transcript</summary>

\`\`\`json
${transcript}
\`\`\`
</details>

This report was copied locally and was not transmitted by Fancy Kit. It intentionally excludes Vault names, paths, file names, file contents, and credentials. Review the environment information before posting because a user agent and screen dimensions may identify the device or operating system.
`;
}
