import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { serialize } from '@/lib/serialization';
import { getAccountsAction, getAccountSummaryAction } from '@/server/modules/account/account.controller';
import { AccountKPICards } from '@/components/modules/account/AccountKPICards';
import { AccountPageContainer } from '@/components/modules/account/AccountPageContainer';

export default async function AccountsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const [accountsResult, summaryResult] = await Promise.all([
		getAccountsAction(),
		getAccountSummaryAction(),
	]);

	const accounts = accountsResult.success ? accountsResult.data : [];
	const summary = summaryResult.success
		? summaryResult.data
		: { totalBalance: 0, totalDebt: 0, netWorth: 0, creditUtilization: null };

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<AccountPageContainer accounts={serialize(accounts)} summary={summary} />
		</div>
	);
}
