//@eslint-disable-file
//@ts-expect-error
import fs from "fs";

["package.json", ".npmignore", "README.md", "LICENSE"].map((f) => fs.cpSync(`./${f}`, `./dist/${f}`));
