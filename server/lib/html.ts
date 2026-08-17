/**
 * Escape a value for interpolation into an HTML email body.
 *
 * Every email in this app is built with template literals, and several
 * interpolate values the user controls — a budget name, an expense description,
 * invoice notes, a client name, and (reachable from the *public, unauthenticated*
 * feature-request form) a request title and body. Unescaped, those inject markup
 * into the recipient's inbox.
 *
 * React escapes for us in the app UI; these templates are raw strings, so nothing
 * does it here unless we do.
 *
 * `&` must be replaced first, or it would double-escape the entities the later
 * replacements introduce.
 */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * Escape a value that may be absent, yielding '' for null/undefined so callers
 * can interpolate without a ternary at every site.
 */
export function escapeHtmlOrEmpty(value: string | null | undefined): string {
	return value == null ? '' : escapeHtml(value);
}
