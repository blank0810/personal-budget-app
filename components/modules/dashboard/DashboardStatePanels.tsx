'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function DashboardEmptyState() {
	return (
		<section
			className='border-y py-14 sm:py-20'
			aria-labelledby='dashboard-empty-title'
		>
			<div className='max-w-2xl'>
				<h2
					id='dashboard-empty-title'
					className='text-2xl font-semibold tracking-[-0.025em] sm:text-3xl'
				>
					Your dashboard needs real data.
				</h2>
				<p className='mt-3 max-w-[65ch] text-muted-foreground'>
					Add an account, then record income and expenses. Financial health
					only appears when there is enough evidence to judge it.
				</p>
				<Button asChild className='mt-6'>
					<Link href='/accounts'>Add account</Link>
				</Button>
			</div>
		</section>
	);
}

export function DashboardErrorState() {
	const router = useRouter();
	return (
		<section className='mx-auto max-w-xl border-y py-14 text-center'>
			<h1 className='text-2xl font-semibold tracking-[-0.025em]'>
				The dashboard did not load.
			</h1>
			<p className='mt-3 text-muted-foreground'>
				Your data was not changed. Retry the snapshot or open Transactions.
			</p>
			<div className='mt-6 flex justify-center gap-2'>
				<Button type='button' onClick={() => router.refresh()}>
					Try again
				</Button>
				<Button variant='outline' asChild>
					<Link href='/transactions'>Open Transactions</Link>
				</Button>
			</div>
		</section>
	);
}
