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
import { createGoalAction } from '@/server/modules/goal/goal.controller';
import { toast } from 'sonner';
import { Loader2, Shield, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const ICONS = [
	{ value: 'target', label: 'Target' },
	{ value: 'star', label: 'Star' },
	{ value: 'flame', label: 'Flame' },
	{ value: 'heart', label: 'Heart' },
	{ value: 'gift', label: 'Gift' },
	{ value: 'home', label: 'Home' },
	{ value: 'car', label: 'Car' },
	{ value: 'graduation', label: 'Education' },
	{ value: 'plane', label: 'Travel' },
	{ value: 'piggybank', label: 'Savings' },
	{ value: 'shield', label: 'Shield' },
];

const COLORS = [
	{ value: 'blue', label: 'Blue' },
	{ value: 'green', label: 'Green' },
	{ value: 'purple', label: 'Purple' },
	{ value: 'orange', label: 'Orange' },
	{ value: 'red', label: 'Red' },
	{ value: 'pink', label: 'Pink' },
];

/** Auto-derive health thresholds from a single target months value */
function deriveThresholds(targetMonths: number) {
	return {
		low: Math.max(1, Math.round(targetMonths * 0.33)),
		mid: Math.max(2, Math.round(targetMonths * 0.67)),
		high: targetMonths,
	};
}

interface GoalFormProps {
	accounts: Array<{ id: string; name: string }>;
	hasEmergencyFund?: boolean;
	onSuccess?: () => void;
}

export function GoalForm({ accounts, hasEmergencyFund = false, onSuccess }: GoalFormProps) {
	const [loading, setLoading] = useState(false);
	const [amount, setAmount] = useState<number | undefined>(undefined);
	const [goalType, setGoalType] = useState<'FIXED_AMOUNT' | 'MONTHS_COVERAGE'>('FIXED_AMOUNT');
	const [isEmergencyFund, setIsEmergencyFund] = useState(false);
	const [targetMonths, setTargetMonths] = useState(6);

	const thresholds = deriveThresholds(targetMonths);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);

		const form = e.currentTarget;
		const formData = new FormData(form);
		formData.set('targetAmount', String(amount ?? 0));
		formData.set('goalType', goalType);
		formData.set('isEmergencyFund', String(isEmergencyFund));

		if (goalType === 'MONTHS_COVERAGE') {
			formData.set('thresholdLow', String(thresholds.low));
			formData.set('thresholdMid', String(thresholds.mid));
			formData.set('thresholdHigh', String(thresholds.high));
		}

		const result = await createGoalAction(formData);
		setLoading(false);

		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Goal created');
			form.reset();
			setAmount(undefined);
			setGoalType('FIXED_AMOUNT');
			setIsEmergencyFund(false);
			setTargetMonths(6);
			onSuccess?.();
		}
	}

	return (
		<form onSubmit={handleSubmit} className='space-y-4'>
			<div className='space-y-2'>
				<Label htmlFor='name'>Goal Name</Label>
				<Input
					id='name'
					name='name'
					placeholder='e.g. Emergency Fund, New Laptop'
					required
				/>
			</div>

			{/* Goal Type Selector */}
			<div className='space-y-2'>
				<Label>Goal Type</Label>
				<div className='grid grid-cols-2 gap-2'>
					<button
						type='button'
						onClick={() => {
							setGoalType('FIXED_AMOUNT');
							setIsEmergencyFund(false);
						}}
						className={`rounded-lg border p-3 text-left text-sm transition-all ${
							goalType === 'FIXED_AMOUNT'
								? 'border-primary bg-primary/5 ring-1 ring-primary'
								: 'border-border hover:border-muted-foreground/30'
						}`}
					>
						<p className='font-medium'>Fixed Amount</p>
						<p className='text-xs text-muted-foreground mt-0.5'>
							Save toward a specific target
						</p>
					</button>
					<button
						type='button'
						onClick={() => {
							setGoalType('MONTHS_COVERAGE');
							if (!hasEmergencyFund) {
								setIsEmergencyFund(true);
							}
						}}
						className={`rounded-lg border p-3 text-left text-sm transition-all ${
							goalType === 'MONTHS_COVERAGE'
								? 'border-primary bg-primary/5 ring-1 ring-primary'
								: 'border-border hover:border-muted-foreground/30'
						}`}
					>
						<p className='font-medium'>Months of Coverage</p>
						<p className='text-xs text-muted-foreground mt-0.5'>
							Track months of expenses covered
						</p>
					</button>
				</div>
			</div>

			{/* Fixed Amount: Target Amount */}
			{goalType === 'FIXED_AMOUNT' && (
				<div className='space-y-2'>
					<Label htmlFor='targetAmount'>Target Amount</Label>
					<CurrencyInput
						id='targetAmount'
						value={amount}
						onChange={setAmount}
					/>
				</div>
			)}

			{/* Months Coverage: Target + Auto-derived thresholds */}
			{goalType === 'MONTHS_COVERAGE' && (
				<>
					<div className='rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-3 flex gap-2 text-sm'>
						<Info className='h-4 w-4 text-blue-600 mt-0.5 shrink-0' />
						<p className='text-muted-foreground'>
							This goal tracks how many months of expenses your linked account can cover. A linked account is required.
						</p>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='targetMonths'>Target Months</Label>
						<Input
							id='targetMonths'
							type='number'
							min={2}
							max={24}
							value={targetMonths}
							onChange={(e) => setTargetMonths(Math.max(2, Number(e.target.value)))}
						/>
						<div className='flex gap-3 text-xs text-muted-foreground'>
							<span className='flex items-center gap-1'>
								<span className='inline-block h-1.5 w-1.5 rounded-full bg-red-500' />
								Critical &lt; {thresholds.low}mo
							</span>
							<span className='flex items-center gap-1'>
								<span className='inline-block h-1.5 w-1.5 rounded-full bg-yellow-500' />
								Underfunded &lt; {thresholds.mid}mo
							</span>
							<span className='flex items-center gap-1'>
								<span className='inline-block h-1.5 w-1.5 rounded-full bg-green-500' />
								Funded &ge; {thresholds.high}mo
							</span>
						</div>
					</div>

					{/* Emergency Fund Checkbox */}
					<div className='flex items-start space-x-3 rounded-md border p-3'>
						<Checkbox
							id='isEmergencyFund'
							checked={isEmergencyFund}
							onCheckedChange={(checked) =>
								setIsEmergencyFund(checked === true)
							}
							disabled={hasEmergencyFund}
						/>
						<div className='space-y-1 leading-none'>
							<label
								htmlFor='isEmergencyFund'
								className='text-sm font-medium flex items-center gap-1.5 cursor-pointer'
							>
								<Shield className='h-3.5 w-3.5 text-blue-600' />
								Mark as Emergency Fund
							</label>
							<p className='text-xs text-muted-foreground'>
								{hasEmergencyFund
									? 'You already have an Emergency Fund goal.'
									: 'Enables auto-contribution from income and dashboard health tracking.'}
							</p>
						</div>
					</div>
				</>
			)}

			{/* Deadline (Fixed Amount only) */}
			{goalType === 'FIXED_AMOUNT' && (
				<div className='space-y-2'>
					<Label htmlFor='deadline'>Deadline (optional)</Label>
					<Input id='deadline' name='deadline' type='date' />
				</div>
			)}

			<div className='grid grid-cols-2 gap-4'>
				<div className='space-y-2'>
					<Label>Icon</Label>
					<Select name='icon' defaultValue='target'>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{ICONS.map((i) => (
								<SelectItem key={i.value} value={i.value}>
									{i.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className='space-y-2'>
					<Label>Color</Label>
					<Select name='color' defaultValue='blue'>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{COLORS.map((c) => (
								<SelectItem key={c.value} value={c.value}>
									{c.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className='space-y-2'>
				<Label>
					Linked Account{goalType === 'MONTHS_COVERAGE' ? ' (required)' : ' (optional)'}
				</Label>
				<Select name='linkedAccountId' required={goalType === 'MONTHS_COVERAGE'}>
					<SelectTrigger>
						<SelectValue placeholder='No account linked' />
					</SelectTrigger>
					<SelectContent>
						{goalType === 'FIXED_AMOUNT' && (
							<SelectItem value='__none__'>
								No account linked
							</SelectItem>
						)}
						{accounts.map((a) => (
							<SelectItem key={a.id} value={a.id}>
								{a.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<p className='text-xs text-muted-foreground'>
					{goalType === 'MONTHS_COVERAGE'
						? 'Required — months of coverage is calculated from this account\'s balance.'
						: 'Linked goals track progress automatically from account balance changes.'}
				</p>
			</div>

			<Button type='submit' className='w-full' disabled={loading}>
				{loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
				Create Goal
			</Button>
		</form>
	);
}
