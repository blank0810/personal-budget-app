import { describe, expect, it } from 'vitest';
import {
	billedPartyName,
	greetingName,
	invoiceRecipientEmail,
	hasContactDetails,
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

describe('hasContactDetails', () => {
	it('is false when no point-person field is set', () => {
		expect(
			hasContactDetails({
				clientName: null,
				clientEmail: null,
				clientPhone: null,
				clientAddress: '   ',
			})
		).toBe(false);
	});

	it('is true on the name alone', () => {
		expect(hasContactDetails({ clientName: 'Jane Dela Cruz' })).toBe(true);
	});

	// The regression: a contact with an email but no name must still render.
	it('is true when only the email is set', () => {
		expect(hasContactDetails({ clientEmail: 'jane@acme.com' })).toBe(true);
	});

	it('is true when only the phone or address is set', () => {
		expect(hasContactDetails({ clientPhone: '+63 917 000 0000' })).toBe(true);
		expect(hasContactDetails({ clientAddress: '12 Rizal St' })).toBe(true);
	});
});
