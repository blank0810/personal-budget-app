import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { UserService } from '@/server/modules/user/user.service';

import { KpiCardsSection } from './_components/KpiCardsSection';
import { KpiCardsSkeleton } from './_components/KpiCardsSkeleton';
import { BudgetHealthSection } from './_components/BudgetHealthSection';
import { BudgetHealthSkeleton } from './_components/BudgetHealthSkeleton';
import { GoalsSection } from './_components/GoalsSection';
import { GoalsSkeleton } from './_components/GoalsSkeleton';
import { InvoiceSection } from './_components/InvoiceSection';
import { InvoiceSkeleton } from './_components/InvoiceSkeleton';
import { TransactionsAndAccountsSection } from './_components/TransactionsAndAccountsSection';
import { TransactionsAndAccountsSkeleton } from './_components/TransactionsAndAccountsSkeleton';

export default async function DashboardPage() {
	const session = await auth();
	if (!session?.user?.id) {
		redirect('/api/auth/signin');
	}

	const userId = session.user.id;

	const currency = await UserService.getCurrency(userId);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Dashboard
				</h1>
			</div>

			<Suspense fallback={<KpiCardsSkeleton />}>
				<KpiCardsSection userId={userId} currency={currency} />
			</Suspense>

			<Suspense fallback={<BudgetHealthSkeleton />}>
				<BudgetHealthSection userId={userId} />
			</Suspense>

			<Suspense fallback={<GoalsSkeleton />}>
				<GoalsSection userId={userId} />
			</Suspense>

			<Suspense fallback={<InvoiceSkeleton />}>
				<InvoiceSection userId={userId} currency={currency} />
			</Suspense>

			<Suspense fallback={<TransactionsAndAccountsSkeleton />}>
				<TransactionsAndAccountsSection userId={userId} currency={currency} />
			</Suspense>
		</div>
	);
}
