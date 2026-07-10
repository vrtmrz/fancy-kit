# Vrtmrz plug-in toolkit

This private npm workspace develops small, independently publishable libraries for Obsidian plug-ins and their shared test fixtures.

## Packages

- [`@vrtmrz/obsidian-plugin-kit`](packages/obsidian-plugin-kit): reusable, testable Obsidian UI primitives.
- [`@vrtmrz/ui-interactions`](packages/ui-interactions): framework-neutral UI contracts, drivers, and an App-free consumer test harness.

## Workspace applications

- [`obsidian-showcase`](apps/obsidian-showcase): a private interactive catalogue and real Obsidian E2E fixture.

## Development

```bash
npm run check:all
npm run test
npm run build
npm run build:showcase
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for API documentation, test, and UI automation requirements.
