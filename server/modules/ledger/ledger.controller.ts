'use server';

import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { LedgerService } from './ledger.service';
import { ledgerFilterSchema } from './ledger.types';
import { coerceDateFields } from '@/server/lib/action-utils';

export async function getLedgerPageAction(filter: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = ledgerFilterSchema.safeParse(coerceDateFields(filter));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid filter' };
	}

	try {
		const data = await LedgerService.getPage(userId, parsed.data);
		return { success: true as const, data };
	} catch (error) {
		console.error('Failed to load ledger page:', error);
		return { error: 'Failed to load ledger' };
	}
}

export async function getLedgerKpiAction(filter: unknown) {
	const userId = await getAuthenticatedUser();

	const parsed = ledgerFilterSchema.safeParse(coerceDateFields(filter));
	if (!parsed.success) {
		return { error: parsed.error.issues[0]?.message || 'Invalid filter' };
	}

	try {
		const data = await LedgerService.getKpiSnapshot(userId, parsed.data);
		return { success: true as const, data };
	} catch (error) {
		console.error('Failed to load ledger KPI:', error);
		return { error: 'Failed to load KPIs' };
	}
}
