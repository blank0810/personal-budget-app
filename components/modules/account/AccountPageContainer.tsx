'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountForm } from './AccountForm';
import { AccountList } from './AccountList';
import { Account } from '@prisma/client';

interface AccountPageContainerProps {
	accounts: Account[];
}

export function AccountPageContainer({ accounts }: AccountPageContainerProps) {
	const router = useRouter();

	const handleSuccess = useCallback(() => {
		router.refresh();
	}, [router]);

	return (
		<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
			<div className='min-w-0 space-y-6'>
				<Card>
					<CardHeader>
						<CardTitle>Create Account</CardTitle>
					</CardHeader>
					<CardContent>
						<AccountForm onSuccess={handleSuccess} />
					</CardContent>
				</Card>
			</div>

			<div className='min-w-0 space-y-6'>
				<h2 className='text-lg sm:text-xl font-semibold tracking-tight'>
					Your Accounts
				</h2>
				<AccountList accounts={accounts} />
			</div>
		</div>
	);
}
