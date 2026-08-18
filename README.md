# Typlete

Svelte 5 components and Markdown helpers for rendering Typst as SVG.

## Requirements

- Svelte `>= 5.36`
- Svelte async rendering enabled: `compilerOptions.experimental.async = true`
- Vite/SvelteKit-compatible asset handling for browser WASM imports

```js
// svelte.config.js
export default {
	compilerOptions: {
		experimental: {
			async: true
		}
	}
};
```

## Install

```bash
pnpm add typlete
```

## Svelte usage

```svelte
<script lang="ts">
	import { TypstInline, TypstBlock } from 'typlete';
</script>

<p>
	Inline formula: <TypstInline source="integral_0^1 x^2 dif x" />
</p>

<TypstBlock source="sum_(i=1)^n i = (n(n+1)) / 2" />
```

`source` is Typst math by default. Typlete wraps math input in Typst math delimiters and escapes delimiter-breaking characters (`$` and `#`) before compiling. Do not include outer `$...$`; pass the formula body.

## CSS color inheritance

The implicit foreground of inline SVG rendered by Typlete inherits the surrounding CSS `color`, just like normal text.

```svelte
<p class="secondary">
	Energy: <TypstInline source="E = m c^2" />
</p>

<style>
	.secondary {
		color: var(--text-secondary);
	}
</style>
```

This also follows normal CSS state changes such as `:hover`, disabled states, theme classes, and inherited custom properties. No formula-specific color prop is required.

Explicit Typst text colors still take precedence and are preserved in the generated SVG:

```svelte
<TypstInline source="alpha + beta" preamble="#set text(fill: red)" />
```

Color inheritance applies when the SVG is embedded inline, including the Svelte components, the server helper when its SVG is inserted inline, and Markdown `output: 'html'`. SVG used as an external image (`output: 'markdown-image'`, `output: 'asset'`, or a normal `<img>`) cannot inherit `color` from the surrounding HTML document.

## Raw Typst

Use `inputMode="raw"` for full Typst markup fragments that should not be wrapped as math. Raw mode passes the source to Typst unchanged, so user-controlled raw input needs separate policy around allowed Typst features and assets.

```svelte
<TypstBlock inputMode="raw" source={'#rect(radius: 6pt, inset: 10pt)[#strong[Raw Typst]]'} />
```

```svelte
<!-- math mode: Typlete wraps source in Typst math -->
<TypstInline source="alpha + beta" />

<!-- raw mode: Typlete passes source to Typst unchanged -->
<TypstInline inputMode="raw" source={'$alpha + beta$'} />
```

`inputMode="markup"` is accepted as a compatibility alias for `raw`.

## Props

`Typst`, `TypstInline`, and `TypstBlock` support these common props:

```ts
type TypstMode = 'inline' | 'block';
type TypstInputMode = 'math' | 'raw' | 'markup';
type TypstSvgSanitizer = (svg: string) => string;

source?: string;
inputMode?: TypstInputMode;
preamble?: string;
textSize?: string;
pageMargin?: string;
cache?: boolean;
sanitize?: TypstSvgSanitizer;
ariaLabel?: string;
title?: string;
loadingLabel?: string;
throwOnError?: boolean;
errorMode?: 'badge' | 'none';
class?: string;
```

`Typst` also accepts `mode`. `TypstInline` and `TypstBlock` set `mode` automatically.

## SSR and local runtime assets

During SSR/build, Typlete renders SVG on the server. After hydration, the browser keeps the server-rendered SVG and loads the Typst WASM runtime only when the formula has to be rendered again on the client.

Typlete ships its own copies of the compiler/renderer WASM modules and the default Typst `text` font set inside the package. Browser builds emit those files as application-local assets; SSR reads the same installed Typlete assets directly from disk and passes their bytes to the Typst runtime. Normal formula rendering therefore does not fetch runtime assets from a CDN, depend on transitive-package layout, or require consumers to copy WASM/fonts manually.

Raw Typst that explicitly imports external Typst packages can still perform network access according to the underlying Typst package registry. That is separate from Typlete's own runtime assets.

## Error behavior

By default, render failures keep the last successful SVG visible and show a small error badge.

```svelte
<TypstBlock source={formula} errorMode="badge" />
<TypstBlock source={formula} errorMode="none" />
```

Use `throwOnError={true}` when server-side render failures should fail the request/build instead of being converted to component state.

## Server helper

```ts
import { renderTypstSvgServer } from 'typlete/server';

const svg = await renderTypstSvgServer({
	source: 'integral_0^1 x^2 dif x',
	mode: 'block',
	inputMode: 'math',
	preamble: '',
	textSize: '11pt',
	pageMargin: '0pt',
	cache: true
});
```

## Markdown blocks

Typlete only renders namespaced Typlete fences. Normal `typst` fences stay normal Markdown code blocks, so documentation can show Typst source without triggering rendering.

Raw Typst render block:

````md
```typlete-typst
#set text(size: 12pt)
#rect[hello]
```
````

Math render block. The content is treated as a formula body; delimiter-breaking `$` and `#` characters are escaped before Typst compiles it:

````md
```typlete-math
sum_(i=1)^n i = (n(n+1)) / 2
```
````

Accepted render fence names:

```md
typlete -> raw Typst render block
typlete raw -> raw Typst render block
typlete typst -> raw Typst render block
typlete-typst -> raw Typst render block
typlete-raw -> raw Typst render block
typlete math -> math render block
typlete-math -> math render block
typlete-typst-math -> math render block
```

Typst source code remains source code:

````md
```typst
#set text(size: 12pt)
#rect[hello]
```
````

For inline formulas in MDsveX, use the Svelte component directly. The same math escaping applies:

```md
The value is <TypstInline source="alpha + beta" />.
```

## Markdown transform

```ts
import { transformTypleteMarkdown } from 'typlete/markdown';

const output = await transformTypleteMarkdown(markdown, {
	output: 'component'
});
```

Output modes:

```ts
type TypleteMarkdownOutput = 'component' | 'html' | 'markdown-image' | 'asset';
```

### Component output

Best for MDsveX/Svelte-aware Markdown pipelines.

```ts
await transformTypleteMarkdown(markdown, {
	output: 'component'
});
```

Produces Svelte component tags:

```svelte
<TypstBlock source={'#rect[hello]'} inputMode="raw" />
<TypstBlock source={'alpha + beta'} />
```

### HTML output

Best for renderers that accept raw HTML/SVG.

```ts
await transformTypleteMarkdown(markdown, {
	output: 'html'
});
```

This renders SVG immediately and inserts it into the Markdown output.

### Markdown image output

Best for renderers that do not support raw HTML but accept Markdown images.

```ts
await transformTypleteMarkdown(markdown, {
	output: 'markdown-image'
});
```

This renders SVG and inserts it as a `data:image/svg+xml` Markdown image.

### Asset output

Best for static sites.

```ts
await transformTypleteMarkdown(markdown, {
	output: 'asset',
	assetDir: 'static/typlete',
	assetBaseUrl: '/typlete'
});
```

This writes SVG files to `assetDir` and inserts normal Markdown image links.

## MDsveX preprocessor

Run the Typlete preprocessor before MDsveX so namespaced Typlete render fences are converted to Svelte component tags before MDsveX compiles the document.

```js
// svelte.config.js
import adapter from '@sveltejs/adapter-auto';
import { mdsvex } from 'mdsvex';
import { createTypstMdsvexPreprocessor } from 'typlete/markdown';

const config = {
	extensions: ['.svelte', '.svx', '.md'],
	preprocess: [
		createTypstMdsvexPreprocessor({
			output: 'component'
		}),
		mdsvex({
			extensions: ['.svx', '.md']
		})
	],
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	kit: {
		adapter: adapter()
	}
};

export default config;
```

For `output: 'component'`, the preprocessor injects this import when a document contains a rendered Typst fence:

```svelte
<script lang="ts">
	import { TypstInline, TypstBlock } from 'typlete';
</script>
```

Disable injection only if another MDsveX hook already imports the components:

```ts
createTypstMdsvexPreprocessor({
	output: 'component',
	injectComponentImports: false
});
```

## Rendering options for Markdown

Markdown helpers accept the same render options as component/server rendering:

```ts
await transformTypleteMarkdown(markdown, {
	output: 'asset',
	assetDir: 'static/typlete',
	assetBaseUrl: '/typlete',
	preamble: '',
	textSize: '11pt',
	pageMargin: '0pt',
	cache: true
});
```

## Sanitizing SVG

Typlete inserts compiler-produced SVG inline. By default it strips embedded SVG `<script>` tags and common script-like SVG attributes from that output. This is output-level defense-in-depth, not a sandbox for arbitrary raw Typst input or external assets. For stricter SVG sanitizing, pass a sanitizer.

DOMPurify is optional:

```ts
import { createDomPurifySvgSanitizer } from 'typlete/sanitizers/dompurify';

const sanitize = await createDomPurifySvgSanitizer();
```

Server-side DOMPurify requires both `dompurify` and `jsdom`:

```ts
import { createServerDomPurifySvgSanitizer } from 'typlete/server/dompurify';

const sanitize = await createServerDomPurifySvgSanitizer();
```

## Limitations

- Component SSR depends on Svelte experimental async rendering.
- Plain `typst` fences are never render instructions; use `typlete-typst`, `typlete-raw`, or `typlete-math` when Markdown should render Typst.
- Math mode and `typlete-math` escape `$` and `#` before wrapping the source in Typst math delimiters. Raw mode and `preamble` are passed to Typst unchanged.
- CSS text-color inheritance requires inline SVG. SVG loaded through `<img>`, including `markdown-image` and `asset` Markdown output, does not inherit the parent document's `color`.
- Server rendering temporarily guards Typst runtime fetches so SvelteKit does not track external runtime fetches during SSR.
- `html`, `markdown-image`, and `asset` output modes pre-render SVG immediately and are not reactive on the client.
