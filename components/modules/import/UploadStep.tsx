'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, X } from 'lucide-react';
import Papa from 'papaparse';
import type { ParsedRow } from './ImportWizard';

interface UploadStepProps {
	onComplete: (headers: string[], rows: ParsedRow[]) => void;
}

export function UploadStep({ onComplete }: UploadStepProps) {
	const [error, setError] = useState('');
	const [fileName, setFileName] = useState('');
	const [preview, setPreview] = useState<{
		headers: string[];
		rows: ParsedRow[];
	} | null>(null);
	const [dragActive, setDragActive] = useState(false);

	const processFile = useCallback((file: File) => {
		setError('');

		if (!file.name.endsWith('.csv')) {
			setError('Please upload a CSV file');
			return;
		}

		if (file.size > 10 * 1024 * 1024) {
			setError('File too large. Maximum 10MB.');
			return;
		}

		setFileName(file.name);

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				if (results.errors.length > 0) {
					setError(
						`CSV parsing error: ${results.errors[0].message}`
					);
					return;
				}

				const rows = results.data as ParsedRow[];
				if (rows.length === 0) {
					setError('CSV file is empty');
					return;
				}

				if (rows.length > 5000) {
					setError(
						`Too many rows (${rows.length}). Maximum 5,000 transactions per import.`
					);
					return;
				}

				const headers = results.meta.fields || [];
				if (headers.length === 0) {
					setError('No columns found in CSV');
					return;
				}

				setPreview({ headers, rows });
			},
			error: (err) => {
				setError(`Failed to read file: ${err.message}`);
			},
		});
	}, []);

	function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) processFile(file);
	}

	function handleDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragActive(false);
		const file = e.dataTransfer.files?.[0];
		if (file) processFile(file);
	}

	function handleClear() {
		setPreview(null);
		setFileName('');
		setError('');
	}

	return (
		<div className='space-y-4'>
			{!preview ? (
				<Card
					className={`border-2 border-dashed transition-colors ${
						dragActive
							? 'border-primary bg-primary/5'
							: 'border-muted-foreground/25'
					}`}
					onDragOver={(e) => {
						e.preventDefault();
						setDragActive(true);
					}}
					onDragLeave={() => setDragActive(false)}
					onDrop={handleDrop}
				>
					<CardContent className='flex flex-col items-center justify-center py-12 text-center'>
						<Upload className='h-10 w-10 text-muted-foreground mb-4' />
						<p className='text-sm text-muted-foreground mb-2'>
							Drag & drop your CSV file here, or click to browse
						</p>
						<label>
							<input
								type='file'
								accept='.csv'
								className='hidden'
								onChange={handleFileInput}
							/>
							<Button variant='outline' asChild>
								<span>Choose File</span>
							</Button>
						</label>
						<p className='text-xs text-muted-foreground mt-3'>
							CSV files up to 10MB, max 5,000 rows
						</p>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className='pt-6 space-y-4'>
						<div className='flex items-center justify-between'>
							<div className='flex items-center gap-2'>
								<FileText className='h-5 w-5 text-muted-foreground' />
								<span className='font-medium text-sm'>
									{fileName}
								</span>
								<span className='text-xs text-muted-foreground'>
									({preview.rows.length} rows,{' '}
									{preview.headers.length} columns)
								</span>
							</div>
							<Button
								variant='ghost'
								size='icon'
								onClick={handleClear}
							>
								<X className='h-4 w-4' />
							</Button>
						</div>

						<div className='overflow-x-auto rounded border'>
							<table className='w-full text-xs'>
								<thead>
									<tr className='bg-muted'>
										{preview.headers.map((h) => (
											<th
												key={h}
												className='px-3 py-2 text-left font-medium'
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{preview.rows.slice(0, 5).map((row, i) => (
										<tr
											key={i}
											className='border-t'
										>
											{preview.headers.map((h) => (
												<td
													key={h}
													className='px-3 py-1.5 truncate max-w-[200px]'
												>
													{row[h]}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{preview.rows.length > 5 && (
							<p className='text-xs text-muted-foreground text-center'>
								Showing 5 of {preview.rows.length} rows
							</p>
						)}

						<Button
							className='w-full'
							onClick={() =>
								onComplete(preview.headers, preview.rows)
							}
						>
							Continue to Column Mapping
						</Button>
					</CardContent>
				</Card>
			)}

			{error && (
				<p className='text-sm text-destructive text-center'>{error}</p>
			)}
		</div>
	);
}
