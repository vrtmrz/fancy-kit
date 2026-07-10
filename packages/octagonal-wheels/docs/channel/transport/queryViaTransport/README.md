[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [transport](../README.md) / queryViaTransport

# Function: queryViaTransport()

```ts
function queryViaTransport<T, U>(
   transport: ITransport, 
   channelName: string, 
   args: T, 
   subId: undefined | string, 
timeoutMs: number): Promise<Awaited<U>>;
```

Defined in: [src/channel/transport.ts:40](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/transport.ts#L40)

Query via Transport with Timeout and Response Handling

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transport` | [`ITransport`](../ITransport/README.md) | an ITransport instance |
| `channelName` | `string` | the name of the channel to query |
| `args` | `T` | the arguments to pass to the channel function |
| `subId` | `undefined` \| `string` | the subscriber ID to target (optional) |
| `timeoutMs` | `number` | the timeout duration in milliseconds (optional) |

## Returns

`Promise`\<`Awaited`\<`U`\>\>

a promise that resolves with the result or rejects with an error
