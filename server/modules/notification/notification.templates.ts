import { escapeHtml, escapeHtmlOrEmpty } from '@/server/lib/html';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Shared layout for notification emails.
 *
 * Six notification types landed at once; without this each would carry its own
 * copy of the same 40 lines of table markup. Every caller-supplied string is
 * escaped here, so a sender cannot forget — the one exception is `rows[].valueHtml`,
 * which is opt-in raw for pre-formatted currency (see below).
 *
 * Existing budget-alert and income templates are deliberately NOT migrated onto
 * this: they work, they are visually tuned, and re-rendering live email through a
 * new code path to save duplication is not a trade worth making. New types use
 * this; the old two can migrate when one of them next needs editing.
 *
 * Inline styles and literal hex are required — email clients strip classes,
 * custom properties, and <style> blocks.
 */

const BRAND = '#0D9488';
const INK = '#111827';
const MUTED = '#6B7280';
const BODY = '#374151';
const HAIRLINE = '#E5E7EB';
const FOOTER = '#9CA3AF';
const PANEL = '#F9FAFB';

export type EmailRow = {
	label: string;
	/** Plain text; escaped for you. */
	value?: string;
	/**
	 * Pre-rendered HTML for the value cell. Use ONLY for values this codebase
	 * produced itself — formatted currency, percentages — never for user input.
	 */
	valueHtml?: string;
	/** Optional colour for the value cell. */
	color?: string;
};

export type NotificationEmailInput = {
	headline: string;
	/** Accent colour for the headline. Defaults to the brand teal. */
	headlineColor?: string;
	recipientName: string | null;
	/** Lead paragraph. Escaped. */
	message: string;
	rows?: EmailRow[];
	cta?: { label: string; path: string };
	/** Sentence completing "You received this because …". Escaped. */
	footerReason: string;
};

function renderRows(rows: EmailRow[]): string {
	if (rows.length === 0) return '';

	const cells = rows
		.map((row) => {
			const value = row.valueHtml ?? escapeHtml(row.value ?? '');
			const color = row.color ?? INK;
			return `<tr><td style="padding:8px 0;color:${MUTED};">${escapeHtml(row.label)}</td><td style="padding:8px 0;text-align:right;font-weight:600;color:${color};">${value}</td></tr>`;
		})
		.join('');

	return `<div style="background:${PANEL};border-radius:8px;padding:20px;margin-bottom:24px;"><table style="width:100%;border-collapse:collapse;font-size:14px;">${cells}</table></div>`;
}

export function renderNotificationEmail(input: NotificationEmailInput): string {
	const accent = input.headlineColor ?? BRAND;
	const greeting = escapeHtmlOrEmpty(input.recipientName) || 'there';

	const cta = input.cta
		? `<a href="${APP_URL}${input.cta.path}" style="display:inline-block;padding:12px 24px;background-color:${BRAND};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:500;">${escapeHtml(input.cta.label)}</a>`
		: '';

	return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="padding:32px 24px;border-bottom:3px solid ${BRAND};">
    <h1 style="margin:0;font-size:20px;color:${BRAND};">Budget Planner</h1>
  </div>
  <div style="padding:32px 24px;">
    <h2 style="margin:0 0 16px;font-size:22px;color:${accent};">${escapeHtml(input.headline)}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:${BODY};line-height:1.6;">Hi ${greeting},</p>
    <p style="margin:0 0 24px;font-size:15px;color:${BODY};line-height:1.6;">${escapeHtml(input.message)}</p>
    ${renderRows(input.rows ?? [])}
    ${cta}
  </div>
  <div style="padding:16px 24px;border-top:1px solid ${HAIRLINE};font-size:12px;color:${FOOTER};">
    You received this because ${escapeHtml(input.footerReason)}. <a href="${APP_URL}/settings/notifications" style="color:${BRAND};">Manage preferences</a>
  </div>
</div>`;
}

/** Render a list of plain-text lines as an escaped, bulleted block. */
export function renderList(items: string[]): string {
	if (items.length === 0) return '';
	const lis = items
		.map(
			(item) =>
				`<li style="margin-bottom:6px;">${escapeHtml(item)}</li>`
		)
		.join('');
	return `<ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:${BODY};line-height:1.6;">${lis}</ul>`;
}

export const EMAIL_COLORS = {
	brand: BRAND,
	danger: '#DC2626',
	warning: '#D97706',
	success: '#059669',
} as const;
