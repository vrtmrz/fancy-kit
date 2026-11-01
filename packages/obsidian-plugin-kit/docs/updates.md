# Updates

## Unreleased

## 0.1.7

### Command availability

- We can share command availability checks through `createCommandCheck` from the focused `@vrtmrz/obsidian-plugin-kit/command` entry.
    - The helper evaluates the selector on every invocation. Check-only calls report availability without running the action; action calls pass the selected value through only when it is truthy.
    - Synchronous action failures propagate. The action owns asynchronous error handling because the helper does not await returned promises.
    - The focused entry imports without Obsidian or DOM globals and can be tested independently of the host.

### Compatibility

- Existing entry points and the `obsidian >=1.8.7` peer requirement are retained. Runtime dependencies remain `@vrtmrz/ui-interactions@0.1.2`, `@vrtmrz/secret-store@0.1.0`, and `@vrtmrz/value-store@0.1.0`.
- Applications retain selection, action, and asynchronous error policies. Commonlib and Self-hosted LiveSync integrations remain separate release work.
