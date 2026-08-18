import { BROWSER } from 'esm-env';

export type TypstFontAsset = string | Uint8Array<ArrayBufferLike>;

export async function getLocalTypstFontAssets(): Promise<readonly TypstFontAsset[]> {
	if (BROWSER) {
		return (await import('./fonts.browser.ts')).LOCAL_TYPST_FONT_ASSETS;
	}

	return (await import('./fonts.node.ts')).getServerTypstFontAssets();
}
