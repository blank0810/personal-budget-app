'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransferForm } from './TransferForm';
import { TransferList, TransferWithRelations } from './TransferList';
import { Account } from '@prisma/client';

interface TransferPageContainerProps {
	transfers: TransferWithRelations[];
	accounts: Account[];
}

export function TransferPageContainer({
	transfers,
	accounts,
}: TransferPageContainerProps) {
	const router = useRouter();

	const handleSuccess = useCallback(() => {
		router.refresh();
	}, [router]);

	return (
		<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
			<div className='min-w-0 space-y-6'>
				<Card>
					<CardHeader>
						<CardTitle>New Transfer</CardTitle>
					</CardHeader>
					<CardContent>
						<TransferForm accounts={accounts} onSuccess={handleSuccess} />
					</CardContent>
				</Card>
			</div>

			<div className='min-w-0 space-y-6'>
				<h2 className='text-lg sm:text-xl font-semibold tracking-tight'>
					Recent Transfers
				</h2>
				<TransferList transfers={transfers} />
			</div>
		</div>
	);
}
