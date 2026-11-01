import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

const references = [
    ["collection/TypedArrayReader", "binary/TypedArrayReader"],
    ["collection/concatUInt8Array", "binary/concatUInt8Array"],
    ["collection/createTypedArrayReader", "binary/createTypedArrayReader"],
    ["object/decodeAnyArray", "encoding/decodeAnyArray"],
    ["object/encodeAnyArray", "encoding/encodeAnyArray"],
];

/** Keeps established reference paths linked to their maintained API pages. */
export function load(app) {
    app.renderer.postMarkdownRenderAsyncJobs.push(async ({ outputDirectory }) => {
        for (const [previous, current] of references) {
            const target = join(outputDirectory, current, "README.md");
            await access(target);
            const destination = join(outputDirectory, previous, "README.md");
            const link = relative(dirname(destination), target).split(sep).join("/");
            const name = previous.split("/").at(-1);
            await mkdir(dirname(destination), { recursive: true });
            await writeFile(
                destination,
                `# ${name}\n\nDocumentation for this compatibility entry is maintained at [${name}](${link}).\n`
            );
        }
    });
}
