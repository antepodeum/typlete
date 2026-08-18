import { BROWSER } from 'esm-env';

export async function getLocalTypstFontAssets(): Promise<readonly string[]> {
	if (BROWSER) {
		return (await import('./fonts.browser.ts')).LOCAL_TYPST_FONT_ASSETS;
	}

	return (await import('./fonts.inline.ts')).LOCAL_TYPST_FONT_ASSETS;
}
