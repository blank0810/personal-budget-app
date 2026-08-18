import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ domainsList: vi.fn() }));

vi.mock('resend', () => ({
	Resend: class {
		domains = { list: mocks.domainsList };
		emails = { send: vi.fn() };
	},
}));

const { resendProvider } = await import('./resend.provider');

const CONFIG = {
	provider: 'RESEND' as const,
	apiKey: 're_test_key',
	fromEmail: 'noreply@budget.umbra.build',
	fromName: 'Budget Planner',
	replyToEmail: null,
};

describe('resendProvider.verify', () => {
	beforeEach(() => vi.clearAllMocks());

	it('accepts a full-access key that can list domains', async () => {
		mocks.domainsList.mockResolvedValue({ data: { data: [] }, error: null });

		const result = await resendProvider.verify(CONFIG);

		expect(result.ok).toBe(true);
	});

	it('accepts a sending-scoped key, which cannot list domains', async () => {
		// The correct way to create these keys is sending_access + domain_id, and
		// that key gets `restricted_api_key` from domains.list. Reporting it as a
		// failure would brand a properly-scoped key broken and nudge the operator
		// into granting full access just to see a green tick.
		mocks.domainsList.mockResolvedValue({
			data: null,
			error: {
				name: 'restricted_api_key',
				message: 'This API key is restricted to only send emails',
				statusCode: 401,
			},
		});

		const result = await resendProvider.verify(CONFIG);

		expect(result.ok).toBe(true);
		expect(result.message).toMatch(/scoped to sending only/i);
	});

	it('rejects a genuinely invalid key', async () => {
		mocks.domainsList.mockResolvedValue({
			data: null,
			error: {
				name: 'invalid_api_key',
				message: 'API key is invalid',
				statusCode: 403,
			},
		});

		const result = await resendProvider.verify(CONFIG);

		expect(result.ok).toBe(false);
		expect(result.message).toBe('API key is invalid');
	});

	it('rejects a missing key', async () => {
		mocks.domainsList.mockResolvedValue({
			data: null,
			error: {
				name: 'missing_api_key',
				message: 'Missing API key in the authorization header',
				statusCode: 401,
			},
		});

		await expect(resendProvider.verify(CONFIG)).resolves.toMatchObject({
			ok: false,
		});
	});

	it('redacts any key echoed back in an error', async () => {
		mocks.domainsList.mockResolvedValue({
			data: null,
			error: {
				name: 'validation_error',
				message: 'Bad key re_abcd1234efgh5678 supplied',
				statusCode: 422,
			},
		});

		const result = await resendProvider.verify(CONFIG);

		expect(result.message).toBe('Bad key re_[redacted] supplied');
	});

	it('reports a thrown network error rather than crashing the panel', async () => {
		mocks.domainsList.mockRejectedValue(new Error('ECONNREFUSED'));

		await expect(resendProvider.verify(CONFIG)).resolves.toMatchObject({
			ok: false,
			message: 'ECONNREFUSED',
		});
	});
});
