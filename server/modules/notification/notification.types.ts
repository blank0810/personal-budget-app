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

// Budget alert roast tiers
const BUDGET_ROAST_80 = [
	(name: string, pct: string, spent: string, limit: string, remaining: string) =>
		`[Budget Planner] ⚠️ ${pct}% of your "${name}" budget gone (₱${spent}/₱${limit}). ₱${remaining} left — maybe cook at home tonight?`,
	(name: string, pct: string, spent: string, limit: string, remaining: string) =>
		`[Budget Planner] ⚠️ "${name}" at ${pct}% (₱${spent}/₱${limit}). You've got ₱${remaining} and zero self-control. Good luck.`,
	(name: string, pct: string, spent: string, limit: string, _remaining: string) =>
		`[Budget Planner] ⚠️ "${name}" budget ${pct}% cooked (₱${spent}/₱${limit}). Your wallet is sweating. Put the card down.`,
];

const BUDGET_ROAST_90 = [
	(name: string, pct: string, spent: string, limit: string, remaining: string) =>
		`[Budget Planner] 🔥 Your "${name}" budget is on life support — ${pct}% gone (₱${spent}/₱${limit}). ₱${remaining} to survive the rest of the month. Good luck.`,
	(name: string, pct: string, spent: string, limit: string, remaining: string) =>
		`[Budget Planner] 🔥 "${name}" at ${pct}% (₱${spent}/₱${limit}). ₱${remaining} left. You're not budgeting, you're speedrunning poverty.`,
];

const BUDGET_ROAST_100 = [
	(name: string, pct: string, spent: string, limit: string, over: string) =>
		`[Budget Planner] 🚨 "${name}" budget OBLITERATED — ₱${spent} on a ₱${limit} limit (${pct}%). You're ₱${over} over. Your budget didn't die, you murdered it.`,
	(name: string, pct: string, spent: string, limit: string, over: string) =>
		`[Budget Planner] 🚨 "${name}" at ${pct}% — ₱${spent}/₱${limit}, ₱${over} over. Congratulations, you've unlocked financial self-destruction.`,
];

const BUDGET_ROAST_110 = [
	(name: string, pct: string, spent: string, limit: string, _over: string) =>
		`[Budget Planner] 💀 "${name}" budget at ${pct}% — ₱${spent} on ₱${limit}. You're not overspending, you're committing financial arson. You are COOKED.`,
	(name: string, pct: string, spent: string, limit: string, _over: string) =>
		`[Budget Planner] 💀 "${name}" at ${pct}% (₱${spent}/₱${limit}). This isn't a budget anymore, it's a crime scene. You are absolutely COOKED.`,
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

// Income roast tiers
const INCOME_ROAST_SMALL = [
	(amount: string, category: string, account: string, balance: string) =>
		`[Budget Planner] ₱${amount} (${category}) → ${account}. Balance: ₱${balance}. That's not income, that's a consolation prize. Stack harder.`,
	(amount: string, category: string, account: string, balance: string) =>
		`[Budget Planner] ₱${amount} (${category}) → ${account}. Balance: ₱${balance}. Are you even trying? My lola's tindahan makes more than this.`,
];

const INCOME_ROAST_MEDIUM = [
	(amount: string, category: string, account: string, balance: string) =>
		`[Budget Planner] 💰 ₱${amount} (${category}) → ${account}. Balance: ₱${balance}. Decent bag. Touch it and I'll know.`,
	(amount: string, category: string, account: string, balance: string) =>
		`[Budget Planner] 💰 ₱${amount} (${category}) → ${account}. Balance: ₱${balance}. Not bad. Now pretend it doesn't exist and don't open Shopee.`,
];

const INCOME_ROAST_LARGE = [
	(amount: string, category: string, account: string, balance: string) =>
		`[Budget Planner] 🤑 ₱${amount} (${category}) → ${account}. Balance: ₱${balance}. Big bag alert. Invest it before you blow it on Shopee.`,
	(amount: string, category: string, account: string, balance: string) =>
		`[Budget Planner] 🤑 ₱${amount} (${category}) → ${account}. Balance: ₱${balance}. Fat stack. If you waste this I will personally haunt your wallet.`,
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

// Monthly report roast tiers
const REPORT_ROAST_GREAT = [
	(month: string, score: number, net: string) =>
		`[Budget Planner] 📊 ${month} report: Health ${score}/100 | Net ${net}. You actually cooked this month (the good kind). Don't let it go to your head. Full report in email.`,
	(month: string, score: number, net: string) =>
		`[Budget Planner] 📊 ${month}: ${score}/100 | Net ${net}. Okay you ate. Financial discipline unlocked. Keep this energy. Details in email.`,
];

const REPORT_ROAST_GOOD = [
	(month: string, score: number, net: string) =>
		`[Budget Planner] 📊 ${month} report: Health ${score}/100 | Net ${net}. Not bad, not great. Financial C+ student. Room to grow. Details in email.`,
	(month: string, score: number, net: string) =>
		`[Budget Planner] 📊 ${month}: ${score}/100 | Net ${net}. Mid performance. You're one bad decision from disaster. Step it up. Report in email.`,
];

const REPORT_ROAST_MID = [
	(month: string, score: number, net: string) =>
		`[Budget Planner] 📊 ${month} report: Health ${score}/100 | Net ${net}. Barely breathing financially. One impulse purchase from disaster. Wake-up call in email.`,
	(month: string, score: number, net: string) =>
		`[Budget Planner] 📊 ${month}: ${score}/100 | Net ${net}. Your finances are on life support. Full damage report in email.`,
];

const REPORT_ROAST_BAD = [
	(month: string, score: number, net: string) =>
		`[Budget Planner] 📊 ${month} report: Health ${score}/100 | Net ${net}. You are financially COOKED. This isn't a budget, it's a crime scene. Damage report in email.`,
	(month: string, score: number, net: string) =>
		`[Budget Planner] 📊 ${month}: ${score}/100 | Net ${net}. Absolute financial carnage. I've seen dumpster fires with better numbers. Report in email.`,
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
