/**
 * FAQ_ITEMS — single source of truth for the FAQ Q&A.
 *
 * Lives in a plain (non-"use client") module so BOTH the client FAQ
 * accordion (FAQ.tsx) AND the server /faq route (FAQPage JSON-LD) can import
 * the real array. Importing this value out of the client FAQ.tsx into a
 * server component yields a client-reference proxy ("FAQ_ITEMS.map is not a
 * function"), so the data must live here, not in the client component.
 *
 * The visible accordion and the FAQPage structured data are generated from
 * this same array, so they never drift (PRODUCT.md honesty gate).
 */
export const FAQ_ITEMS = [
	{
		q: 'Is the AI advisor available now?',
		a: 'Not yet. The AI Advisor is in active development and is the flagship feature on the roadmap. What you see today is a preview of where it is going. Create a free account now and you will be among the first to use it the moment it opens.',
	},
	{
		q: 'Is it really free?',
		a: 'Everything you can see today is free to start: your money in and out, accounts, budgets, goals, invoicing, importing your bank history, reports, and the dashboard. The AI Advisor is still being built, and it may become a paid add-on later. We will be upfront about pricing before anything changes.',
	},
	{
		q: 'Do I have to be a freelancer to use it?',
		a: 'No. The product is built with freelancers and solo operators in mind (variable income, client invoicing), but it works just as well for everyday personal budgeting. If you want to track spending, set budgets, and hit savings goals, you are in the right place.',
	},
	{
		q: 'Can I import my bank transactions?',
		a: 'Yes. Bring your bank history over in seconds. The import wizard catches likely duplicates before they land, and gives you a one-click undo on any import if something looks off, so you skip the cleanup headache.',
	},
	{
		q: 'Can I send real invoices?',
		a: 'Yes, and this is live today. Set up your business details, then send polished invoices to clients by email straight from the app and get paid faster. When a client pays, that income flows into the same budget you are already planning against.',
	},
	{
		q: 'Who builds this?',
		a: 'Budget Planner is built in the open by a solo founder based in the Philippines. Progress is public on the changelog, and the roadmap is shaped by a community feature board, so you can see exactly what is shipping and vote on what comes next.',
	},
];
