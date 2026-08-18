import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTypstDocument } from './document.ts';
import { inheritTypstTextColor, TYPLETE_INHERITED_TEXT_COLOR } from './svg.ts';

const baseRequest = {
	source: 'alpha + beta',
	mode: 'inline' as const,
	inputMode: 'math' as const,
	preamble: '',
	textSize: '11pt',
	pageMargin: '0pt',
	cache: true
};

describe('CSS text color inheritance', () => {
	it('marks only the implicit Typst text foreground with the sentinel color', () => {
		const document = createTypstDocument(baseRequest);

		assert.match(
			document,
			new RegExp(
				`#set text\\(size: 11pt, fill: rgb\\("${TYPLETE_INHERITED_TEXT_COLOR.replace('#', '\\#')}"\\)\\)`
			)
		);
	});

	it('keeps the preamble after the default so explicit global text colors override inheritance', () => {
		const document = createTypstDocument({
			...baseRequest,
			preamble: '#set text(fill: red)'
		});

		assert.ok(
			document.indexOf(TYPLETE_INHERITED_TEXT_COLOR) < document.indexOf('#set text(fill: red)')
		);
	});

	it('rewrites the sentinel foreground to currentColor', () => {
		const svg = `<svg><g class="typst-text"><use fill="${TYPLETE_INHERITED_TEXT_COLOR}" /></g></svg>`;

		assert.equal(
			inheritTypstTextColor(svg),
			'<svg><g class="typst-text"><use fill="currentColor" /></g></svg>'
		);
	});

	it('accepts common SVG color serialization variants', () => {
		const svg =
			'<svg><g class="typst-text"><use fill="#01FE02"/><use fill="rgb(1, 254, 2)"/></g></svg>';

		assert.equal(
			inheritTypstTextColor(svg),
			'<svg><g class="typst-text"><use fill="currentColor"/><use fill="currentColor"/></g></svg>'
		);
	});

	it('preserves explicit colors', () => {
		const svg = '<svg><g class="typst-text"><use fill="#000000"/><use fill="#ff0000"/></g></svg>';

		assert.equal(inheritTypstTextColor(svg), svg);
	});

	it('does not rewrite matching paint outside Typst text groups', () => {
		const svg = `<svg><path fill="${TYPLETE_INHERITED_TEXT_COLOR}"/><g class="shape"><path fill="${TYPLETE_INHERITED_TEXT_COLOR}"/></g></svg>`;

		assert.equal(inheritTypstTextColor(svg), svg);
	});

	it('rewrites inherited paint on Typst math shapes when requested', () => {
		const svg = `<svg><path class="typst-shape" fill="none" stroke="${TYPLETE_INHERITED_TEXT_COLOR}"/></svg>`;

		assert.equal(
			inheritTypstTextColor(svg, true),
			'<svg><path class="typst-shape" fill="none" stroke="currentColor"/></svg>'
		);
	});

	it('does not rewrite arbitrary shapes even when math-shape rewriting is enabled', () => {
		const svg = `<svg><path class="custom-shape" stroke="${TYPLETE_INHERITED_TEXT_COLOR}"/></svg>`;

		assert.equal(inheritTypstTextColor(svg, true), svg);
	});

	it('rewrites nested glyph elements inside Typst text groups only', () => {
		const svg = `<svg><g class="typst-text"><g><use fill="${TYPLETE_INHERITED_TEXT_COLOR}"/></g></g><use fill="${TYPLETE_INHERITED_TEXT_COLOR}"/></svg>`;

		assert.equal(
			inheritTypstTextColor(svg),
			`<svg><g class="typst-text"><g><use fill="currentColor"/></g></g><use fill="${TYPLETE_INHERITED_TEXT_COLOR}"/></svg>`
		);
	});
});
