import { z } from 'zod';

export const updatePreferenceSchema = z.object({
	key: z.string().min(1),
	enabled: z.boolean(),
	channel: z.enum(['EMAIL', 'SMS']).default('EMAIL'),
});

export type UpdatePreferenceInput = z.infer<typeof updatePreferenceSchema>;

export const updatePhoneNumberSchema = z.object({
	phoneNumber: z
		.string()
		.regex(/^\+639\d{9}$/, 'Must be a valid PH number (+639XXXXXXXXX)')
		.nullable(),
});

export type MergedPreference = {
	key: string;
	label: string;
	description: string;
	category: string;
	emailEnabled: boolean;
	smsEnabled: boolean;
};

// --- Roast SMS Templates ---

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

// Budget alert roast tiers (max 120 chars)
const BUDGET_ROAST_80 = [
	(name: string, pct: string, _s: string, _l: string, rem: string) =>
		`${name} at ${pct}%. P${rem} left. Maybe skip Grab today?`,
	(name: string, pct: string, _s: string, _l: string, rem: string) =>
		`${name} ${pct}% used. P${rem} left. Put the card down.`,
];

const BUDGET_ROAST_90 = [
	(name: string, pct: string, _s: string, _l: string, rem: string) =>
		`${name} at ${pct}%! Only P${rem} left. Budget on life support.`,
	(name: string, pct: string, _s: string, _l: string, rem: string) =>
		`${name} ${pct}% gone. P${rem} to survive. Good luck.`,
];

const BUDGET_ROAST_100 = [
	(name: string, pct: string, _s: string, _l: string, over: string) =>
		`${name} at ${pct}%! P${over} over budget. You are COOKED.`,
	(name: string, pct: string, _s: string, _l: string, over: string) =>
		`${name} BUSTED at ${pct}%. P${over} over limit. Chill.`,
];

const BUDGET_ROAST_110 = [
	(name: string, pct: string, _s: string, _l: string, _o: string) =>
		`${name} at ${pct}%. This is a crime scene. COOKED.`,
	(name: string, pct: string, _s: string, _l: string, _o: string) =>
		`${name} ${pct}%. Financial arson. Absolutely COOKED.`,
];

export function getBudgetRoastSms(
	name: string,
	percentage: number,
	spent: number,
	limit: number
): string {
	const pct = percentage.toFixed(0);
	const spentStr = spent.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	const limitStr = limit.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	const remaining = Math.max(0, limit - spent);
	const remainingStr = remaining.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	const over = Math.max(0, spent - limit);
	const overStr = over.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

	if (percentage >= 110) return pick(BUDGET_ROAST_110)(name, pct, spentStr, limitStr, overStr);
	if (percentage >= 100) return pick(BUDGET_ROAST_100)(name, pct, spentStr, limitStr, overStr);
	if (percentage >= 90) return pick(BUDGET_ROAST_90)(name, pct, spentStr, limitStr, remainingStr);
	return pick(BUDGET_ROAST_80)(name, pct, spentStr, limitStr, remainingStr);
}

// Income roast tiers (max 120 chars)
const INCOME_ROAST_SMALL = [
	(amt: string, cat: string, acct: string, _bal: string) =>
		`P${amt} ${cat} in ${acct}. That's not income, that's loose change.`,
	(amt: string, cat: string, acct: string, _bal: string) =>
		`P${amt} ${cat} in ${acct}. Stack harder, this ain't it.`,
];

const INCOME_ROAST_MEDIUM = [
	(amt: string, cat: string, acct: string, _bal: string) =>
		`P${amt} ${cat} in ${acct}. Decent bag. Don't touch it.`,
	(amt: string, cat: string, acct: string, _bal: string) =>
		`P${amt} ${cat} in ${acct}. Not bad. Stay off Shopee.`,
];

const INCOME_ROAST_LARGE = [
	(amt: string, cat: string, acct: string, _bal: string) =>
		`P${amt} ${cat} in ${acct}. Big bag! Invest, don't blow it.`,
	(amt: string, cat: string, acct: string, _bal: string) =>
		`P${amt} ${cat} in ${acct}. Fat stack. Don't waste this.`,
];

export function getIncomeRoastSms(
	amount: number,
	categoryName: string,
	accountName: string | null,
	newBalance: number | null
): string {
	const amountStr = amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	const account = accountName || 'Unlinked';
	const balance = newBalance != null
		? newBalance.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
		: '—';

	if (amount >= 50000) return pick(INCOME_ROAST_LARGE)(amountStr, categoryName, account, balance);
	if (amount >= 1000) return pick(INCOME_ROAST_MEDIUM)(amountStr, categoryName, account, balance);
	return pick(INCOME_ROAST_SMALL)(amountStr, categoryName, account, balance);
}

// Monthly report roast tiers (max 120 chars)
const REPORT_ROAST_GREAT = [
	(month: string, score: number, net: string) =>
		`${month}: ${score}/100 | ${net}. You cooked! Keep it up. Details in email.`,
	(month: string, score: number, net: string) =>
		`${month}: ${score}/100 | ${net}. Discipline unlocked. Check email for report.`,
];

const REPORT_ROAST_GOOD = [
	(month: string, score: number, net: string) =>
		`${month}: ${score}/100 | ${net}. Not bad. Room to grow. Report in email.`,
	(month: string, score: number, net: string) =>
		`${month}: ${score}/100 | ${net}. Mid but alive. Step it up. Check email.`,
];

const REPORT_ROAST_MID = [
	(month: string, score: number, net: string) =>
		`${month}: ${score}/100 | ${net}. Barely surviving. Wake-up call in email.`,
	(month: string, score: number, net: string) =>
		`${month}: ${score}/100 | ${net}. Finances on life support. Check email.`,
];

const REPORT_ROAST_BAD = [
	(month: string, score: number, net: string) =>
		`${month}: ${score}/100 | ${net}. Financially COOKED. Report in email.`,
	(month: string, score: number, net: string) =>
		`${month}: ${score}/100 | ${net}. Absolute carnage. Damage report in email.`,
];

export function getReportRoastSms(
	month: string,
	score: number,
	netAmount: number
): string {
	const sign = netAmount >= 0 ? '+' : '-';
	const net = `${sign}₱${Math.abs(netAmount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

	if (score >= 80) return pick(REPORT_ROAST_GREAT)(month, score, net);
	if (score >= 70) return pick(REPORT_ROAST_GOOD)(month, score, net);
	if (score >= 40) return pick(REPORT_ROAST_MID)(month, score, net);
	return pick(REPORT_ROAST_BAD)(month, score, net);
}
