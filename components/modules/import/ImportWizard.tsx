'use client';

import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { UploadStep } from './UploadStep';
import { MappingStep } from './MappingStep';
import { ReviewStep } from './ReviewStep';
import type { ColumnMapping } from '@/server/modules/import/import.types';

const STEPS = ['Upload', 'Map Columns', 'Review & Import'];

export interface ParsedRow {
	[key: string]: string;
}

export interface MappedTransaction {
	date: Date;
	amount: number;
	description: string;
	type: 'INCOME' | 'EXPENSE';
	categoryId: string;
	accountId: string;
}

interface ImportWizardProps {
	accounts: Array<{ id: string; name: string }>;
	categories: Array<{ id: string; name: string; type: string }>;
}

export function ImportWizard({ accounts, categories }: ImportWizardProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
	const [csvRows, setCsvRows] = useState<ParsedRow[]>([]);
	const [mapping, setMapping] = useState<ColumnMapping | null>(null);
	const [accountId, setAccountId] = useState('');
	const [defaultType, setDefaultType] = useState<'INCOME' | 'EXPENSE'>(
		'EXPENSE'
	);
	const [defaultCategoryId, setDefaultCategoryId] = useState('');
	const [transactions, setTransactions] = useState<MappedTransaction[]>([]);

	const progress = ((currentStep + 1) / STEPS.length) * 100;

	function handleUploadComplete(headers: string[], rows: ParsedRow[]) {
		setCsvHeaders(headers);
		setCsvRows(rows);
		setCurrentStep(1);
	}

	function handleMappingComplete(
		m: ColumnMapping,
		acctId: string,
		type: 'INCOME' | 'EXPENSE',
		catId: string
	) {
		setMapping(m);
		setAccountId(acctId);
		setDefaultType(type);
		setDefaultCategoryId(catId);

		// Transform CSV rows into transactions
		const mapped: MappedTransaction[] = csvRows
			.map((row) => {
				const rawDate = row[m.date];
				const rawAmount = row[m.amount];
				const description = m.description ? row[m.description] || '' : '';

				const date = new Date(rawDate);
				const amount = Math.abs(parseFloat(rawAmount?.replace(/[^0-9.-]/g, '') || '0'));

				if (isNaN(date.getTime()) || isNaN(amount) || amount === 0) {
					return null;
				}

				// Auto-detect type from sign if amount column has negatives
				const rawNum = parseFloat(rawAmount?.replace(/[^0-9.-]/g, '') || '0');
				let txType = type;
				if (rawNum < 0) {
					txType = 'EXPENSE';
				} else if (rawNum > 0 && type === 'EXPENSE') {
					// Keep user's choice if positive and they chose EXPENSE
					txType = type;
				}

				return {
					date,
					amount,
					description,
					type: txType,
					categoryId: catId,
					accountId: acctId,
				};
			})
			.filter((t): t is MappedTransaction => t !== null);

		setTransactions(mapped);
		setCurrentStep(2);
	}

	function handleReset() {
		setCurrentStep(0);
		setCsvHeaders([]);
		setCsvRows([]);
		setMapping(null);
		setAccountId('');
		setTransactions([]);
	}

	return (
		<div className='w-full space-y-6'>
			<div className='space-y-2'>
				<div className='flex justify-between text-sm text-muted-foreground'>
					<span>
						Step {currentStep + 1} of {STEPS.length}
					</span>
					<span>{STEPS[currentStep]}</span>
				</div>
				<Progress value={progress} className='h-2' />
			</div>

			{currentStep === 0 && (
				<UploadStep onComplete={handleUploadComplete} />
			)}
			{currentStep === 1 && (
				<MappingStep
					headers={csvHeaders}
					previewRows={csvRows.slice(0, 3)}
					accounts={accounts}
					categories={categories}
					onComplete={handleMappingComplete}
					onBack={() => setCurrentStep(0)}
				/>
			)}
			{currentStep === 2 && (
				<ReviewStep
					transactions={transactions}
					accountId={accountId}
					categories={categories}
					onBack={() => setCurrentStep(1)}
					onReset={handleReset}
				/>
			)}
		</div>
	);
}
