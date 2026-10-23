import { appendFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { sources, validateSha } from "./contract.mjs";

function positiveId(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid GitHub object ID.");
  return value;
}

/** Use the public GitHub API only; tokens cannot be redirected to caller-chosen hosts. */
export function githubApi(token, fetcher = fetch) {
  return async (path) => {
    const response = await fetcher(`https://api.github.com${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "fancy-kit-library-preview",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub API request failed (${response.status}): ${path}`);
    return response.json();
  };
}

async function* pages(api, path, key) {
  for (let page = 1; page <= 10; page++) {
    const response = await api(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    const values = key ? response[key] : response;
    if (!Array.isArray(values)) throw new Error("Unexpected GitHub list response.");
    yield values;
    if (values.length < 100) return;
  }
  throw new Error("GitHub preview lookup exceeded ten pages; select a newer CI run.");
}

async function authoriseSource(api, source, sha) {
  const prefix = `/repos/${source.repository}`;
  const comparison = await api(`${prefix}/compare/${sha}...main`);
  if (["ahead", "identical"].includes(comparison.status) && comparison.merge_base_commit?.sha === sha) {
    return "main";
  }
  for await (const pulls of pages(api, `${prefix}/commits/${sha}/pulls`)) {
    const pull = pulls.find((entry) => entry.state === "open" && entry.head?.sha === sha &&
      entry.head.repo?.full_name === source.repository && entry.base?.repo?.full_name === source.repository &&
      entry.base.ref === "main");
    if (pull) return `pull-request-${positiveId(pull.number)}`;
  }
  throw new Error(`${source.repository}: the SHA must belong to main or be the exact head of an open same-repository pull request into main.`);
}

/** Resolve a source SHA to one immutable artefact from a successful allowed workflow. */
export async function selectPreview(key, sha, api, now = Date.now()) {
  validateSha(sha);
  const source = Object.hasOwn(sources, key) ? sources[key] : undefined;
  if (!source) throw new Error("Unsupported preview library.");
  const ownership = await authoriseSource(api, source, sha);
  const prefix = `/repos/${source.repository}/actions`;
  const workflow = await api(`${prefix}/workflows/${source.workflow}`);
  const workflowId = positiveId(workflow.id);
  if (workflow.path !== `.github/workflows/${source.workflow}`) throw new Error("Unexpected producer workflow path.");
  for await (const runs of pages(api, `${prefix}/workflows/${workflowId}/runs?head_sha=${sha}&status=completed`, "workflow_runs")) {
    for (const run of runs) {
      if (run.status !== "completed" || run.conclusion !== "success" || run.head_sha !== sha ||
          run.workflow_id !== workflowId || !["push", "pull_request"].includes(run.event) ||
          run.repository?.full_name !== source.repository || run.head_repository?.full_name !== source.repository) continue;
      const runId = positiveId(run.id);
      const runAttempt = positiveId(run.run_attempt);
      const matches = [];
      for await (const artifacts of pages(api, `${prefix}/runs/${runId}/artifacts`, "artifacts")) {
        for (const entry of artifacts) {
          const match = new RegExp(`^package-preview-${sha}-([1-9][0-9]*)$`, "u").exec(entry.name);
          const attempt = match ? Number(match[1]) : 0;
          if (Number.isSafeInteger(attempt) && attempt > 0 && attempt <= runAttempt &&
              entry.expired === false && Date.parse(entry.expires_at) > now) {
            matches.push({ ...entry, attempt });
          }
        }
      }
      matches.sort((left, right) => right.attempt - left.attempt);
      if (matches.length > 1 && matches[0].attempt === matches[1].attempt) {
        throw new Error("The producer run contains repeated preview artefacts for one attempt.");
      }
      if (matches.length) {
        return { key, repository: source.repository, sha, ownership, runId,
          runAttempt, artifactId: positiveId(matches[0].id), artifactAttempt: matches[0].attempt };
      }
    }
  }
  throw new Error(`${source.repository}: no successful CI run has an unexpired package preview for ${sha}.`);
}

/** Validate both inputs before resolving either; blank inputs retain the committed lockfile. */
export async function selectPreviews(inputs, api) {
  for (const value of Object.values(inputs)) if (value !== "") validateSha(value);
  const result = [];
  for (const key of ["commonlib", "kit"]) {
    if (inputs[key]) result.push(await selectPreview(key, inputs[key], api));
  }
  return result;
}

async function main() {
  const selections = await selectPreviews({
    commonlib: process.env.PREVIEW_COMMONLIB_SHA ?? "",
    kit: process.env.PREVIEW_KIT_SHA ?? "",
  }, githubApi(process.env.PREVIEW_GITHUB_TOKEN));
  const directory = await mkdtemp(join(process.env.RUNNER_TEMP, "library-preview-"));
  for (const selection of selections) {
    selection.directory = join(directory, selection.key);
    await mkdir(selection.directory);
    await appendFile(process.env.GITHUB_OUTPUT,
      `${selection.key}-run-id=${selection.runId}\n${selection.key}-artifact-id=${selection.artifactId}\n${selection.key}-directory=${selection.directory}\n`);
  }
  const plan = join(directory, "plan.json");
  await writeFile(plan, `${JSON.stringify(selections)}\n`);
  await appendFile(process.env.GITHUB_OUTPUT, `plan=${plan}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
