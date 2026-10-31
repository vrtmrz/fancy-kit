[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / TransporterBackbone

# Interface: TransporterBackbone\<T\>

Defined in: packages/octagonal-wheels/src/conduit/transporterAdapter.ts:7

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                                       | Type                                                                                                                                      | Defined in                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| <a id="close"></a> `close`                     | () => `void`                                                                                                                              | packages/octagonal-wheels/src/conduit/transporterAdapter.ts:11 |
| <a id="dispatchmessage"></a> `dispatchMessage` | (`type`: `string`, `message`: `T`) => `void`                                                                                              | packages/octagonal-wheels/src/conduit/transporterAdapter.ts:10 |
| <a id="removelistener"></a> `removeListener`   | (`type`: `string`, `callback`: (`message`: `T`) => `void`) => `void`                                                                      | packages/octagonal-wheels/src/conduit/transporterAdapter.ts:9  |
| <a id="setlistener"></a> `setListener`         | (`type`: `string`, `callback`: (`message`: `T`) => `void`, `options?`: [`ListenerOptions`](../ListenerOptions/README.md)) => () => `void` | packages/octagonal-wheels/src/conduit/transporterAdapter.ts:8  |
