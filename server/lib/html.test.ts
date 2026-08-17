import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeHtmlOrEmpty } from './html';

describe('escapeHtml', () => {
	it('neutralises a script tag', () => {
		expect(escapeHtml('<script>alert(1)</script>')).toBe(
			'&lt;script&gt;alert(1)&lt;/script&gt;'
		);
	});

	it('escapes ampersands first, so entities are not double-escaped', () => {
		// A naive implementation that replaces < before & turns "<" into
		// "&amp;lt;" and the reader sees the literal text "&lt;".
		expect(escapeHtml('a & b < c')).toBe('a &amp; b &lt; c');
		expect(escapeHtml('&lt;')).toBe('&amp;lt;');
	});

	it('escapes quotes so a value cannot break out of an attribute', () => {
		expect(escapeHtml('" onmouseover="evil()')).toBe(
			'&quot; onmouseover=&quot;evil()'
		);
		expect(escapeHtml("it's")).toBe('it&#39;s');
	});

	it('leaves ordinary text untouched', () => {
		expect(escapeHtml('Groceries — March 2026')).toBe(
			'Groceries — March 2026'
		);
	});

	it('handles an empty string', () => {
		expect(escapeHtml('')).toBe('');
	});

	it('escapes every occurrence, not just the first', () => {
		expect(escapeHtml('<b><i>')).toBe('&lt;b&gt;&lt;i&gt;');
	});
});

describe('escapeHtmlOrEmpty', () => {
	it('yields an empty string for null and undefined', () => {
		expect(escapeHtmlOrEmpty(null)).toBe('');
		expect(escapeHtmlOrEmpty(undefined)).toBe('');
	});

	it('escapes a present value', () => {
		expect(escapeHtmlOrEmpty('<x>')).toBe('&lt;x&gt;');
	});
});
