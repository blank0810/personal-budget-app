import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAccountsAction } from '@/server/modules/account/account.controller';
import { getLedgerPageAction, getLedgerKpiAction } from '@/server/modules/ledger/ledger.controller';
import { LedgerPage } from '@/components/modules/ledger/LedgerPage';
import { serialize } from '@/lib/serialization';

export default async function LedgerPageRoute({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const params = await searchParams;

	// Parse filter from searchParams
	const startDate = typeof params.from === 'string' ? params.from : undefined;
	const endDate = typeof params.to === 'string' ? params.to : undefined;
	const type = typeof params.type === 'string' ? params.type : undefined;
	const page = typeof params.page === 'string' ? Number(params.page) : 1;
	const pageSize = typeof params.pageSize === 'string' ? Number(params.pageSize) : 25;

	// Account IDs can appear multiple times as ?accountId=x&accountId=y
	const rawAccountIds = params.accountId;
	const accountIds = Array.isArray(rawAccountIds)
		? rawAccountIds
		: rawAccountIds
			? [rawAccountIds]
			: undefined;

	const filter = {
		type,
		accountIds,
		startDate,
		endDate,
		page,
		pageSize,
	};

	// Fetch ledger page + KPI + accounts in parallel — all via controller
	// actions so auth and validation flow through a single boundary.
	const [ledgerResult, kpiResult, accountsResult] = await Promise.all([
		getLedgerPageAction(filter),
		getLedgerKpiAction(filter),
		getAccountsAction(),
	]);

	const initialPage =
		'data' in ledgerResult && ledgerResult.data ? ledgerResult.data : null;
	const initialKpi =
		'data' in kpiResult && kpiResult.data ? kpiResult.data : null;
	const accounts =
		'data' in accountsResult && accountsResult.data ? accountsResult.data : [];

	const accountOptions = accounts.map((a) => ({
		id: a.id,
		name: a.name,
	}));

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<div>
				<h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>
					Global Ledger
				</h1>
				<p className='text-sm text-muted-foreground'>
					All transactions across every account with running totals
				</p>
			</div>

			<LedgerPage
				initialPage={initialPage}
				initialKpi={serialize(initialKpi)}
				accounts={accountOptions}
			/>
		</div>
	);
}
