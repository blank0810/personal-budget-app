import { describe, expect, it } from 'vitest';
import {
	billedPartyName,
	greetingName,
	invoiceRecipientEmail,
} from './invoice-party';

describe('invoice party helpers', () => {
	it('uses the company for billing and the person for greetings', () => {
		const party = {
			companyName: 'Acme Co',
			clientName: 'Jane Dela Cruz',
		};

		expect(billedPartyName(party)).toBe('Acme Co');
		expect(greetingName(party)).toBe('Jane Dela Cruz');
	});

	it('falls back from the contact email to the company email', () => {
		expect(
			invoiceRecipientEmail({
				clientEmail: '',
				companyEmail: 'billing@acme.com',
			})
		).toBe('billing@acme.com');
	});

	it('treats whitespace-only values as absent without trimming returned data', () => {
		expect(
			billedPartyName({ companyName: '   ', clientName: ' Jane ' })
		).toBe(' Jane ');
		expect(
			invoiceRecipientEmail({ clientEmail: ' ', companyEmail: ' billing@acme.com ' })
		).toBe(' billing@acme.com ');
	});
});
