// Generate package.json exports field from dist directory
// And, also generate several sorts of exports for the sake of compatibility
// for example:
//  dist/conduit/index.js to...
//  -> dist/conduit
//  -> dist/conduit.js
//  -> dist/conduit/index.js
import { sync } from "glob";
import fs from "node:fs";
import { join } from "node:path";
import { sep as sepWin } from "node:path/win32";
import { sep } from "node:path/posix";
const cwd = import.meta.dirname;
const distDirName = "src";
const distDir = join(cwd, distDirName);
const files = sync("**/*.ts", { cwd: distDir }).map((file) => {
    return file.split(sepWin).join(sep);
});
const map = files.flatMap((file) => {
    if (file == "index.ts") {
        return [];
    }
    if (file.indexOf(".test.") > -1) {
        return [];
    }
    if (file.indexOf(".bench.") > -1) {
        return [];
    }
    let exportPath = file.replace(/\.ts$/, "");
    if (exportPath.endsWith("index")) {
        exportPath = exportPath.replace(/\/index$/, "");
        return [
            [`./${exportPath}.ts`, `./${distDirName}/${file}`],
            [`./${exportPath}`, `./${distDirName}/${file}`],
            [`./${exportPath}/index.ts`, `./${distDirName}/${file}`],
        ];
    }
    return [
        [`./${exportPath}`, `./${distDirName}/${file}`],
        [`./${exportPath}.ts`, `./${distDirName}/${file}`],
    ];
});
const exportObject = {
    ".": `./${distDirName}/index.ts`,
    // "./package.json": `./package.json`,
    ...Object.fromEntries(map),
};
const pkg = JSON.parse(fs.readFileSync("./deno.json") + "");
pkg.exports = exportObject;
fs.writeFileSync("./deno.json", JSON.stringify(pkg, null, 4) + "\n");

console.dir(exportObject);
