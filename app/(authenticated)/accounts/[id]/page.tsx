import { AccountService } from '@/server/modules/account/account.service';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { AccountLedger } from '@/components/modules/account/AccountLedger';
import { serialize } from '@/lib/serialization';

interface PageProps {
	params: Promise<{ id: string }>;
}

export default async function AccountLedgerPage({ params }: PageProps) {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const { id } = await params;
	const accountData = await AccountService.getAccountWithTransactions(
		session.user.id,
		id
	);

	if (!accountData) {
		notFound();
	}

	return (
		<div className='container mx-auto py-10'>
			<AccountLedger
				account={serialize(accountData)}
				transactions={serialize(accountData.transactions)}
			/>
		</div>
	);
}
