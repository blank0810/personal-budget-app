/**
 * demo-data.ts — build a neutral demo account for marketing screenshots.
 *
 *   docker compose exec app npx tsx scripts/demo-data.ts
 *
 * Why this exists: the public site presents real product screenshots
 * rather than invented mockups (PRODUCT.md), and the default seed has
 * too little data to photograph. This creates ONE deterministic demo
 * user with roughly four months of plausible peso finances.
 *
 * Rules it holds to:
 * - Neutral persona only. "Demo User" / demo@budget-app.com. Never the
 *   maintainer's name, email, or anything personally identifying.
 * - Balances are derived the way the services derive them: an expense
 *   on an asset account decrements it, an expense on a liability
 *   account increments the debt (expense.service.ts). Direct Prisma
 *   writes must not invent a different convention.
 * - Deterministic: a fixed-seed PRNG, so re-running produces the same
 *   screenshots.
 * - Idempotent: wipes and rebuilds this one demo user's rows only.
 *   Touches no other account.
 *
 * This is a local development utility. It is never imported by the app.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@budget-app.com';
const MONTHS_BACK = 3; // current month plus three prior

/** mulberry32 — small deterministic PRNG so screenshots never drift. */
function rng(seed: number) {
	return function next() {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const rand = rng(20260829);

const pick = <T,>(items: readonly T[]): T =>
	items[Math.floor(rand() * items.length)]!;

/** Random peso amount, rounded to the nearest 10 so figures read naturally. */
const amount = (min: number, max: number) =>
	Math.round((min + rand() * (max - min)) / 10) * 10;

const d = (year: number, month: number, day: number) =>
	new Date(Date.UTC(year, month, day, 4, 0, 0));

const dec = (n: number) => new Prisma.Decimal(n.toFixed(2));

type Flow = { accountKey: string; delta: number };

async function main() {
	const now = new Date();
	const password = await bcrypt.hash('demo-password', 10);

	/* ── Reset just this user ─────────────────────────────────────── */
	const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
	if (existing) {
		await prisma.user.delete({ where: { id: existing.id } });
		console.log('· removed previous demo user');
	}

	const user = await prisma.user.create({
		data: {
			email: DEMO_EMAIL,
			name: 'Demo User',
			password,
			role: 'USER',
			isOnboarded: true,
			currency: 'PHP',
			emailNotificationsEnabled: false,
		},
	});

	/* ── Accounts ─────────────────────────────────────────────────── */
	const accountSpec = [
		{ key: 'checking', name: 'BPI Checking', type: 'BANK', target: 48_600, liability: false },
		{ key: 'cash', name: 'Cash on Hand', type: 'CASH', target: 3_240, liability: false },
		{ key: 'savings', name: 'BPI Savings', type: 'SAVINGS', target: 240_000, liability: false },
		{ key: 'emergency', name: 'Emergency Fund', type: 'SAVINGS', target: 96_000, liability: false },
		{ key: 'card', name: 'Citi Credit Card', type: 'CREDIT', target: 38_400, liability: true, limit: 120_000 },
		{ key: 'loan', name: 'Car Loan', type: 'LOAN', target: 145_000, liability: true },
	] as const;

	/* ── Categories ───────────────────────────────────────────────── */
	const incomeCats = ['Salary', 'Freelance', 'Other Income'];
	const expenseCats = [
		'Rent',
		'Groceries',
		'Transport',
		'Utilities',
		'Dining Out',
		'Subscriptions',
		'Health',
		'Shopping',
	];

	const categories = new Map<string, string>();

	for (const name of incomeCats) {
		const row = await prisma.category.create({
			data: { name, type: 'INCOME', userId: user.id },
		});
		categories.set(`INCOME:${name}`, row.id);
	}

	for (const name of expenseCats) {
		const row = await prisma.category.create({
			data: { name, type: 'EXPENSE', userId: user.id },
		});
		categories.set(`EXPENSE:${name}`, row.id);
	}

	/* ── Generate the flows first, so opening balances can be solved
	     backwards from the balance each account should end on. ────── */
	const flows: Flow[] = [];
	const incomes: Prisma.IncomeCreateManyInput[] = [];
	const expenses: Prisma.ExpenseCreateManyInput[] = [];

	const record = (accountKey: string, delta: number) =>
		flows.push({ accountKey, delta });

	for (let back = MONTHS_BACK; back >= 0; back--) {
		const cursor = new Date(now.getFullYear(), now.getMonth() - back, 1);
		const year = cursor.getFullYear();
		const month = cursor.getMonth();
		const isCurrentMonth = back === 0;
		const lastDay = isCurrentMonth
			? now.getDate()
			: new Date(year, month + 1, 0).getDate();

		/* Salary — two cut-offs a month, straight into checking. */
		for (const day of [15, 30]) {
			if (day > lastDay) continue;
			const net = amount(30_500, 31_500);
			incomes.push({
				amount: dec(net),
				description: day === 15 ? 'Payroll — 1st cut-off' : 'Payroll — 2nd cut-off',
				date: d(year, month, day),
				categoryId: categories.get('INCOME:Salary')!,
				accountId: null,
				userId: user.id,
			});
			record('checking', net);
		}

		/* Freelance — irregular, which is the point of tracking it. */
		if (rand() > 0.35) {
			const day = Math.min(lastDay, 6 + Math.floor(rand() * 18));
			const fee = amount(8_000, 18_000);
			incomes.push({
				amount: dec(fee),
				description: 'Freelance project — final payment',
				date: d(year, month, day),
				categoryId: categories.get('INCOME:Freelance')!,
				accountId: null,
				userId: user.id,
			});
			record('checking', fee);
		}

		const spend = (
			category: string,
			description: string,
			day: number,
			value: number,
			accountKey: string,
		) => {
			if (day > lastDay) return;
			expenses.push({
				amount: dec(value),
				description,
				date: d(year, month, day),
				categoryId: categories.get(`EXPENSE:${category}`)!,
				accountId: null,
				userId: user.id,
			});
			record(accountKey, -value);
		};

		spend('Rent', 'Monthly rent', 5, 18_000, 'checking');
		spend('Utilities', 'Meralco', 12, amount(2_600, 3_900), 'checking');
		spend('Utilities', 'Water + internet', 14, amount(1_500, 2_100), 'checking');
		spend('Subscriptions', 'Streaming', 3, 549, 'card');
		spend('Subscriptions', 'Cloud storage', 3, 299, 'card');

		for (const day of [4, 11, 18, 25]) {
			spend('Groceries', pick(['SM Supermarket', 'Landers', 'Puregold']), day, amount(2_100, 4_400), pick(['checking', 'card']));
		}

		for (let i = 0; i < 9; i++) {
			const day = 2 + Math.floor(rand() * 27);
			spend('Transport', pick(['Grab', 'Fuel', 'Toll + parking']), day, amount(280, 1_250), pick(['cash', 'checking']));
		}

		for (let i = 0; i < 5; i++) {
			const day = 2 + Math.floor(rand() * 27);
			spend('Dining Out', pick(['Lunch with team', 'Weekend dinner', 'Coffee run']), day, amount(420, 2_300), pick(['card', 'cash']));
		}

		if (rand() > 0.5) {
			spend('Health', pick(['Pharmacy', 'Dental check-up']), 8 + Math.floor(rand() * 16), amount(900, 3_200), 'card');
		}

		if (rand() > 0.45) {
			spend('Shopping', pick(['Household restock', 'Clothes', 'Replacement charger']), 9 + Math.floor(rand() * 15), amount(1_200, 5_800), 'card');
		}
	}

	/* ── Solve opening balances so each account lands on its target ── */
	const netByAccount = new Map<string, number>();
	for (const flow of flows) {
		netByAccount.set(flow.accountKey, (netByAccount.get(flow.accountKey) ?? 0) + flow.delta);
	}

	const accountIds = new Map<string, string>();

	for (const spec of accountSpec) {
		const net = netByAccount.get(spec.key) ?? 0;
		/* An expense on a liability increases what is owed, so its flows
		   are applied with the opposite sign — exactly as the expense
		   service does when it increments a liability's balance. */
		const applied = spec.liability ? -net : net;
		const opening = spec.target - applied;

		const row = await prisma.account.create({
			data: {
				name: spec.name,
				type: spec.type,
				balance: dec(spec.target),
				openingBalance: dec(opening),
				currency: 'PHP',
				isLiability: spec.liability,
				creditLimit: 'limit' in spec && spec.limit ? dec(spec.limit) : null,
				userId: user.id,
			},
		});

		accountIds.set(spec.key, row.id);
	}

	/* Attach the account ids now that the rows exist. Flows were pushed
	   in the same order the transactions were, so they zip cleanly. */
	const incomeFlows = flows.filter((f) => f.delta > 0);
	const expenseFlows = flows.filter((f) => f.delta < 0);

	incomes.forEach((row, i) => {
		row.accountId = accountIds.get(incomeFlows[i]!.accountKey)!;
	});
	expenses.forEach((row, i) => {
		row.accountId = accountIds.get(expenseFlows[i]!.accountKey)!;
	});

	await prisma.income.createMany({ data: incomes });
	await prisma.expense.createMany({ data: expenses });

	/* ── Budgets for the current month ────────────────────────────── */
	const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

	const budgetPlan: Array<[string, number]> = [
		['Rent', 18_000],
		['Groceries', 14_000],
		['Transport', 4_500],
		['Utilities', 5_000],
		['Dining Out', 6_000],
		['Shopping', 5_000],
		['Subscriptions', 1_000],
	];

	const monthEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));

	for (const [category, value] of budgetPlan) {
		const categoryId = categories.get(`EXPENSE:${category}`)!;

		const budget = await prisma.budget.create({
			data: {
				name: category,
				amount: dec(value),
				month: monthStart,
				categoryId,
				userId: user.id,
			},
		});

		/* Budget progress is read from expense.budgetId, not from
		   category+month (budget.service.ts sums `budget.expenses`), so the
		   link has to be explicit — the same link the expense controller
		   writes when you file a transaction against an envelope. Without
		   it every envelope reads "₱0 spent". */
		await prisma.expense.updateMany({
			where: {
				userId: user.id,
				categoryId,
				date: { gte: monthStart, lt: monthEnd },
			},
			data: { budgetId: budget.id },
		});
	}

	/* ── Goals ────────────────────────────────────────────────────── */
	await prisma.goal.create({
		data: {
			name: 'Emergency fund',
			targetAmount: dec(300_000),
			currentAmount: dec(96_000),
			baselineAmount: dec(0),
			linkedAccountId: accountIds.get('emergency')!,
			isEmergencyFund: true,
			userId: user.id,
		},
	});

	await prisma.goal.create({
		data: {
			name: 'Replace the laptop',
			targetAmount: dec(85_000),
			currentAmount: dec(31_500),
			baselineAmount: dec(208_500),
			deadline: new Date(Date.UTC(now.getFullYear() + 1, 2, 1)),
			linkedAccountId: accountIds.get('savings')!,
			userId: user.id,
		},
	});

	console.log(
		`✓ demo user ready — ${incomes.length} incomes, ${expenses.length} expenses, ` +
			`${budgetPlan.length} budgets, 2 goals`,
	);
	console.log(`  sign in with ${DEMO_EMAIL} / demo-password`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
