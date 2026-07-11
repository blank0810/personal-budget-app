/**
 * faq-data.ts — single source of truth for FAQ content.
 *
 * No 'use client' directive — this module is plain data, importable by both
 * server components (faq/page.tsx for JSON-LD generation) and client
 * components (LagoonFaqAccordion) without forcing either to change runtime.
 *
 * Honesty rules:
 * - AI Advisor answer is future-tense only ("not yet … in active development").
 * - No fabricated stats, ratings, or personal info.
 */

export interface FaqEntry {
	q: string;
	a: string;
}

export interface FaqGroupData {
	label: string;
	items: FaqEntry[];
}

export const FAQ_GROUPS: FaqGroupData[] = [
	{
		label: 'Getting started',
		items: [
			{
				q: 'Do I need to connect my bank?',
				a: 'No. Budget Planner does not link to your bank and never asks for your banking credentials. You log transactions yourself — manually as they happen, or by importing a CSV file you download from your bank. Your bank login stays with your bank.',
			},
			{
				q: 'How long does setup take?',
				a: 'Most people have a working budget in under five minutes. Create an account, set your base currency, add your first account (e.g. "Cash" or "BDO Savings"), create a few budget categories, and start logging. You can import past transactions later if you want historical data.',
			},
			{
				q: 'Is it really free?',
				a: 'Yes. Everything available today — accounts, budgets, savings goals, recurring entries, CSV import, reports, and the dashboard — is free. A Pro tier may come later for advanced features. If that changes, it will be announced on the public changelog before anything locks.',
			},
		],
	},
	{
		label: 'Money & data',
		items: [
			{
				q: 'Is my financial data safe?',
				a: 'Your data is stored in an encrypted database and is never sold or shared with third parties. Because there is no bank sync, the app never handles your banking credentials at all — only the numbers you choose to log.',
			},
			{
				q: 'Do I own my data, and can I export it?',
				a: 'Yes. You can export your full transaction history as a CSV from the Reports section at any time. Your data belongs to you, and you can leave whenever you want without losing anything.',
			},
			{
				q: 'What currency does it support?',
				a: 'Budget Planner is built primarily for the Philippine Peso (₱). Your currency is set once during onboarding and applies to all accounts, budgets, and reports. Multi-currency support is on the roadmap.',
			},
		],
	},
	{
		label: 'Features',
		items: [
			{
				q: 'Can I import a CSV?',
				a: 'Yes. The import wizard accepts standard CSV files, detects likely duplicates before they land, and lets you map columns to your existing categories. If something looks off after import, a one-click batch undo rolls the whole import back.',
			},
			{
				q: 'Does it handle recurring transactions?',
				a: 'Yes. Set up any recurring income or expense — salary, rent, subscriptions — and choose how often it repeats. The app logs them automatically so you never have to enter the same transaction twice.',
			},
			{
				q: 'How does Budget Planner calculate my financial health score?',
				a: 'It scores five pillars of your finances — Solvency, Liquidity, Savings, Debt Management, and Cash Flow — from the accounts and transactions you log, then combines them into a single score out of 100 with an A–F grade on each pillar. Nothing is estimated from a bank feed; the score reflects exactly what you record, and it sharpens as you log more.',
			},
			{
				q: 'Do I need to link my bank to see my financial health?',
				a: 'No. Your financial health score is computed entirely from what you log yourself — no bank connection and no credentials. Log your income, expenses, and account balances, and the score updates immediately.',
			},
			{
				q: 'Is there an AI advisor?',
				a: 'Not yet, but it is the next major feature in active development. The AI Advisor will analyse your transaction history and surface patterns, anomalies, and budget insights in plain language. You can see a preview on your dashboard today — the working version is coming.',
			},
		],
	},
	{
		label: "Who it's for",
		items: [
			{
				q: "I'm not a freelancer — is this for me?",
				a: 'Absolutely. Budget Planner is a general personal budgeting tool, not a tool for any specific type of earner. Whether you have a fixed salary, variable income, or a mix of both, the budget envelopes and savings goals work the same way.',
			},
			{
				q: 'I already track money in a spreadsheet. Why switch?',
				a: "You don't have to. But if you find yourself rebuilding formulas, losing history, or skipping your budget review because the sheet feels like a chore — this is designed for that. Transactions update budgets automatically, and the dashboard gives you the full picture without requiring you to build it.",
			},
		],
	},
];
