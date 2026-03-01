'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ColumnMapping } from '@/server/modules/import/import.types';
import type { ParsedRow } from './ImportWizard';

interface MappingStepProps {
	headers: string[];
	previewRows: ParsedRow[];
	accounts: Array<{ id: string; name: string }>;
	categories: Array<{ id: string; name: string; type: string }>;
	onComplete: (
		mapping: ColumnMapping,
		accountId: string,
		type: 'INCOME' | 'EXPENSE',
		categoryId: string
	) => void;
	onBack: () => void;
}

const DATE_HINTS = ['date', 'transaction date', 'posted', 'posting date', 'time', 'timestamp'];
const AMOUNT_HINTS = ['amount', 'value', 'sum', 'total', 'debit', 'credit', 'price'];
const DESC_HINTS = ['description', 'desc', 'memo', 'narration', 'details', 'reference', 'note', 'particulars'];

function autoDetect(headers: string[], hints: string[]): string {
	const lower = headers.map((h) => h.toLowerCase().trim());
	for (const hint of hints) {
		const idx = lower.findIndex((h) => h === hint || h.includes(hint));
		if (idx >= 0) return headers[idx];
	}
	return '';
}

export function MappingStep({
	headers,
	previewRows,
	accounts,
	categories,
	onComplete,
	onBack,
}: MappingStepProps) {
	const [dateCol, setDateCol] = useState(() => autoDetect(headers, DATE_HINTS));
	const [amountCol, setAmountCol] = useState(() => autoDetect(headers, AMOUNT_HINTS));
	const [descCol, setDescCol] = useState(() => autoDetect(headers, DESC_HINTS));
	const [accountId, setAccountId] = useState('');
	const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
	const [categoryId, setCategoryId] = useState('');

	const filteredCategories = useMemo(
		() => categories.filter((c) => c.type === type),
		[categories, type]
	);

	const isValid = dateCol && amountCol && accountId && categoryId;

	function handleContinue() {
		if (!isValid) return;
		const mapping: ColumnMapping = {
			date: dateCol,
			amount: amountCol,
			description: descCol || undefined,
		};
		onComplete(mapping, accountId, type, categoryId);
	}

	return (
		<div className='space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle className='text-base'>Column Mapping</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<p className='text-sm text-muted-foreground'>
						Match your CSV columns to the fields below. We
						auto-detected what we could.
					</p>

					<div className='space-y-2'>
						<Label>
							Date Column <span className='text-destructive'>*</span>
						</Label>
						<Select value={dateCol} onValueChange={setDateCol}>
							<SelectTrigger>
								<SelectValue placeholder='Select date column' />
							</SelectTrigger>
							<SelectContent>
								{headers.map((h) => (
									<SelectItem key={h} value={h}>
										{h}
										{previewRows[0]?.[h] && (
											<span className='text-muted-foreground ml-2'>
												({previewRows[0][h]})
											</span>
										)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label>
							Amount Column <span className='text-destructive'>*</span>
						</Label>
						<Select value={amountCol} onValueChange={setAmountCol}>
							<SelectTrigger>
								<SelectValue placeholder='Select amount column' />
							</SelectTrigger>
							<SelectContent>
								{headers.map((h) => (
									<SelectItem key={h} value={h}>
										{h}
										{previewRows[0]?.[h] && (
											<span className='text-muted-foreground ml-2'>
												({previewRows[0][h]})
											</span>
										)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label>Description Column (optional)</Label>
						<Select value={descCol} onValueChange={setDescCol}>
							<SelectTrigger>
								<SelectValue placeholder='Select description column' />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='__none__'>None</SelectItem>
								{headers.map((h) => (
									<SelectItem key={h} value={h}>
										{h}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className='text-base'>Import Settings</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='space-y-2'>
						<Label>
							Account <span className='text-destructive'>*</span>
						</Label>
						<Select value={accountId} onValueChange={setAccountId}>
							<SelectTrigger>
								<SelectValue placeholder='Select account' />
							</SelectTrigger>
							<SelectContent>
								{accounts.map((a) => (
									<SelectItem key={a.id} value={a.id}>
										{a.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label>Default Transaction Type</Label>
						<Select
							value={type}
							onValueChange={(v) => {
								setType(v as 'INCOME' | 'EXPENSE');
								setCategoryId('');
							}}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='EXPENSE'>Expense</SelectItem>
								<SelectItem value='INCOME'>Income</SelectItem>
							</SelectContent>
						</Select>
						<p className='text-xs text-muted-foreground'>
							Negative amounts will automatically be marked as
							expenses regardless of this setting.
						</p>
					</div>

					<div className='space-y-2'>
						<Label>
							Default Category{' '}
							<span className='text-destructive'>*</span>
						</Label>
						<Select
							value={categoryId}
							onValueChange={setCategoryId}
						>
							<SelectTrigger>
								<SelectValue placeholder='Select category' />
							</SelectTrigger>
							<SelectContent>
								{filteredCategories.map((c) => (
									<SelectItem key={c.id} value={c.id}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<div className='flex gap-3'>
				<Button variant='outline' onClick={onBack}>
					Back
				</Button>
				<Button
					className='flex-1'
					disabled={!isValid}
					onClick={handleContinue}
				>
					Continue to Review
				</Button>
			</div>
		</div>
	);
}
