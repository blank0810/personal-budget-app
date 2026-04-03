import { AccountPageContainer } from '@/components/modules/account/AccountPageContainer';
import { AccountService } from '@/server/modules/account/account.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { serialize } from '@/lib/serialization';

export default async function AccountsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const accounts = await AccountService.getAccounts(session.user.id);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>Accounts</h1>
			</div>

			<AccountPageContainer accounts={serialize(accounts)} />
		</div>
	);
}
