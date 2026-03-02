'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { setUserCurrency } from '@/server/modules/onboarding/onboarding.controller';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CurrencyStepProps {
	onNext: () => void;
	onBack: () => void;
}

export function CurrencyStep({ onNext, onBack }: CurrencyStepProps) {
	const [selected, setSelected] = useState('USD');
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);

	const filtered = SUPPORTED_CURRENCIES.filter(
		(c) =>
			c.name.toLowerCase().includes(search.toLowerCase()) ||
			c.code.toLowerCase().includes(search.toLowerCase())
	);

	async function handleNext() {
		setLoading(true);
		const result = await setUserCurrency(selected);
		setLoading(false);

		if (result.success) {
			onNext();
		} else {
			toast.error(result.error || 'Failed to set currency');
		}
	}

	return (
		<div className='space-y-6 w-full max-w-md'>
			<div className='space-y-2'>
				<h2 className='text-xl font-bold'>Choose Your Currency</h2>
				<p className='text-sm text-muted-foreground'>
					This will be used across your entire account. Currency
					cannot be changed after setup.
				</p>
			</div>

			<div className='space-y-3'>
				<Label htmlFor='currency-search'>Search currencies</Label>
				<Input
					id='currency-search'
					placeholder='Search by name or code...'
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>

			<div className='grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1'>
				{filtered.map((currency) => (
					<button
						key={currency.code}
						type='button'
						onClick={() => setSelected(currency.code)}
						className={cn(
							'flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
							selected === currency.code
								? 'border-primary bg-primary/5'
								: 'border-border hover:bg-muted/50'
						)}
					>
						<div className='flex items-center gap-3'>
							<span className='text-lg font-mono'>
								{currency.symbol}
							</span>
							<div>
								<div className='font-medium text-sm'>
									{currency.name}
								</div>
								<div className='text-xs text-muted-foreground'>
									{currency.code}
								</div>
							</div>
						</div>
						{selected === currency.code && (
							<Check className='h-4 w-4 text-primary' />
						)}
					</button>
				))}
			</div>

			<div className='flex justify-between'>
				<Button variant='outline' onClick={onBack} className='gap-2'>
					<ArrowLeft className='h-4 w-4' />
					Back
				</Button>
				<Button
					onClick={handleNext}
					disabled={loading}
					className='gap-2'
				>
					{loading ? 'Saving...' : 'Continue'}
					<ArrowRight className='h-4 w-4' />
				</Button>
			</div>
		</div>
	);
}
