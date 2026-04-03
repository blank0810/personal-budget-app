'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PaymentForm } from './PaymentForm';
import { PaymentList, PaymentWithRelations } from './PaymentList';
import { Account } from '@prisma/client';

interface PaymentPageContainerProps {
	payments: PaymentWithRelations[];
	accounts: Account[];
	hasLiabilities: boolean;
}

export function PaymentPageContainer({
	payments,
	accounts,
	hasLiabilities,
}: PaymentPageContainerProps) {
	const router = useRouter();

	const handleSuccess = useCallback(() => {
		router.refresh();
	}, [router]);

	return (
		<div className='grid grid-cols-1 gap-8 lg:grid-cols-[350px_1fr]'>
			<div className='min-w-0 space-y-6'>
				<Card>
					<CardHeader>
						<CardTitle>Make Payment</CardTitle>
						<CardDescription>
							Pay off debt from your asset accounts
						</CardDescription>
					</CardHeader>
					<CardContent>
						{hasLiabilities ? (
							<PaymentForm accounts={accounts} onSuccess={handleSuccess} />
						) : (
							<div className='text-center py-8 text-muted-foreground'>
								<p className='text-sm'>No liability accounts found.</p>
								<p className='text-xs mt-2'>
									Add a credit card or loan account to start making payments.
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<div className='min-w-0 space-y-6'>
				<h2 className='text-lg sm:text-xl font-semibold tracking-tight'>
					Payment History
				</h2>
				<PaymentList payments={payments} />
			</div>
		</div>
	);
}
