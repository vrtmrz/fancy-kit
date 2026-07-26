const { Plugin } = require("obsidian");

const INPUT_KEY = "fancy-kit-e2e-first-load-input";
const OBSERVED_KEY = "fancy-kit-e2e-first-load-observed";
const LOAD_COUNT_KEY = "fancy-kit-e2e-first-load-count";

module.exports = class SessionLifecycleFixturePlugin extends Plugin {
  async onload() {
    const previousCount = Number.parseInt(
      localStorage.getItem(LOAD_COUNT_KEY) ?? "0",
      10,
    );
    localStorage.setItem(LOAD_COUNT_KEY, String(previousCount + 1));
    localStorage.setItem(
      OBSERVED_KEY,
      localStorage.getItem(INPUT_KEY) ?? "<missing>",
    );
  }
};
