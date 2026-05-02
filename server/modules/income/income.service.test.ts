import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const D = Prisma.Decimal;

// ---------------------------------------------------------------------------
// Hoisted spy / state factory.
//
// vitest hoists vi.mock factories to the top of the file. vi.hoisted lets
// us share spies between the mocked module and the test cases below.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
	type Account = {
		id: string;
		isLiability: boolean;
		type?: string;
		name?: string;
	};
	type ChildTransfer = {
		id: string;
		amount: Prisma.Decimal;
		fromAccountId: string;
		toAccountId: string;
		efGoalId: string | null;
	};
	const state: {
		oldIncome: {
			id: string;
			accountId: string | null;
			amount: Prisma.Decimal;
			date: Date;
			description: string | null;
			childTransfers: ChildTransfer[];
		} | null;
		accountsById: Map<string, Account>;
		titheAccount: Account | null;
		efGoal: { id: string; linkedAccountId: string | null } | null;
	} = {
		oldIncome: null,
		accountsById: new Map(),
		titheAccount: null,
		efGoal: null,
	};

	const incomeFindUniqueOrThrow = vi.fn();
	const incomeUpdate = vi.fn();
	const accountFindUnique = vi.fn();
	const accountFindFirst = vi.fn();
	const accountUpdate = vi.fn();
	const accountCreate = vi.fn();
	const transferCreate = vi.fn();
	const transferDelete = vi.fn();
	const goalFindFirst = vi.fn();
	const goalUpdate = vi.fn();

	return {
		state,
		incomeFindUniqueOrThrow,
		incomeUpdate,
		accountFindUnique,
		accountFindFirst,
		accountUpdate,
		accountCreate,
		transferCreate,
		transferDelete,
		goalFindFirst,
		goalUpdate,
	};
});

vi.mock('@/lib/prisma', () => {
	const tx = {
		income: {
			findUniqueOrThrow: mocks.incomeFindUniqueOrThrow,
			update: mocks.incomeUpdate,
		},
		account: {
			findUnique: mocks.accountFindUnique,
			findFirst: mocks.accountFindFirst,
			update: mocks.accountUpdate,
			create: mocks.accountCreate,
		},
		transfer: {
			create: mocks.transferCreate,
			delete: mocks.transferDelete,
		},
		goal: {
			findFirst: mocks.goalFindFirst,
			update: mocks.goalUpdate,
		},
	};
	return {
		default: {
			...tx,
			$transaction: async (
				fn: (tx: typeof mocks extends never ? never : unknown) => unknown
			) => fn(tx),
		},
	};
});

vi.mock('../category/category.service', () => ({ CategoryService: {} }));
vi.mock('@/server/modules/notification/notification.service', () => ({
	NotificationService: { sendIncomeNotification: vi.fn() },
}));

import { IncomeService } from './income.service';

describe('IncomeService.updateIncome — P0-1 reverse-then-reapply', () => {
	beforeEach(() => {
		mocks.incomeFindUniqueOrThrow.mockReset();
		mocks.incomeUpdate.mockReset();
		mocks.accountFindUnique.mockReset();
		mocks.accountFindFirst.mockReset();
		mocks.accountUpdate.mockReset();
		mocks.accountCreate.mockReset();
		mocks.transferCreate.mockReset();
		mocks.transferDelete.mockReset();
		mocks.goalFindFirst.mockReset();
		mocks.goalUpdate.mockReset();
		mocks.state.oldIncome = null;
		mocks.state.accountsById.clear();
		mocks.state.titheAccount = null;
		mocks.state.efGoal = null;
	});

	function setupAccounts(opts: { mainIsLiability?: boolean } = {}) {
		mocks.accountFindUnique.mockImplementation(
			async ({ where }: { where: { id: string } }) => {
				if (where.id === 'main-asset')
					return { isLiability: opts.mainIsLiability ?? false };
				if (where.id === 'main-liability') return { isLiability: true };
				if (where.id === 'tithes-acct') return { isLiability: false };
				if (where.id === 'ef-acct') return { isLiability: false };
				return { isLiability: false };
			}
		);
	}

	function setupOldIncomeWithTitheChild() {
		mocks.incomeFindUniqueOrThrow.mockResolvedValueOnce({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(1000),
			date: new Date('2026-04-01'),
			description: 'Salary',
			childTransfers: [
				{
					id: 'xfer-tithe-1',
					amount: new D(100),
					fromAccountId: 'main-asset',
					toAccountId: 'tithes-acct',
					efGoalId: null,
				},
			],
		});
	}

	function setupIncomeUpdateReturn(amount: number, accountId: string | null) {
		mocks.incomeUpdate.mockResolvedValueOnce({
			id: 'inc-1',
			accountId,
			amount: new D(amount),
			date: new Date('2026-04-01'),
			description: 'Salary',
		});
	}

	it('amount-only change recreates tithe child at the new amount', async () => {
		setupAccounts();
		setupOldIncomeWithTitheChild();
		setupIncomeUpdateReturn(2000, 'main-asset');
		mocks.accountFindFirst.mockResolvedValueOnce({
			id: 'tithes-acct',
			isLiability: false,
		});

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			amount: 2000,
			titheEnabled: true,
			tithePercentage: 10,
		});

		// Old tithe child reversed: credit main-asset, debit tithes, delete row.
		expect(mocks.accountUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'main-asset', userId: 'user-1' },
				data: { balance: { increment: new D(100) } },
			})
		);
		expect(mocks.accountUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'tithes-acct', userId: 'user-1' },
				data: { balance: { decrement: new D(100) } },
			})
		);
		expect(mocks.transferDelete).toHaveBeenCalledWith({
			where: { id: 'xfer-tithe-1' },
		});

		// New tithe child created with new amount (200 = 10% of 2000).
		expect(mocks.transferCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					amount: 200,
					fromAccountId: 'main-asset',
					toAccountId: 'tithes-acct',
					parentIncomeId: 'inc-1',
				}),
			})
		);
	});

	it('toggling tithe OFF reverses the child but does not recreate', async () => {
		setupAccounts();
		setupOldIncomeWithTitheChild();
		setupIncomeUpdateReturn(1000, 'main-asset');

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			titheEnabled: false,
		});

		expect(mocks.transferDelete).toHaveBeenCalledOnce();
		expect(mocks.transferCreate).not.toHaveBeenCalled();
	});

	it('toggling tithe ON when there was no child creates one', async () => {
		setupAccounts();
		mocks.incomeFindUniqueOrThrow.mockResolvedValueOnce({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(1000),
			date: new Date('2026-04-01'),
			description: 'Salary',
			childTransfers: [], // no children to reverse
		});
		setupIncomeUpdateReturn(1000, 'main-asset');
		mocks.accountFindFirst.mockResolvedValueOnce({
			id: 'tithes-acct',
			isLiability: false,
		});

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			titheEnabled: true,
			tithePercentage: 10,
		});

		expect(mocks.transferDelete).not.toHaveBeenCalled();
		expect(mocks.transferCreate).toHaveBeenCalledOnce();
		expect(mocks.transferCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ amount: 100 }),
			})
		);
	});

	it('moving tithe-enabled income to a liability account does NOT recreate the tithe child', async () => {
		setupAccounts();
		setupOldIncomeWithTitheChild();
		setupIncomeUpdateReturn(1000, 'main-liability');

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			accountId: 'main-liability',
			titheEnabled: true,
			tithePercentage: 10,
		});

		// Old tithe child still gets reversed.
		expect(mocks.transferDelete).toHaveBeenCalledOnce();
		// New tithe child is NOT created (liability accounts can't tithe).
		expect(mocks.transferCreate).not.toHaveBeenCalled();
	});

	it('changing the source account moves the new tithe child to the new fromAccount', async () => {
		mocks.accountFindUnique.mockImplementation(
			async ({ where }: { where: { id: string } }) => {
				if (where.id === 'main-asset') return { isLiability: false };
				if (where.id === 'second-asset') return { isLiability: false };
				if (where.id === 'tithes-acct') return { isLiability: false };
				return { isLiability: false };
			}
		);
		setupOldIncomeWithTitheChild();
		setupIncomeUpdateReturn(1000, 'second-asset');
		mocks.accountFindFirst.mockResolvedValueOnce({
			id: 'tithes-acct',
			isLiability: false,
		});

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			accountId: 'second-asset',
			titheEnabled: true,
			tithePercentage: 10,
		});

		expect(mocks.transferCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					fromAccountId: 'second-asset',
				}),
			})
		);
	});

	it('income with both tithe AND EF children reverses and recreates both', async () => {
		setupAccounts();
		mocks.incomeFindUniqueOrThrow.mockResolvedValueOnce({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(1000),
			date: new Date('2026-04-01'),
			description: 'Salary',
			childTransfers: [
				{
					id: 'xfer-tithe-1',
					amount: new D(100),
					fromAccountId: 'main-asset',
					toAccountId: 'tithes-acct',
					efGoalId: null,
				},
				{
					id: 'xfer-ef-1',
					amount: new D(50),
					fromAccountId: 'main-asset',
					toAccountId: 'ef-acct',
					efGoalId: 'goal-1',
				},
			],
		});
		setupIncomeUpdateReturn(2000, 'main-asset');
		mocks.accountFindFirst.mockResolvedValueOnce({
			id: 'tithes-acct',
			isLiability: false,
		});
		mocks.goalFindFirst.mockResolvedValueOnce({
			id: 'goal-1',
			linkedAccountId: 'ef-acct',
		});

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			amount: 2000,
			titheEnabled: true,
			tithePercentage: 10,
			emergencyFundEnabled: true,
			emergencyFundPercentage: 5,
		});

		expect(mocks.transferDelete).toHaveBeenCalledTimes(2);
		expect(mocks.transferCreate).toHaveBeenCalledTimes(2);
		// EF goal currentAmount: decremented by old (50), then incremented by new (100).
		expect(mocks.goalUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { currentAmount: { decrement: new D(50) } },
			})
		);
		expect(mocks.goalUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { currentAmount: { increment: 100 } },
			})
		);
	});
});
