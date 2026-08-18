export async function getLocalTypstFontAssets(): Promise<readonly string[]> {
	if (import.meta.env.SSR) {
		return (await import('./fonts.inline.ts')).LOCAL_TYPST_FONT_ASSETS;
	}

	return (await import('./fonts.browser.ts')).LOCAL_TYPST_FONT_ASSETS;
}
