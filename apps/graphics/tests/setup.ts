/**
 * jsdom brings its own typed arrays, while Node's TextEncoder and Buffer hand
 * back Node's. Bytes are told apart with `instanceof` in the code under test,
 * so one kind for everything: Node's. A browser has only one.
 */
const sample = new TextEncoder().encode('')
globalThis.Uint8Array = sample.constructor as Uint8ArrayConstructor
globalThis.ArrayBuffer = sample.buffer.constructor as ArrayBufferConstructor
