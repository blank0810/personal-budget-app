import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Prisma singleton BEFORE importing the service. vi.hoisted
// captures the spies so they're available inside the mock factory (which
// vitest hoists to the top of the file).
const { accountUpdate, accountCreate } = vi.hoisted(() => ({
	accountUpdate: vi.fn(async ({ data }: { data: unknown }) => ({
		id: 'acct-1',
		...(data as object),
	})),
	accountCreate: vi.fn(async ({ data }: { data: unknown }) => ({
		id: 'acct-1',
		...(data as object),
	})),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		account: {
			update: accountUpdate,
			create: accountCreate,
		},
		// Stubs to prevent transitive imports from blowing up at load time.
		income: {},
		expense: {},
		transfer: {},
		$transaction: async (fn: (tx: unknown) => unknown) => fn({}),
	},
}));

// Stub the dependent services to avoid their own DB hits at import time.
vi.mock('../income/income.service', () => ({ IncomeService: {} }));
vi.mock('../expense/expense.service', () => ({ ExpenseService: {} }));

import { AccountService } from './account.service';

describe('AccountService.updateAccount — P0-3 strip regression', () => {
	beforeEach(() => {
		accountUpdate.mockClear();
	});

	it('drops `balance` from the payload even when forced via `as any`', async () => {
		await AccountService.updateAccount('user-1', {
			id: 'acct-1',
			name: 'Renamed',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			balance: 9999,
		} as any);

		expect(accountUpdate).toHaveBeenCalledOnce();
		const passedData = accountUpdate.mock.calls[0][0].data;
		expect(passedData).not.toHaveProperty('balance');
		expect(passedData).toMatchObject({ name: 'Renamed' });
	});

	it('drops `openingBalance` from the payload even when forced via `as any`', async () => {
		await AccountService.updateAccount('user-1', {
			id: 'acct-1',
			name: 'Renamed',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			openingBalance: 1234,
		} as any);

		const passedData = accountUpdate.mock.calls[0][0].data;
		expect(passedData).not.toHaveProperty('openingBalance');
	});

	it('drops both balance and openingBalance simultaneously', async () => {
		await AccountService.updateAccount('user-1', {
			id: 'acct-1',
			name: 'Renamed',
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			balance: 1,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			openingBalance: 2,
		} as any);

		const passedData = accountUpdate.mock.calls[0][0].data;
		expect(passedData).not.toHaveProperty('balance');
		expect(passedData).not.toHaveProperty('openingBalance');
		expect(passedData).toMatchObject({ name: 'Renamed' });
	});

	it('passes legitimate fields through unchanged', async () => {
		await AccountService.updateAccount('user-1', {
			id: 'acct-1',
			name: 'Renamed',
			color: 'blue',
			isLiability: true,
		});

		const passedData = accountUpdate.mock.calls[0][0].data;
		expect(passedData).toMatchObject({
			name: 'Renamed',
			color: 'blue',
			isLiability: true,
		});
	});

	it('handles an empty payload (only id) without error', async () => {
		await AccountService.updateAccount('user-1', { id: 'acct-1' });

		const passedData = accountUpdate.mock.calls[0][0].data;
		expect(passedData).toEqual({});
	});
});

describe('AccountService.createAccount — openingBalance strip', () => {
	beforeEach(() => {
		accountCreate.mockClear();
	});

	it('strips a hand-crafted openingBalance from the create payload', async () => {
		await AccountService.createAccount('user-1', {
			name: 'Wallet',
			type: 'CASH',
			balance: 100,
			isLiability: false,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			openingBalance: 9999,
		} as any);

		const passedData = accountCreate.mock.calls[0][0].data as {
			openingBalance: { toString(): string } | number | null;
		};
		// The legitimate openingBalance is derived from balance, not the
		// hand-crafted value.
		expect(passedData.openingBalance).not.toBe(9999);
		// 100 is converted to a Decimal, so we just check it stringifies
		// back to the trusted value.
		const opening = passedData.openingBalance;
		const stringified =
			opening && typeof opening === 'object' && 'toString' in opening
				? opening.toString()
				: String(opening);
		expect(stringified).toBe('100');
	});

	it('passes openingBalance as null when balance is zero', async () => {
		await AccountService.createAccount('user-1', {
			name: 'Empty',
			type: 'CASH',
			balance: 0,
			isLiability: false,
		});

		const passedData = accountCreate.mock.calls[0][0].data as {
			openingBalance: unknown;
		};
		expect(passedData.openingBalance).toBeNull();
	});
});
