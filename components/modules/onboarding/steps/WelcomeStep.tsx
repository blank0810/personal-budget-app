'use client';

import { Button } from '@/components/ui/button';
import { Wallet, ArrowRight } from 'lucide-react';

interface WelcomeStepProps {
	userName: string;
	onNext: () => void;
}

export function WelcomeStep({ userName, onNext }: WelcomeStepProps) {
	return (
		<div className='text-center space-y-6 max-w-md'>
			<div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10'>
				<Wallet className='h-8 w-8 text-primary' />
			</div>
			<div className='space-y-2'>
				<h1 className='text-2xl font-bold'>
					Welcome, {userName}!
				</h1>
				<p className='text-muted-foreground'>
					Let&apos;s get your budget planner set up in just a few
					quick steps. This will only take a minute.
				</p>
			</div>
			<Button onClick={onNext} size='lg' className='gap-2'>
				Get Started
				<ArrowRight className='h-4 w-4' />
			</Button>
		</div>
	);
}
