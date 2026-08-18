const SCRIPT_TAG_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const EVENT_HANDLER_QUOTED_PATTERN = /\s+on[a-z][\w:-]*\s*=\s*(['"])[\s\S]*?\1/gi;
const EVENT_HANDLER_UNQUOTED_PATTERN = /\s+on[a-z][\w:-]*\s*=\s*[^\s>]+/gi;
const JAVASCRIPT_HREF_PATTERN = /\s+(?:href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi;

// Typst currently exports concrete paint values to SVG rather than CSS `currentColor`.
// Typlete assigns this deliberately unusual color only to the implicit text foreground,
// then rewrites it after rendering. Explicit Typst colors therefore remain untouched.
export const TYPLETE_INHERITED_TEXT_COLOR = '#01fe02';

const INHERITED_TEXT_HEX_PATTERN = /#01fe02\b/gi;
const INHERITED_TEXT_RGB_PATTERN = /rgb\(\s*1\s*,\s*254\s*,\s*2\s*\)/gi;
const SVG_TAG_PATTERN = /<[^>]+>/g;
const SVG_CLASS_PATTERN = /\bclass\s*=\s*(['"])(.*?)\1/i;

export function stripSvgScripts(svg: string): string {
	return svg
		.replace(SCRIPT_TAG_PATTERN, '')
		.replace(EVENT_HANDLER_QUOTED_PATTERN, '')
		.replace(EVENT_HANDLER_UNQUOTED_PATTERN, '')
		.replace(JAVASCRIPT_HREF_PATTERN, '');
}

export function inheritTypstTextColor(svg: string, includeMathShapes = false): string {
	let typstTextDepth = 0;

	return svg.replace(SVG_TAG_PATTERN, (tag) => {
		const closingTag = /^<\s*\//.test(tag);

		if (closingTag) {
			if (typstTextDepth > 0) typstTextDepth -= 1;
			return tag;
		}

		const isTypstTextRoot = isTypstTextGroup(tag);
		const insideTypstText = typstTextDepth > 0 || isTypstTextRoot;
		// Typst emits structural math rules (fraction/radical/overline/underline bars)
		// as standalone `typst-shape` paths rather than descendants of `typst-text`.
		// Only math input opts into rewriting those shapes so raw/markup drawings keep
		// their explicit paint unchanged.
		const isMathShape = includeMathShapes && isTypstShape(tag);
		const rewritten = insideTypstText || isMathShape ? replaceInheritedTextPaint(tag) : tag;

		if (insideTypstText && !/\/\s*>$/.test(tag)) {
			typstTextDepth += 1;
		}

		return rewritten;
	});
}

function isTypstTextGroup(tag: string): boolean {
	if (!/^<\s*g\b/i.test(tag)) return false;

	const className = tag.match(SVG_CLASS_PATTERN)?.[2];
	return className?.split(/\s+/).includes('typst-text') ?? false;
}

function isTypstShape(tag: string): boolean {
	const className = tag.match(SVG_CLASS_PATTERN)?.[2];
	return className?.split(/\s+/).includes('typst-shape') ?? false;
}

function replaceInheritedTextPaint(tag: string): string {
	return tag
		.replace(INHERITED_TEXT_HEX_PATTERN, 'currentColor')
		.replace(INHERITED_TEXT_RGB_PATTERN, 'currentColor');
}
