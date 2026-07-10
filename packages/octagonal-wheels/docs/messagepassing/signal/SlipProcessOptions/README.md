[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [messagepassing](../../README.md) / [signal](../README.md) / SlipProcessOptions

# Type Alias: SlipProcessOptions\<T\>

```ts
type SlipProcessOptions<T> = {
  callback: () => Promise<T> | T;
} & 
  | {
  dropSlipWithRisks?: boolean;
  submitAsSuccess?: false;
}
  | {
  submitAsSuccess: true;
  transformError?: (error: any) => any;
};
```

Defined in: [src/bureau/SlipBoard.ts:46](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L46)

## Type Declaration

### callback()

```ts
callback: () => Promise<T> | T;
```

#### Returns

`Promise`\<`T`\> \| `T`

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
