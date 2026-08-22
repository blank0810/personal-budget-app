'use client';

import { useRealtimeRun } from '@trigger.dev/react-hooks';
import { format } from 'date-fns';
import {
	CircleCheck,
	Download,
	Info,
	TriangleAlert,
} from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { ClientSelectCombobox } from '@/components/modules/client/ClientSelectCombobox';
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { resolveDatePreset, type DatePreset } from '@/lib/date-presets';
import type { ExportInvoicesInput } from '@/server/modules/invoice/invoice.types';
import type { invoiceExportTask } from '@/trigger/invoice-export';

interface InvoiceExportDialogProps {
	clients: { id: string; name: string }[];
}

type ExportFormat = 'CSV' | 'ZIP';
type PaymentFilter = ExportInvoicesInput['payment'];

interface TriggerProgress {
	done: number;
	total: number;
}

const ALL_CLIENTS_VALUE = '__all_clients__';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
	{ value: 'THIS_MONTH', label: 'This month' },
	{ value: 'LAST_MONTH', label: 'Last month' },
	{ value: 'LAST_2_MONTHS', label: 'Last 2 months' },
	{ value: 'LAST_3_MONTHS', label: 'Last 3 months' },
	{ value: 'THIS_QUARTER', label: 'This quarter' },
	{ value: 'THIS_YEAR', label: 'This year' },
];

const TERMINAL_RUN_STATUSES = new Set([
	'COMPLETED',
	'CANCELED',
	'FAILED',
	'CRASHED',
	'SYSTEM_FAILURE',
	'EXPIRED',
	'TIMED_OUT',
]);

function getRangeError(from: string, to: string): string | null {
	if (!from || !to) {
		return 'Choose both a start date and an end date.';
	}
	if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
		return 'Enter valid dates for the export range.';
	}
	if (to < from) {
		return 'End date must be on or after start date.';
	}

	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function getTriggerProgress(
	metadata: Record<string, unknown> | undefined
): TriggerProgress | null {
	const progress = metadata?.progress;
	if (!isRecord(progress)) return null;

	const { done, total } = progress;
	if (
		typeof done !== 'number' ||
		typeof total !== 'number' ||
		!Number.isFinite(done) ||
		!Number.isFinite(total) ||
		done < 0 ||
		total <= 0
	) {
		return null;
	}

	return { done, total };
}

function isArchiveOutput(
	output: unknown
): output is {
	url: string;
	filename: string;
	invoiceCount: number;
	byteLength: number;
} {
	return (
		isRecord(output) &&
		typeof output.url === 'string' &&
		typeof output.filename === 'string' &&
		typeof output.invoiceCount === 'number' &&
		typeof output.byteLength === 'number'
	);
}

function getCompletedInvoiceCount(output: unknown): number | null {
	return isRecord(output) && typeof output.invoiceCount === 'number'
		? output.invoiceCount
		: null;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;

	const units = ['KB', 'MB', 'GB'];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	return `${new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 1,
	}).format(value)} ${units[unitIndex]}`;
}

function isTerminalStatus(status: string | undefined): boolean {
	return status ? TERMINAL_RUN_STATUSES.has(status) : false;
}

function isFailedStatus(status: string | undefined): boolean {
	return status ? status !== 'COMPLETED' && isTerminalStatus(status) : false;
}

export function InvoiceExportDialog({
	clients,
}: InvoiceExportDialogProps) {
	const [open, setOpen] = useState(false);
	const [exportFormat, setExportFormat] = useState<ExportFormat>('CSV');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');
	const [selectedPreset, setSelectedPreset] = useState<DatePreset | null>(null);
	const [payment, setPayment] = useState<PaymentFilter>('ALL');
	const [includeDrafts, setIncludeDrafts] = useState(false);
	const [includeCancelled, setIncludeCancelled] = useState(true);
	const [clientId, setClientId] = useState(ALL_CLIENTS_VALUE);
	const [isStarting, setIsStarting] = useState(false);
	const [runId, setRunId] = useState<string>();
	const [publicAccessToken, setPublicAccessToken] = useState<string>();
	const [startError, setStartError] = useState<string | null>(null);
	const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
	const downloadedRunId = useRef<string | null>(null);

	const { run, error: realtimeError } = useRealtimeRun<
		typeof invoiceExportTask
	>(runId, {
		accessToken: publicAccessToken,
		enabled: Boolean(runId && publicAccessToken),
		id: `invoice-export-${runId ?? 'idle'}-${subscriptionAttempt}`,
	});

	const rangeError = getRangeError(fromDate, toDate);
	const isInFlight =
		isStarting || Boolean(runId && !isTerminalStatus(run?.status));
	const progress = getTriggerProgress(run?.metadata);
	const progressValue = progress
		? Math.min(100, (progress.done / progress.total) * 100)
		: undefined;
	const completedOutput = run?.status === 'COMPLETED' ? run.output : undefined;
	const archiveOutput = isArchiveOutput(completedOutput)
		? completedOutput
		: null;
	const completedInvoiceCount = getCompletedInvoiceCount(completedOutput);
	const taskFailed = isFailedStatus(run?.status);
	const completedOutputMissing =
		run?.status === 'COMPLETED' && completedInvoiceCount === null;
	const clientOptions = [
		{ id: ALL_CLIENTS_VALUE, name: 'All clients' },
		...clients,
	];

	const taskError = taskFailed
		? run?.error?.message ??
			(run?.status === 'CANCELED'
				? 'The export was canceled before it finished.'
				: 'The export stopped before it could create the ZIP file.')
		: null;
	const visibleError =
		taskError ??
		startError ??
		realtimeError?.message ??
		(completedOutputMissing
			? 'The export finished without a downloadable result. Try the export again.'
			: null);

	useEffect(() => {
		if (
			!run ||
			run.status !== 'COMPLETED' ||
			downloadedRunId.current === run.id
		) {
			return;
		}

		downloadedRunId.current = run.id;
		if (!isArchiveOutput(run.output)) return;

		const anchor = document.createElement('a');
		anchor.href = run.output.url;
		anchor.download = run.output.filename;
		anchor.rel = 'noopener';
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
	}, [run]);

	function resetZipRun() {
		setRunId(undefined);
		setPublicAccessToken(undefined);
		setStartError(null);
		setSubscriptionAttempt(0);
		downloadedRunId.current = null;
	}

	function applyPreset(preset: DatePreset) {
		const range = resolveDatePreset(preset, new Date());
		setFromDate(format(range.from, 'yyyy-MM-dd'));
		setToDate(format(range.to, 'yyyy-MM-dd'));
		setSelectedPreset(preset);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && isInFlight) return;
		if (nextOpen && !fromDate && !toDate) {
			applyPreset('THIS_MONTH');
		}
		if (!nextOpen) {
			resetZipRun();
		}
		setOpen(nextOpen);
	}

	function handleFormatChange(value: string) {
		resetZipRun();
		setExportFormat(value as ExportFormat);
	}

	async function startZipExport() {
		if (rangeError || isStarting) return;

		setIsStarting(true);
		resetZipRun();

		try {
			const response = await fetch('/api/invoices/export/zip', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					from: fromDate,
					to: toDate,
					payment,
					includeDrafts,
					includeCancelled,
					...(clientId !== ALL_CLIENTS_VALUE && { clientId }),
				}),
			});
			const responseBody: unknown = await response
				.json()
				.catch(() => null);

			if (!response.ok) {
				throw new Error(
					isRecord(responseBody) && typeof responseBody.error === 'string'
						? responseBody.error
						: 'The ZIP export could not be started. Try again.'
				);
			}

			if (
				!isRecord(responseBody) ||
				typeof responseBody.runId !== 'string' ||
				typeof responseBody.publicAccessToken !== 'string'
			) {
				throw new Error(
					'The ZIP export started without a valid progress token. Try again.'
				);
			}

			setRunId(responseBody.runId);
			setPublicAccessToken(responseBody.publicAccessToken);
		} catch (error) {
			setStartError(
				error instanceof Error
					? error.message
					: 'The ZIP export could not be started. Try again.'
			);
		} finally {
			setIsStarting(false);
		}
	}

	function handleExport(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (rangeError || isInFlight) return;

		if (exportFormat === 'ZIP') {
			void startZipExport();
			return;
		}

		const params = new URLSearchParams({
			from: fromDate,
			to: toDate,
			payment,
			includeDrafts: String(includeDrafts),
			includeCancelled: String(includeCancelled),
		});
		if (clientId !== ALL_CLIENTS_VALUE) {
			params.set('clientId', clientId);
		}

		window.location.href = `/api/invoices/export?${params.toString()}`;
		setOpen(false);
	}

	const progressText = progress
		? progress.done >= progress.total
			? `Rendered ${progress.total} of ${progress.total}. Finalizing ZIP…`
			: `Rendering ${progress.done} of ${progress.total}…`
		: isStarting
			? 'Starting background export…'
			: 'Preparing invoice PDFs…';

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button type='button' variant='outline'>
					<Download aria-hidden='true' />
					Export
				</Button>
			</DialogTrigger>
			<DialogContent
				className='max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl'
				showCloseButton={!isInFlight}
			>
				<DialogHeader>
					<DialogTitle>Export invoices</DialogTitle>
					<DialogDescription>
						{exportFormat === 'CSV'
							? 'Download invoice records as a spreadsheet-ready CSV file.'
							: 'Create a ZIP with each invoice PDF and the same spreadsheet-ready CSV.'}
					</DialogDescription>
				</DialogHeader>

				<form
					className='space-y-5'
					onSubmit={handleExport}
					aria-busy={isInFlight}
				>
					<section className='space-y-3' aria-labelledby='export-format-label'>
						<p id='export-format-label' className='text-sm font-medium'>
							Format
						</p>
						<Tabs
							value={exportFormat}
							onValueChange={handleFormatChange}
							aria-labelledby='export-format-label'
						>
							<TabsList className='grid w-full grid-cols-2'>
								<TabsTrigger value='CSV' disabled={isInFlight}>
									CSV
								</TabsTrigger>
								<TabsTrigger value='ZIP' disabled={isInFlight}>
									ZIP (PDFs + CSV)
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</section>

					<section className='space-y-3' aria-labelledby='export-range-label'>
						<div className='space-y-1'>
							<p id='export-range-label' className='text-sm font-medium'>
								Issue date range
							</p>
							<p className='text-xs text-muted-foreground'>
								Preset ranges fill the dates below. You can edit either date.
							</p>
						</div>
						<div className='flex flex-wrap gap-2'>
							{DATE_PRESETS.map((preset) => (
								<Button
									key={preset.value}
									type='button'
									variant={
										selectedPreset === preset.value
											? 'secondary'
											: 'outline'
									}
									size='sm'
									aria-pressed={selectedPreset === preset.value}
									onClick={() => applyPreset(preset.value)}
									disabled={isInFlight}
								>
									{preset.label}
								</Button>
							))}
						</div>

						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='space-y-2'>
								<Label htmlFor='invoice-export-from'>From</Label>
								<Input
									id='invoice-export-from'
									type='date'
									value={fromDate}
									max={toDate || undefined}
									onChange={(event) => {
										setFromDate(event.target.value);
										setSelectedPreset(null);
									}}
									aria-invalid={Boolean(rangeError)}
									aria-describedby={
										rangeError ? 'invoice-export-range-error' : undefined
									}
									disabled={isInFlight}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='invoice-export-to'>To</Label>
								<Input
									id='invoice-export-to'
									type='date'
									value={toDate}
									min={fromDate || undefined}
									onChange={(event) => {
										setToDate(event.target.value);
										setSelectedPreset(null);
									}}
									aria-invalid={Boolean(rangeError)}
									aria-describedby={
										rangeError ? 'invoice-export-range-error' : undefined
									}
									disabled={isInFlight}
									required
								/>
							</div>
						</div>
						{rangeError && (
							<p
								id='invoice-export-range-error'
								className='text-sm text-destructive'
								role='alert'
							>
								{rangeError}
							</p>
						)}
					</section>

					<section className='space-y-3' aria-labelledby='payment-filter-label'>
						<p id='payment-filter-label' className='text-sm font-medium'>
							Payment status
						</p>
						<Tabs
							value={payment}
							onValueChange={(value) => setPayment(value as PaymentFilter)}
							aria-labelledby='payment-filter-label'
						>
							<TabsList className='grid w-full grid-cols-3'>
								<TabsTrigger value='ALL' disabled={isInFlight}>
									All
								</TabsTrigger>
								<TabsTrigger value='PAID' disabled={isInFlight}>
									Paid
								</TabsTrigger>
								<TabsTrigger value='UNPAID' disabled={isInFlight}>
									Unpaid
								</TabsTrigger>
							</TabsList>
						</Tabs>
						{payment === 'UNPAID' && (
							<div
								className='flex items-start gap-2 text-xs text-muted-foreground'
								role='note'
							>
								<Info
									className='mt-0.5 size-3.5 shrink-0'
									aria-hidden='true'
								/>
								<p>
									This is an outstanding-receivables list, not income. The
									 Paid Date column will be empty.
								</p>
							</div>
						)}
					</section>

					<fieldset className='space-y-3' disabled={isInFlight}>
						<legend className='text-sm font-medium'>Additional statuses</legend>
						<div className='grid gap-3 sm:grid-cols-2'>
							<div className='flex items-center gap-2'>
								<Checkbox
									id='invoice-export-drafts'
									checked={includeDrafts}
									onCheckedChange={(checked) =>
										setIncludeDrafts(checked === true)
									}
								/>
								<Label
									htmlFor='invoice-export-drafts'
									className='cursor-pointer font-normal'
								>
									Include drafts
								</Label>
							</div>
							<div className='flex items-center gap-2'>
								<Checkbox
									id='invoice-export-cancelled'
									checked={includeCancelled}
									onCheckedChange={(checked) =>
										setIncludeCancelled(checked === true)
									}
								/>
								<Label
									htmlFor='invoice-export-cancelled'
									className='cursor-pointer font-normal'
								>
									Include cancelled
								</Label>
							</div>
						</div>
					</fieldset>

					<div className='space-y-2'>
						<Label htmlFor='invoice-export-client'>Client</Label>
						<ClientSelectCombobox
							id='invoice-export-client'
							clients={clientOptions}
							value={clientId}
							onChange={setClientId}
							placeholder='All clients'
							disabled={isInFlight}
						/>
					</div>

					{exportFormat === 'ZIP' && isInFlight && !realtimeError && (
						<div
							className='space-y-2 border-y py-4'
							aria-live='polite'
						>
							<div className='flex min-w-0 items-center justify-between gap-3'>
								<p className='min-w-0 text-sm font-medium'>{progressText}</p>
								{progress && (
									<span className='shrink-0 font-mono text-xs tabular-nums text-muted-foreground'>
										{Math.round(progressValue ?? 0)}%
									</span>
								)}
							</div>
							<div className='relative'>
								<Progress
									value={progressValue}
									aria-label='Invoice export progress'
									aria-valuetext={progressText}
								/>
								{!progress && (
									<div
										className='absolute inset-y-0 start-0 w-1/3 animate-pulse rounded-full bg-primary'
										aria-hidden='true'
									/>
								)}
							</div>
						</div>
					)}

					{exportFormat === 'ZIP' &&
						run?.status === 'COMPLETED' &&
						completedInvoiceCount !== null && (
							<Alert role='status'>
								<CircleCheck aria-hidden='true' />
								<AlertTitle>
									{archiveOutput ? 'ZIP export ready' : 'No invoices to export'}
								</AlertTitle>
								<AlertDescription>
									{archiveOutput ? (
										<>
											<p>
												{archiveOutput.invoiceCount}{' '}
												{archiveOutput.invoiceCount === 1
													? 'invoice'
													: 'invoices'}{' '}
												· {formatFileSize(archiveOutput.byteLength)}. Your
												 download has started.
											</p>
											<Button
												asChild
												variant='outline'
												size='sm'
												className='mt-3'
											>
												<a
													href={archiveOutput.url}
													download={archiveOutput.filename}
												>
													<Download aria-hidden='true' />
													Download again
												</a>
											</Button>
										</>
									) : (
										<p>
											0 invoices matched these filters, so no ZIP was created.
										</p>
									)}
								</AlertDescription>
							</Alert>
						)}

					{exportFormat === 'ZIP' && visibleError && (
						<Alert variant='destructive'>
							<TriangleAlert aria-hidden='true' />
							<AlertTitle>
								{realtimeError && !taskFailed
									? 'Progress connection lost'
									: run?.status === 'CANCELED'
										? 'ZIP export canceled'
										: 'ZIP export failed'}
							</AlertTitle>
							<AlertDescription className='min-w-0'>
								<p className='break-words'>{visibleError}</p>
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='mt-3 text-foreground'
									onClick={() => {
										if (realtimeError && !taskFailed) {
											setSubscriptionAttempt((attempt) => attempt + 1);
										} else {
											void startZipExport();
										}
									}}
								>
									{realtimeError && !taskFailed ? 'Reconnect' : 'Try again'}
								</Button>
							</AlertDescription>
						</Alert>
					)}

					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => handleOpenChange(false)}
							disabled={isInFlight}
						>
							Cancel
						</Button>
						<Button
							type='submit'
							disabled={Boolean(rangeError) || isInFlight}
						>
							<Download aria-hidden='true' />
							{isInFlight
								? 'Exporting…'
								: exportFormat === 'CSV'
									? 'Export CSV'
									: 'Create ZIP'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
