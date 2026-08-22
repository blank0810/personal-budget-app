type PartyNames = {
	companyName?: string | null;
	clientName?: string | null;
};

type PartyContact = {
	clientName?: string | null;
	clientEmail?: string | null;
	clientPhone?: string | null;
};

type PartyEmails = {
	clientEmail?: string | null;
	companyEmail?: string | null;
};

/** Return the company name first, falling back to the contact name. */
export function billedPartyName(party: PartyNames): string {
	return (party.companyName?.trim() ? party.companyName : null) ||
		(party.clientName?.trim() ? party.clientName : null) ||
		'';
}

/** Return the contact name first, falling back to the company name. */
export function greetingName(party: PartyNames): string {
	return (party.clientName?.trim() ? party.clientName : null) ||
		(party.companyName?.trim() ? party.companyName : null) ||
		'';
}

/** Return the contact email first, falling back to the company email. */
export function invoiceRecipientEmail(party: PartyEmails): string | null {
	return (party.clientEmail?.trim() ? party.clientEmail : null) ||
		(party.companyEmail?.trim() ? party.companyEmail : null) ||
		null;
}

/**
 * True when the invoice carries any point-person detail at all. The document
 * renderers gate the contact block on this rather than on the name alone —
 * gating on the name silently dropped a contact's email and phone when only
 * those were filled in.
 */
export function hasContactDetails(party: PartyContact): boolean {
	return Boolean(
		party.clientName?.trim() ||
			party.clientEmail?.trim() ||
			party.clientPhone?.trim()
	);
}
