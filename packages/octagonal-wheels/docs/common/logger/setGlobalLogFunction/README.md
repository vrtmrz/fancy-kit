[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [common](../../README.md) / [logger](../README.md) / setGlobalLogFunction

# Function: setGlobalLogFunction()

```ts
function setGlobalLogFunction(
  logger: (message: any, level: number, key?: string) => void,
): void;
```

Defined in: packages/octagonal-wheels/src/common/logger.ts:75

Sets the global log function.

## Parameters

| Parameter | Type                                                              | Description                                            |
| --------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| `logger`  | (`message`: `any`, `level`: `number`, `key?`: `string`) => `void` | The logger function to set as the global log function. |

## Returns

`void`
