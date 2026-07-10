[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / TransporterBackbone

# Interface: TransporterBackbone\<T\>

Defined in: [src/conduit/transporterAdapter.ts:7](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L7)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="close"></a> `close` | () => `void` | [src/conduit/transporterAdapter.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L11) |
| <a id="dispatchmessage"></a> `dispatchMessage` | (`type`: `string`, `message`: `T`) => `void` | [src/conduit/transporterAdapter.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L10) |
| <a id="removelistener"></a> `removeListener` | (`type`: `string`, `callback`: (`message`: `T`) => `void`) => `void` | [src/conduit/transporterAdapter.ts:9](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L9) |
| <a id="setlistener"></a> `setListener` | (`type`: `string`, `callback`: (`message`: `T`) => `void`, `options?`: [`ListenerOptions`](../ListenerOptions/README.md)) => () => `void` | [src/conduit/transporterAdapter.ts:8](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporterAdapter.ts#L8) |
