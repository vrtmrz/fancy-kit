import {readFileSync, writeFileSync} from "fs";

const source = "./README.src.md";
const target = "./README.md";
const coverage = readFileSync("./coverage/coverage-text.txt", "utf-8").trim();

const content = readFileSync(source, "utf-8")
    .replace(/{coverage}/g, coverage);

writeFileSync(target, content);