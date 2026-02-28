'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { completeOnboarding } from '@/server/modules/onboarding/onboarding.controller';
import { toast } from 'sonner';
import { PartyPopper, ArrowRight } from 'lucide-react';

export function CompleteStep() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function handleComplete() {
		setLoading(true);
		const result = await completeOnboarding();

		if (result.success) {
			toast.success('Welcome aboard!');
			router.push('/dashboard');
		} else {
			setLoading(false);
			toast.error(result.error || 'Something went wrong');
		}
	}

	return (
		<div className='text-center space-y-6 max-w-md'>
			<div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
				<PartyPopper className='h-8 w-8 text-green-600' />
			</div>
			<div className='space-y-2'>
				<h2 className='text-2xl font-bold'>You&apos;re All Set!</h2>
				<p className='text-muted-foreground'>
					Your budget planner is ready to go. You can always add more
					accounts, set up budgets, and customize your settings from
					the dashboard.
				</p>
			</div>
			<Button
				onClick={handleComplete}
				disabled={loading}
				size='lg'
				className='gap-2'
			>
				{loading ? 'Setting up...' : 'Go to Dashboard'}
				<ArrowRight className='h-4 w-4' />
			</Button>
		</div>
	);
}
