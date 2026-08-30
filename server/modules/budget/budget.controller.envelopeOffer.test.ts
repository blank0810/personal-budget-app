import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getAuthenticatedUser: vi.fn(),
	getInferredEnvelopeOffer: vi.fn(),
}));

vi.mock('@/server/lib/auth-guard', () => ({
	getAuthenticatedUser: mocks.getAuthenticatedUser,
}));

vi.mock('./budget.analytics.service', () => ({
	BudgetAnalyticsService: {
		getInferredEnvelopeOffer: mocks.getInferredEnvelopeOffer,
	},
}));

import { getInferredEnvelopeOfferAction } from './budget.controller';

describe('getInferredEnvelopeOfferAction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getAuthenticatedUser.mockResolvedValue('user-1');
	});

	it('authenticates, validates the month, and returns the delayed offer', async () => {
		const offer = {
			eligible: true,
			loggingDays: 75,
			minimumLoggingDays: 42,
			suggestions: [
				{
					categoryId: 'category-food',
					categoryName: 'Food',
					recentAverage: 425,
					monthsObserved: 3,
				},
			],
		};
		mocks.getInferredEnvelopeOffer.mockResolvedValue(offer);

		await expect(
			getInferredEnvelopeOfferAction({
				month: '2026-08-16T00:00:00.000Z',
			})
		).resolves.toEqual({ success: true, data: offer });
		expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(mocks.getInferredEnvelopeOffer).toHaveBeenCalledWith(
			'user-1',
			new Date(Date.UTC(2026, 7, 16, 0, 0, 0, 0))
		);
	});

	it('rejects an invalid month before querying analytics', async () => {
		await expect(
			getInferredEnvelopeOfferAction({ month: 'not-a-date' })
		).resolves.toEqual({ error: 'Invalid month' });
		expect(mocks.getAuthenticatedUser).toHaveBeenCalledOnce();
		expect(mocks.getInferredEnvelopeOffer).not.toHaveBeenCalled();
	});

	it('returns a safe error when the offer cannot be loaded', async () => {
		const error = new Error('database details');
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		mocks.getInferredEnvelopeOffer.mockRejectedValue(error);

		await expect(
			getInferredEnvelopeOfferAction({
				month: new Date(Date.UTC(2026, 7, 16, 0, 0, 0, 0)),
			})
		).resolves.toEqual({ error: 'Failed to load envelope history' });
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to load envelope history:',
			error
		);
		consoleError.mockRestore();
	});
});
