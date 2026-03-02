'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { createAccountAction } from '@/server/modules/account/account.controller';
import { toast } from 'sonner';
import {
	ArrowLeft,
	ArrowRight,
	Landmark,
	Wallet,
	PiggyBank,
	CreditCard,
	CheckCircle2,
} from 'lucide-react';

interface AccountStepProps {
	onNext: () => void;
	onBack: () => void;
}

const ACCOUNT_TYPES = [
	{ value: 'BANK', label: 'Bank Account', icon: Landmark },
	{ value: 'CASH', label: 'Cash', icon: Wallet },
	{ value: 'SAVINGS', label: 'Savings', icon: PiggyBank },
	{ value: 'CREDIT', label: 'Credit Card', icon: CreditCard },
];

export function AccountStep({ onNext, onBack }: AccountStepProps) {
	const [created, setCreated] = useState(false);
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState('');
	const [type, setType] = useState('BANK');
	const [balance, setBalance] = useState<number | undefined>(0);

	async function handleCreate() {
		if (!name.trim()) {
			toast.error('Please enter an account name');
			return;
		}

		setLoading(true);
		const formData = new FormData();
		formData.set('name', name.trim());
		formData.set('type', type);
		formData.set('balance', String(balance ?? 0));

		const result = await createAccountAction(formData);
		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
		} else {
			setCreated(true);
			toast.success('Account created!');
		}
	}

	if (created) {
		return (
			<div className='space-y-6 w-full max-w-md text-center'>
				<div className='mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
					<CheckCircle2 className='h-8 w-8 text-green-600' />
				</div>
				<div className='space-y-2'>
					<h2 className='text-xl font-bold'>Account Created!</h2>
					<p className='text-sm text-muted-foreground'>
						You can add more accounts later from the Accounts page.
					</p>
				</div>
				<Button onClick={onNext} className='gap-2'>
					Continue
					<ArrowRight className='h-4 w-4' />
				</Button>
			</div>
		);
	}

	return (
		<div className='space-y-6 w-full max-w-md'>
			<div className='space-y-2'>
				<h2 className='text-xl font-bold'>Create Your First Account</h2>
				<p className='text-sm text-muted-foreground'>
					Add your primary bank account or wallet to start tracking.
				</p>
			</div>

			<div className='space-y-4'>
				<div className='space-y-2'>
					<Label htmlFor='account-name'>Account Name</Label>
					<Input
						id='account-name'
						placeholder='e.g. Main Checking'
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>

				<div className='space-y-2'>
					<Label>Account Type</Label>
					<Select value={type} onValueChange={setType}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ACCOUNT_TYPES.map((t) => (
								<SelectItem key={t.value} value={t.value}>
									<div className='flex items-center gap-2'>
										<t.icon className='h-4 w-4' />
										{t.label}
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className='space-y-2'>
					<Label htmlFor='account-balance'>Current Balance</Label>
					<CurrencyInput
						id='account-balance'
						value={balance}
						onChange={(val) => setBalance(val)}
					/>
				</div>
			</div>

			<div className='flex justify-between'>
				<Button variant='outline' onClick={onBack} className='gap-2'>
					<ArrowLeft className='h-4 w-4' />
					Back
				</Button>
				<div className='flex gap-2'>
					<Button variant='ghost' onClick={onNext}>
						Skip
					</Button>
					<Button
						onClick={handleCreate}
						disabled={loading}
						className='gap-2'
					>
						{loading ? 'Creating...' : 'Create Account'}
					</Button>
				</div>
			</div>
		</div>
	);
}
