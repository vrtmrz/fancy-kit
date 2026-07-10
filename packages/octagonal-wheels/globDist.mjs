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
const distDirName = "dist";
const distDir = join(cwd, distDirName);
const files = sync("**/*.js", { cwd: distDir }).map((file) => {
    return file.split(sepWin).join(sep);
});
const map = files.flatMap((file) => {
    if (file == "index.js") {
        return [];
    }
    if (file.endsWith("xxhash-wasm.js")) {
        // Skip xxhash-wasm.js as it is not a module
        return [];
    }
    let exportPath = file.replace(/\.js$/, "");
    let typePath = file.replace(/\.js$/, ".d.ts");
    const writeTypePath = `./${distDirName}/${typePath}`;
    const writeImportPath = `./${distDirName}/${file}`;
    if (fs.existsSync(join(distDir, typePath)) === false) {
        console.warn(`Type definition file not found: ${typePath}`);
    }
    if (exportPath.endsWith("index")) {
        exportPath = exportPath.replace(/\/index$/, "");

        return [
            [`./${exportPath}.js`, { import: writeImportPath, types: writeTypePath }],
            [`./${exportPath}`, { import: writeImportPath, types: writeTypePath }],
            [`./${exportPath}/index.js`, { import: writeImportPath, types: writeTypePath }],
        ];
    }
    return [
        [`./${exportPath}`, { import: writeImportPath, types: writeTypePath }],
        [`./${exportPath}.js`, { import: writeImportPath, types: writeTypePath }],
    ];
});
const exportObject = {
    ".": {
        import: `./${distDirName}/index.js`,
        types: `./${distDirName}/index.d.ts`,
    },
    "./package.json": `./package.json`,
    ...Object.fromEntries(
        map.sort((a, b) => {
            return String(a[0]).localeCompare(String(b[0]));
        })
    ),
};
const pkg = JSON.parse(fs.readFileSync("./package.json") + "");
pkg.exports = exportObject;
fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 4) + "\n");
console.log("Updated package.json exports field.");
// console.dir(exportObject);
