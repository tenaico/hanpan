/**
 * Test environment fixes for jsdom.
 *
 * jsdom brings its own typed arrays, while Node's TextEncoder and streams hand
 * back Node's. The zip library tells bytes from other values with `instanceof`,
 * so bytes of the "other" kind are refused. One kind for everything: Node's.
 * A browser has only one, so this is a property of the test environment alone.
 */
const sample = new TextEncoder().encode('')
globalThis.Uint8Array = sample.constructor as Uint8ArrayConstructor
globalThis.ArrayBuffer = sample.buffer.constructor as ArrayBufferConstructor

// The drawing library asks for the colour scheme once when it is created.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}
