import assert from 'node:assert/strict';
import test from 'node:test';

import { getServerTypstWasmAssets } from '../dist/wasm.node.js';

const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d];

test('packaged server runtime loads compiler and renderer WASM from Typlete itself', async () => {
	const assets = await getServerTypstWasmAssets();

	for (const [name, bytes] of Object.entries(assets)) {
		assert.ok(bytes.byteLength > 1024, `${name} WASM should contain the actual module`);
		assert.deepEqual(
			[...bytes.subarray(0, 4)],
			WASM_MAGIC,
			`${name} should be a WebAssembly module`
		);
	}
});
