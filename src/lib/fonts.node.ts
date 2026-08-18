const FONT_FILES = [
	'DejaVuSansMono-Bold.ttf',
	'DejaVuSansMono-BoldOblique.ttf',
	'DejaVuSansMono-Oblique.ttf',
	'DejaVuSansMono.ttf',
	'LibertinusSerif-Bold.otf',
	'LibertinusSerif-BoldItalic.otf',
	'LibertinusSerif-Italic.otf',
	'LibertinusSerif-Regular.otf',
	'LibertinusSerif-Semibold.otf',
	'LibertinusSerif-SemiboldItalic.otf',
	'NewCM10-Bold.otf',
	'NewCM10-BoldItalic.otf',
	'NewCM10-Italic.otf',
	'NewCM10-Regular.otf',
	'NewCMMath-Bold.otf',
	'NewCMMath-Book.otf',
	'NewCMMath-Regular.otf'
] as const;

export async function getServerTypstFontAssets(): Promise<readonly Uint8Array<ArrayBufferLike>[]> {
	const moduleModule = 'node:module';
	const fsModule = 'node:fs/promises';
	const [{ createRequire }, { readFile }] = await Promise.all([
		import(/* @vite-ignore */ moduleModule),
		import(/* @vite-ignore */ fsModule)
	]);
	const require = createRequire(`${process.cwd()}/package.json`);

	return Promise.all(
		FONT_FILES.map((file) => readFile(require.resolve(`typlete/assets/fonts/${file}`)))
	);
}
