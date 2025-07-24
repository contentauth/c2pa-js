import init, { foobar as wasmFoobar } from '@contentauth/wasm';

export async function foobar(): Promise<string> {
  await init();
  return 'foobar' + wasmFoobar();
}
