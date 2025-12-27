import { AccountForm } from '@/components/modules/account/AccountForm';
import { AccountList } from '@/components/modules/account/AccountList';
import { AccountService } from '@/server/modules/account/account.service';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { serialize } from '@/lib/serialization';

export default async function AccountsPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const accounts = await AccountService.getAccounts(session.user.id);

	return (
		<div className='container mx-auto py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-3xl font-bold tracking-tight'>Accounts</h1>
			</div>

			<div className='grid gap-8 md:grid-cols-[350px_1fr]'>
				<div className='space-y-6'>
					<Card>
						<CardHeader>
							<CardTitle>Create Account</CardTitle>
						</CardHeader>
						<CardContent>
							<AccountForm />
						</CardContent>
					</Card>
				</div>

				<div className='space-y-6'>
					<h2 className='text-xl font-semibold tracking-tight'>
						Your Accounts
					</h2>
					<AccountList accounts={serialize(accounts)} />
				</div>
			</div>
		</div>
	);
}
