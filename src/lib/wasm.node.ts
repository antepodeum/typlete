export interface ServerTypstWasmAssets {
	compiler: Uint8Array<ArrayBufferLike>;
	renderer: Uint8Array<ArrayBufferLike>;
}

const COMPILER_ASSET = 'typlete/assets/wasm/compiler';
const RENDERER_ASSET = 'typlete/assets/wasm/renderer';

export async function getServerTypstWasmAssets(): Promise<ServerTypstWasmAssets> {
	const moduleModule = 'node:module';
	const fsModule = 'node:fs/promises';
	const [{ createRequire }, { readFile }] = await Promise.all([
		import(/* @vite-ignore */ moduleModule),
		import(/* @vite-ignore */ fsModule)
	]);
	const require = createRequire(`${process.cwd()}/package.json`);
	const [compiler, renderer] = await Promise.all([
		readFile(require.resolve(COMPILER_ASSET)),
		readFile(require.resolve(RENDERER_ASSET))
	]);

	return { compiler, renderer };
}
