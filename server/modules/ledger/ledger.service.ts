import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
	type LedgerFilterInput,
	type LedgerKpiSnapshot,
	type LedgerPage,
	type LedgerRow,
} from './ledger.types';

const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export const LedgerService = {
	/**
	 * Get a paginated page of ledger rows with running totals.
	 *
	 * Approach:
	 *   1. Load the FULL transaction trail (no filters except orphan exclusion)
	 *      sorted chronologically + opening-balance synthetic rows.
	 *   2. Walk the trail in order, applying signed deltas to running totals,
	 *      attaching them to each row.
	 *   3. Apply user filters AFTER the walk so running totals reflect actual
	 *      state at each row's position, not just the filtered subset (see
	 *      design doc "Filter behaviour").
	 *   4. Slice to the requested page.
	 *   5. Compute the tripwire by comparing final walked totals against
	 *      Σ(Account.balance).
	 *
	 * Wrapped in a single `prisma.$transaction` so the walk and the tripwire's
	 * Σ(Account.balance) read from the same snapshot.
	 */
	async getPage(
		userId: string,
		filter: LedgerFilterInput
	): Promise<LedgerPage> {
		return await prisma.$transaction(async (tx) => {
			const { walked, accountBalanceSum } = await loadAndWalk(tx, userId);

			const filtered = applyFilters(walked, filter);
			const total = filtered.length;

			const skip = (filter.page - 1) * filter.pageSize;
			const pageRows = filtered.slice(skip, skip + filter.pageSize);

			const first = pageRows[0];
			const opening = first
				? {
						assets: first.runningAssets - first.deltaAssets,
						liabilities:
							first.runningLiabilities - first.deltaLiabilities,
						netWorth: 0,
					}
				: { assets: 0, liabilities: 0, netWorth: 0 };
			opening.netWorth = opening.assets - opening.liabilities;

			// Tripwire: walk's final running totals must equal Σ(Account.balance)
			// partitioned by isLiability. If diff ≥ ₱0.01, surface to UI.
			const lastWalked = walked[walked.length - 1];
			const finalAssets = lastWalked
				? new D(lastWalked.runningAssets)
				: new D(0);
			const finalLiabilities = lastWalked
				? new D(lastWalked.runningLiabilities)
				: new D(0);

			const assetsDiff = finalAssets
				.minus(accountBalanceSum.assets)
				.toNumber();
			const liabilitiesDiff = finalLiabilities
				.minus(accountBalanceSum.liabilities)
				.toNumber();

			const TRIPWIRE_EPSILON = 0.01;
			const discrepancy =
				Math.abs(assetsDiff) >= TRIPWIRE_EPSILON ||
				Math.abs(liabilitiesDiff) >= TRIPWIRE_EPSILON
					? { assetsDiff, liabilitiesDiff }
					: null;

			return {
				rows: pageRows,
				total,
				page: filter.page,
				pageSize: filter.pageSize,
				openingTotals: opening,
				discrepancy,
			};
		});
	},

	/**
	 * Get the three KPI cards: total assets, total liabilities, net worth,
	 * plus deltas vs the opening totals at the start of the filter window.
	 *
	 * Current totals come from Σ(Account.balance) for fast page load.
	 * Window deltas come from the walk so they're consistent with the page's
	 * running totals.
	 */
	async getKpiSnapshot(
		userId: string,
		filter: LedgerFilterInput
	): Promise<LedgerKpiSnapshot> {
		return await prisma.$transaction(async (tx) => {
			const { accountBalanceSum, walked } = await loadAndWalk(tx, userId);
			const filtered = applyFilters(walked, filter);

			const first = filtered[0];
			const last = filtered[filtered.length - 1];

			// Stay in Decimal for the multi-term subtraction to avoid the
			// float artifacts a 4-term JS subtraction would introduce after
			// the careful walk.
			const openingAssets = first
				? new D(first.runningAssets).minus(first.deltaAssets)
				: new D(0);
			const openingLiabilities = first
				? new D(first.runningLiabilities).minus(first.deltaLiabilities)
				: new D(0);
			const closingAssets = last
				? new D(last.runningAssets)
				: openingAssets;
			const closingLiabilities = last
				? new D(last.runningLiabilities)
				: openingLiabilities;

			const totalAssets = accountBalanceSum.assets;
			const totalLiabilities = accountBalanceSum.liabilities;

			return {
				totalAssets: totalAssets.toNumber(),
				totalLiabilities: totalLiabilities.toNumber(),
				netWorth: totalAssets.minus(totalLiabilities).toNumber(),
				deltaAssets: closingAssets.minus(openingAssets).toNumber(),
				deltaLiabilities: closingLiabilities
					.minus(openingLiabilities)
					.toNumber(),
				deltaNetWorth: closingAssets
					.minus(closingLiabilities)
					.minus(openingAssets.minus(openingLiabilities))
					.toNumber(),
			};
		});
	},
};

// ===========================================================================
// Internals
// ===========================================================================

/**
 * Internal walk row — carries the signed deltas the row contributes to total
 * assets and total liabilities. Sign convention: positive numbers always
 * represent "value increase on that side of the equation".
 */
type WalkRow = {
	id: string;
	date: Date;
	createdAt: Date;
	deltaAssets: Decimal;
	deltaLiabilities: Decimal;
	build: (running: {
		assets: Decimal;
		liabilities: Decimal;
		deltaAssets: Decimal;
		deltaLiabilities: Decimal;
	}) => LedgerRow;
};

/**
 * Load every transaction relevant to the global ledger — Income, Expense,
 * Transfer, plus synthetic opening-balance rows from Account.openingBalance.
 *
 * Walks them chronologically (date ASC, createdAt ASC) accumulating signed
 * deltas into running totals. Returns the walked rows plus Σ(Account.balance)
 * partitioned by isLiability for the tripwire.
 *
 * Rules:
 *   - Orphaned Income/Expense rows (`accountId: null`) excluded — they no
 *     longer affect any Account.balance, so the walk would diverge.
 *   - Archived accounts INCLUDED on both the walk and the Σ(Account.balance)
 *     side so the tripwire balances exactly.
 *   - Transfers can't be orphaned — schema is Restrict on both legs.
 */
async function loadAndWalk(
	tx: Prisma.TransactionClient,
	userId: string
): Promise<{
	walked: LedgerRow[];
	accountBalanceSum: { assets: Decimal; liabilities: Decimal };
}> {
	const [accounts, incomes, expenses, transfers] = await Promise.all([
		tx.account.findMany({
			where: { userId },
			select: {
				id: true,
				name: true,
				isLiability: true,
				isArchived: true,
				openingBalance: true,
				balance: true,
				createdAt: true,
			},
		}),
		tx.income.findMany({
			where: { userId, accountId: { not: null } },
			include: { category: { select: { name: true } } },
		}),
		tx.expense.findMany({
			where: { userId, accountId: { not: null } },
			include: { category: { select: { name: true } } },
		}),
		tx.transfer.findMany({
			where: { userId },
		}),
	]);

	const accountById = new Map(accounts.map((a) => [a.id, a]));

	const rows: WalkRow[] = [];

	// 1. Synthetic opening-balance rows
	for (const account of accounts) {
		if (account.openingBalance === null) continue;
		const opening = account.openingBalance;
		if (opening.isZero()) continue;

		const deltaAssets = account.isLiability ? new D(0) : opening;
		const deltaLiabilities = account.isLiability ? opening : new D(0);

		rows.push({
			id: `opening-${account.id}`,
			date: account.createdAt,
			createdAt: account.createdAt,
			deltaAssets,
			deltaLiabilities,
			build: ({ assets, liabilities, deltaAssets, deltaLiabilities }) => ({
				kind: 'opening',
				id: `opening-${account.id}`,
				date: account.createdAt.toISOString(),
				createdAt: account.createdAt.toISOString(),
				description: 'Opening Balance',
				accountId: account.id,
				accountName: account.name,
				accountIsArchived: account.isArchived,
				amount: opening.toNumber(),
				deltaAssets: deltaAssets.toNumber(),
				deltaLiabilities: deltaLiabilities.toNumber(),
				runningAssets: assets.toNumber(),
				runningLiabilities: liabilities.toNumber(),
				runningNetWorth: assets.minus(liabilities).toNumber(),
			}),
		});
	}

	// 2. Income rows
	for (const income of incomes) {
		if (income.accountId === null) continue;
		const account = accountById.get(income.accountId);
		if (!account) continue;

		const isLiabilityAccount = account.isLiability;
		// Income on asset → assets ↑. Income on liability → liabilities ↓.
		const deltaAssets = isLiabilityAccount ? new D(0) : income.amount;
		const deltaLiabilities = isLiabilityAccount
			? income.amount.negated()
			: new D(0);

		const accountId = income.accountId;
		const accountName = account.name;
		const accountIsArchived = account.isArchived;

		rows.push({
			id: `income-${income.id}`,
			date: income.date,
			createdAt: income.createdAt,
			deltaAssets,
			deltaLiabilities,
			build: ({ assets, liabilities, deltaAssets, deltaLiabilities }) => ({
				kind: 'income',
				id: income.id,
				date: income.date.toISOString(),
				createdAt: income.createdAt.toISOString(),
				description: income.description,
				accountId,
				accountName,
				accountIsArchived,
				categoryName: income.category.name,
				isLiabilityAccount,
				amount: income.amount.toNumber(),
				deltaAssets: deltaAssets.toNumber(),
				deltaLiabilities: deltaLiabilities.toNumber(),
				runningAssets: assets.toNumber(),
				runningLiabilities: liabilities.toNumber(),
				runningNetWorth: assets.minus(liabilities).toNumber(),
			}),
		});
	}

	// 3. Expense rows
	for (const expense of expenses) {
		if (expense.accountId === null) continue;
		const account = accountById.get(expense.accountId);
		if (!account) continue;

		const isLiabilityAccount = account.isLiability;
		// Expense on asset → assets ↓. Expense on liability → liabilities ↑.
		const deltaAssets = isLiabilityAccount
			? new D(0)
			: expense.amount.negated();
		const deltaLiabilities = isLiabilityAccount ? expense.amount : new D(0);

		const accountId = expense.accountId;
		const accountName = account.name;
		const accountIsArchived = account.isArchived;

		rows.push({
			id: `expense-${expense.id}`,
			date: expense.date,
			createdAt: expense.createdAt,
			deltaAssets,
			deltaLiabilities,
			build: ({ assets, liabilities, deltaAssets, deltaLiabilities }) => ({
				kind: 'expense',
				id: expense.id,
				date: expense.date.toISOString(),
				createdAt: expense.createdAt.toISOString(),
				description: expense.description,
				accountId,
				accountName,
				accountIsArchived,
				categoryName: expense.category.name,
				isLiabilityAccount,
				amount: expense.amount.toNumber(),
				deltaAssets: deltaAssets.toNumber(),
				deltaLiabilities: deltaLiabilities.toNumber(),
				runningAssets: assets.toNumber(),
				runningLiabilities: liabilities.toNumber(),
				runningNetWorth: assets.minus(liabilities).toNumber(),
			}),
		});
	}

	// 4. Transfer rows. Same-side transfers net to zero. Cross-side
	// transfers move value across the asset/liability boundary.
	for (const transfer of transfers) {
		const from = accountById.get(transfer.fromAccountId);
		const to = accountById.get(transfer.toAccountId);
		if (!from || !to) continue;

		let deltaAssets = new D(0);
		let deltaLiabilities = new D(0);
		if (!from.isLiability && to.isLiability) {
			// Asset → liability (debt payment): assets ↓, liabilities ↓
			deltaAssets = transfer.amount.negated();
			deltaLiabilities = transfer.amount.negated();
		} else if (from.isLiability && !to.isLiability) {
			// Liability → asset (cash advance): assets ↑, liabilities ↑
			deltaAssets = transfer.amount;
			deltaLiabilities = transfer.amount;
		}
		// Asset→Asset and Liability→Liability: net zero on aggregates

		const isPayment = !from.isLiability && to.isLiability;

		rows.push({
			id: `transfer-${transfer.id}`,
			date: transfer.date,
			createdAt: transfer.createdAt,
			deltaAssets,
			deltaLiabilities,
			build: ({ assets, liabilities, deltaAssets, deltaLiabilities }) => ({
				kind: 'transfer',
				id: transfer.id,
				date: transfer.date.toISOString(),
				createdAt: transfer.createdAt.toISOString(),
				description: transfer.description,
				accountId: transfer.fromAccountId,
				accountName: from.name,
				accountIsArchived: from.isArchived || to.isArchived,
				fromAccountId: transfer.fromAccountId,
				toAccountId: transfer.toAccountId,
				fromAccountName: from.name,
				toAccountName: to.name,
				isPayment,
				amount: transfer.amount.toNumber(),
				deltaAssets: deltaAssets.toNumber(),
				deltaLiabilities: deltaLiabilities.toNumber(),
				runningAssets: assets.toNumber(),
				runningLiabilities: liabilities.toNumber(),
				runningNetWorth: assets.minus(liabilities).toNumber(),
			}),
		});
	}

	rows.sort((a, b) => {
		const dateDiff = a.date.getTime() - b.date.getTime();
		if (dateDiff !== 0) return dateDiff;
		return a.createdAt.getTime() - b.createdAt.getTime();
	});

	let runningAssets = new D(0);
	let runningLiabilities = new D(0);
	const walked: LedgerRow[] = rows.map((row) => {
		runningAssets = runningAssets.plus(row.deltaAssets);
		runningLiabilities = runningLiabilities.plus(row.deltaLiabilities);
		return row.build({
			assets: runningAssets,
			liabilities: runningLiabilities,
			deltaAssets: row.deltaAssets,
			deltaLiabilities: row.deltaLiabilities,
		});
	});

	let assetsSum = new D(0);
	let liabilitiesSum = new D(0);
	for (const account of accounts) {
		if (account.isLiability) {
			liabilitiesSum = liabilitiesSum.plus(account.balance);
		} else {
			assetsSum = assetsSum.plus(account.balance);
		}
	}

	return {
		walked,
		accountBalanceSum: { assets: assetsSum, liabilities: liabilitiesSum },
	};
}

/**
 * Apply user filters to the walked rows. Running totals stay attached —
 * filters narrow the displayed set but per-row totals reflect actual state
 * (see design doc "Filter behaviour").
 */
function applyFilters(rows: LedgerRow[], filter: LedgerFilterInput): LedgerRow[] {
	const accountSet = filter.accountIds?.length
		? new Set(filter.accountIds)
		: null;

	return rows.filter((row) => {
		if (filter.startDate || filter.endDate) {
			const rowDate = new Date(row.date);
			if (filter.startDate && rowDate < filter.startDate) return false;
			if (filter.endDate && rowDate > filter.endDate) return false;
		}

		if (filter.type) {
			if (filter.type === 'income' && row.kind !== 'income') return false;
			if (filter.type === 'expense' && row.kind !== 'expense') return false;
			if (filter.type === 'transfer' && row.kind !== 'transfer') return false;
			if (filter.type === 'payment') {
				if (row.kind !== 'transfer' || !row.isPayment) return false;
			}
		}

		if (accountSet) {
			if (row.kind === 'transfer') {
				const matches =
					(row.fromAccountId && accountSet.has(row.fromAccountId)) ||
					(row.toAccountId && accountSet.has(row.toAccountId));
				if (!matches) return false;
			} else {
				if (!row.accountId || !accountSet.has(row.accountId)) return false;
			}
		}

		// Category filter intentionally skipped in v1 — the chip filter on
		// the UI will only expose Type and Account. Wiring category requires
		// threading categoryId through LedgerRow; deferred to a follow-up.

		return true;
	});
}
