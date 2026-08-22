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
	const incomeCreate = vi.fn();
	const incomeUpdate = vi.fn();
	const categoryFindUnique = vi.fn();
	const accountFindUnique = vi.fn();
	const accountFindFirst = vi.fn();
	const accountUpdate = vi.fn();
	const accountCreate = vi.fn();
	const transferCreate = vi.fn();
	const transferDelete = vi.fn();
	const goalFindFirst = vi.fn();
	const goalUpdate = vi.fn();
	const sendIncomeNotification = vi.fn();

	return {
		state,
		incomeFindUniqueOrThrow,
		incomeCreate,
		incomeUpdate,
		categoryFindUnique,
		accountFindUnique,
		accountFindFirst,
		accountUpdate,
		accountCreate,
		transferCreate,
		transferDelete,
		goalFindFirst,
		goalUpdate,
		sendIncomeNotification,
	};
});

vi.mock('@/lib/prisma', () => {
	const tx = {
		income: {
			findUniqueOrThrow: mocks.incomeFindUniqueOrThrow,
			create: mocks.incomeCreate,
			update: mocks.incomeUpdate,
		},
		category: {
			findUnique: mocks.categoryFindUnique,
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
	NotificationService: { sendIncomeNotification: mocks.sendIncomeNotification },
}));

import { IncomeService } from './income.service';
import { toCents } from '@/lib/money';
import type { CreateIncomeInput } from './income.types';

describe('IncomeService.updateIncome — P0-1 reverse-then-reapply', () => {
	beforeEach(() => {
		mocks.incomeFindUniqueOrThrow.mockReset();
		mocks.incomeCreate.mockReset();
		mocks.incomeUpdate.mockReset();
		mocks.categoryFindUnique.mockReset();
		mocks.accountFindUnique.mockReset();
		mocks.accountFindFirst.mockReset();
		mocks.accountUpdate.mockReset();
		mocks.accountCreate.mockReset();
		mocks.transferCreate.mockReset();
		mocks.transferDelete.mockReset();
		mocks.goalFindFirst.mockReset();
		mocks.goalUpdate.mockReset();
		mocks.sendIncomeNotification.mockReset();
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

type NumericMutationValue = number | Prisma.Decimal;

type BalanceMutationArgs = {
	where: { id: string; userId: string };
	data: {
		balance: {
			increment?: NumericMutationValue;
			decrement?: NumericMutationValue;
		};
	};
};

type GoalMutationArgs = {
	data: {
		currentAmount: {
			increment?: NumericMutationValue;
			decrement?: NumericMutationValue;
		};
	};
};

type TransferCreateArgs = {
	data: { amount: number };
};

type IncomeWriteArgs = {
	data: { amount: number };
};

function numericValue(value: NumericMutationValue): number {
	return typeof value === 'number' ? value : value.toNumber();
}

function balanceMutations(start = 0): BalanceMutationArgs[] {
	const calls = mocks.accountUpdate.mock.calls as unknown as Array<
		[BalanceMutationArgs]
	>;
	return calls.slice(start).map(([args]) => args);
}

function goalMutations(start = 0): GoalMutationArgs[] {
	const calls = mocks.goalUpdate.mock.calls as unknown as Array<
		[GoalMutationArgs]
	>;
	return calls.slice(start).map(([args]) => args);
}

function transferCreates(start = 0): TransferCreateArgs[] {
	const calls = mocks.transferCreate.mock.calls as unknown as Array<
		[TransferCreateArgs]
	>;
	return calls.slice(start).map(([args]) => args);
}

function netBalanceChangeInCents(
	mutations: BalanceMutationArgs[],
	accountId: string
): number {
	return mutations
		.filter((mutation) => mutation.where.id === accountId)
		.reduce((total, mutation) => {
			const { increment, decrement } = mutation.data.balance;
			if (increment !== undefined) {
				return total + toCents(numericValue(increment));
			}
			if (decrement !== undefined) {
				return total - toCents(numericValue(decrement));
			}
			return total;
		}, 0);
}

function netGoalChangeInCents(mutations: GoalMutationArgs[]): number {
	return mutations.reduce((total, mutation) => {
		const { increment, decrement } = mutation.data.currentAmount;
		if (increment !== undefined) {
			return total + toCents(numericValue(increment));
		}
		if (decrement !== undefined) {
			return total - toCents(numericValue(decrement));
		}
		return total;
	}, 0);
}

function createIncomeInput(
	overrides: Partial<CreateIncomeInput> = {}
): CreateIncomeInput {
	return {
		amount: 100.55,
		description: 'Salary',
		date: new Date('2026-04-01'),
		categoryId: 'category-1',
		accountId: 'main-asset',
		titheEnabled: false,
		tithePercentage: 10,
		emergencyFundEnabled: false,
		emergencyFundPercentage: 10,
		...overrides,
	};
}

describe('IncomeService money rounding symmetry', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.state.oldIncome = null;
		mocks.state.accountsById.clear();
		mocks.state.titheAccount = null;
		mocks.state.efGoal = null;

		mocks.incomeCreate.mockImplementation(
			async ({ data }: { data: Record<string, unknown> & { amount: number } }) => ({
				id: 'inc-1',
				...data,
				amount: new D(data.amount),
			})
		);
		mocks.categoryFindUnique.mockResolvedValue({ name: 'Salary' });
		mocks.accountFindUnique.mockResolvedValue({
			isLiability: false,
			name: 'Checking',
			balance: new D(1000),
		});
		mocks.sendIncomeNotification.mockResolvedValue(undefined);
	});

	it('books and reverses the identical rounded tithe amount', async () => {
		mocks.accountFindFirst.mockResolvedValue({
			id: 'tithes-acct',
			isLiability: false,
		});

		await IncomeService.createIncome(
			'user-1',
			createIncomeInput({ titheEnabled: true, tithePercentage: 10 })
		);

		const bookedAmount = transferCreates()[0].data.amount;
		const createBalanceMutations = balanceMutations();
		const sourceDeduction = createBalanceMutations.find(
			(mutation) =>
				mutation.where.id === 'main-asset' &&
				mutation.data.balance.decrement !== undefined
		)?.data.balance.decrement;
		const destinationIncrement = createBalanceMutations.find(
			(mutation) =>
				mutation.where.id === 'tithes-acct' &&
				mutation.data.balance.increment !== undefined
		)?.data.balance.increment;

		expect(typeof bookedAmount).toBe('number');
		expect([
			bookedAmount,
			numericValue(sourceDeduction!),
			numericValue(destinationIncrement!),
		]).toEqual([10.06, 10.06, 10.06]);
		expect(mocks.sendIncomeNotification).toHaveBeenCalledWith(
			'user-1',
			expect.anything(),
			expect.anything(),
			{ tithe: { amount: bookedAmount, percentage: 10 } }
		);

		const balanceStart = mocks.accountUpdate.mock.calls.length;
		const transferStart = mocks.transferCreate.mock.calls.length;
		mocks.incomeFindUniqueOrThrow.mockResolvedValue({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(100.55),
			date: new Date('2026-04-01'),
			description: 'Salary',
			childTransfers: [
				{
					id: 'xfer-tithe-1',
					amount: new D(bookedAmount),
					fromAccountId: 'main-asset',
					toAccountId: 'tithes-acct',
					efGoalId: null,
				},
			],
		});
		mocks.incomeUpdate.mockResolvedValue({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(100.55),
			date: new Date('2026-04-01'),
			description: 'Salary',
		});

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			amount: 100.55,
			titheEnabled: true,
			tithePercentage: 10,
		});

		const updateBalanceMutations = balanceMutations(balanceStart);
		expect(
			numericValue(updateBalanceMutations[0].data.balance.increment!)
		).toBe(bookedAmount);
		expect(
			numericValue(updateBalanceMutations[1].data.balance.decrement!)
		).toBe(bookedAmount);
		expect(transferCreates(transferStart)[0].data.amount).toBe(bookedAmount);
		expect(
			netBalanceChangeInCents(updateBalanceMutations, 'main-asset')
		).toBe(0);
		expect(
			netBalanceChangeInCents(updateBalanceMutations, 'tithes-acct')
		).toBe(0);
	});

	it('books and reverses one rounded emergency-fund amount everywhere', async () => {
		mocks.goalFindFirst.mockResolvedValue({
			id: 'goal-1',
			linkedAccountId: 'ef-acct',
		});

		await IncomeService.createIncome(
			'user-1',
			createIncomeInput({
				amount: 62,
				emergencyFundEnabled: true,
				emergencyFundPercentage: 8.25,
			})
		);

		const bookedAmount = transferCreates()[0].data.amount;
		const createBalanceMutations = balanceMutations();
		const sourceDeduction = createBalanceMutations.find(
			(mutation) =>
				mutation.where.id === 'main-asset' &&
				mutation.data.balance.decrement !== undefined
		)?.data.balance.decrement;
		const destinationIncrement = createBalanceMutations.find(
			(mutation) =>
				mutation.where.id === 'ef-acct' &&
				mutation.data.balance.increment !== undefined
		)?.data.balance.increment;
		const goalIncrement = goalMutations()[0].data.currentAmount.increment;

		expect(typeof bookedAmount).toBe('number');
		expect([
			bookedAmount,
			numericValue(sourceDeduction!),
			numericValue(destinationIncrement!),
			numericValue(goalIncrement!),
		]).toEqual([5.12, 5.12, 5.12, 5.12]);
		expect(mocks.sendIncomeNotification).toHaveBeenCalledWith(
			'user-1',
			expect.anything(),
			expect.anything(),
			{ emergencyFund: { amount: bookedAmount, percentage: 8.25 } }
		);

		const balanceStart = mocks.accountUpdate.mock.calls.length;
		const goalStart = mocks.goalUpdate.mock.calls.length;
		const transferStart = mocks.transferCreate.mock.calls.length;
		mocks.incomeFindUniqueOrThrow.mockResolvedValue({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(62),
			date: new Date('2026-04-01'),
			description: 'Salary',
			childTransfers: [
				{
					id: 'xfer-ef-1',
					amount: new D(bookedAmount),
					fromAccountId: 'main-asset',
					toAccountId: 'ef-acct',
					efGoalId: 'goal-1',
				},
			],
		});
		mocks.incomeUpdate.mockResolvedValue({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(62),
			date: new Date('2026-04-01'),
			description: 'Salary',
		});

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			amount: 62,
			emergencyFundEnabled: true,
			emergencyFundPercentage: 8.25,
		});

		const updateBalanceMutations = balanceMutations(balanceStart);
		const updateGoalMutations = goalMutations(goalStart);
		expect(
			numericValue(updateBalanceMutations[0].data.balance.increment!)
		).toBe(bookedAmount);
		expect(
			numericValue(updateBalanceMutations[1].data.balance.decrement!)
		).toBe(bookedAmount);
		expect(
			numericValue(
				updateGoalMutations[0].data.currentAmount.decrement!
			)
		).toBe(bookedAmount);
		expect(
			numericValue(
				updateGoalMutations[1].data.currentAmount.increment!
			)
		).toBe(bookedAmount);
		expect(transferCreates(transferStart)[0].data.amount).toBe(bookedAmount);
		expect(
			netBalanceChangeInCents(updateBalanceMutations, 'main-asset')
		).toBe(0);
		expect(
			netBalanceChangeInCents(updateBalanceMutations, 'ef-acct')
		).toBe(0);
		expect(netGoalChangeInCents(updateGoalMutations)).toBe(0);
	});

	it('writes and applies the same rounded income amount on create and update', async () => {
		await IncomeService.createIncome(
			'user-1',
			createIncomeInput({ amount: 100.555 })
		);

		const incomeCreateCalls = mocks.incomeCreate.mock.calls as unknown as Array<
			[IncomeWriteArgs]
		>;
		const storedCreateAmount = incomeCreateCalls[0][0].data.amount;
		const createBalanceAmount = numericValue(
			balanceMutations()[0].data.balance.increment!
		);

		expect(storedCreateAmount).toBe(100.56);
		expect(createBalanceAmount).toBe(storedCreateAmount);

		const balanceStart = mocks.accountUpdate.mock.calls.length;
		mocks.incomeFindUniqueOrThrow.mockResolvedValue({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(storedCreateAmount),
			date: new Date('2026-04-01'),
			description: 'Salary',
			childTransfers: [],
		});
		mocks.incomeUpdate.mockResolvedValue({
			id: 'inc-1',
			accountId: 'main-asset',
			amount: new D(100.56),
			date: new Date('2026-04-01'),
			description: 'Salary',
		});

		await IncomeService.updateIncome('user-1', {
			id: 'inc-1',
			amount: 100.555,
		});

		const incomeUpdateCalls = mocks.incomeUpdate.mock.calls as unknown as Array<
			[IncomeWriteArgs]
		>;
		const storedUpdateAmount = incomeUpdateCalls[0][0].data.amount;
		const updateBalanceMutations = balanceMutations(balanceStart);
		const reappliedAmount = numericValue(
			updateBalanceMutations[1].data.balance.increment!
		);

		expect(storedUpdateAmount).toBe(100.56);
		expect(reappliedAmount).toBe(storedUpdateAmount);
		expect(
			netBalanceChangeInCents(updateBalanceMutations, 'main-asset')
		).toBe(0);
	});
});
