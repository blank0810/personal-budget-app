'use client';

import { useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { updateScheduleAction } from '@/server/modules/automation/automation.controller';
import type {
	AutomationFrequencyValue,
	AutomationScheduleDto,
	UpdateAutomationScheduleInput,
} from '@/server/modules/automation/automation.types';

const FREQUENCIES: Array<{
	value: AutomationFrequencyValue;
	label: string;
}> = [
	{ value: 'HOURLY', label: 'Hourly' },
	{ value: 'DAILY', label: 'Daily' },
	{ value: 'WEEKLY', label: 'Weekly' },
	{ value: 'MONTHLY', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
];

type ScheduleDraft = Pick<
	AutomationScheduleDto,
	| 'frequency'
	| 'atMinute'
	| 'atHour'
	| 'dayOfWeek'
	| 'dayOfMonth'
	| 'enabled'
>;

function toDraft(schedule: AutomationScheduleDto): ScheduleDraft {
	return {
		frequency: schedule.frequency,
		atMinute: schedule.atMinute,
		atHour: schedule.atHour,
		dayOfWeek: schedule.dayOfWeek,
		dayOfMonth: schedule.dayOfMonth,
		enabled: schedule.enabled,
	};
}

function buildPayload(draft: ScheduleDraft): UpdateAutomationScheduleInput {
	return {
		frequency: draft.frequency,
		atMinute: draft.atMinute ?? 0,
		atHour: draft.frequency === 'HOURLY' ? null : (draft.atHour ?? 0),
		dayOfWeek:
			draft.frequency === 'WEEKLY' ? (draft.dayOfWeek ?? 0) : null,
		dayOfMonth:
			draft.frequency === 'MONTHLY' ? (draft.dayOfMonth ?? 1) : null,
		enabled: draft.enabled,
	};
}

function formatRunDate(value: string | null, emptyLabel: string) {
	if (!value) return emptyLabel;
	const date = new Date(value);
	return (
		<span title={date.toLocaleString()}>
			{formatDistanceToNow(date, { addSuffix: true })}
		</span>
	);
}

function statusBadge(status: string | null, enabled: boolean) {
	if (!enabled) {
		return <Badge variant='secondary'>Paused</Badge>;
	}

	const label = status
		? status.charAt(0).toUpperCase() + status.slice(1)
		: 'Never run';
	const variant =
		status === 'failed'
			? 'destructive'
			: status === 'success'
				? 'default'
				: 'secondary';

	return <Badge variant={variant}>{label}</Badge>;
}

interface AutomationsTableProps {
	initialSchedules: AutomationScheduleDto[];
}

export function AutomationsTable({
	initialSchedules,
}: AutomationsTableProps) {
	const [schedules, setSchedules] = useState(initialSchedules);
	const [drafts, setDrafts] = useState<Record<string, ScheduleDraft>>(() =>
		Object.fromEntries(
			initialSchedules.map((schedule) => [schedule.id, toDraft(schedule)])
		)
	);
	const [savingId, setSavingId] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function updateDraft(id: string, changes: Partial<ScheduleDraft>) {
		setDrafts((current) => ({
			...current,
			[id]: { ...current[id], ...changes },
		}));
	}

	function handleSave(schedule: AutomationScheduleDto) {
		const draft = drafts[schedule.id];
		if (!draft) return;

		setSavingId(schedule.id);
		startTransition(async () => {
			const result = await updateScheduleAction(
				schedule.id,
				buildPayload(draft)
			);
			setSavingId(null);

			if ('error' in result) {
				toast.error(result.error);
				return;
			}

			const updated = result.data.schedule;
			setSchedules((current) =>
				current.map((item) =>
					item.id === updated.id ? updated : item
				)
			);
			setDrafts((current) => ({
				...current,
				[updated.id]: toDraft(updated),
			}));
			toast.success(`${updated.label} schedule updated`);
		});
	}

	function isDirty(schedule: AutomationScheduleDto) {
		const draft = drafts[schedule.id];
		if (!draft) return false;
		return JSON.stringify(buildPayload(draft)) !== JSON.stringify(
			buildPayload(toDraft(schedule))
		);
	}

	return (
		<div className='overflow-x-auto rounded border'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Automation</TableHead>
						<TableHead className='min-w-[430px]'>Cadence</TableHead>
						<TableHead>Enabled</TableHead>
						<TableHead>Last run</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Next run</TableHead>
						<TableHead className='text-right'>Action</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{schedules.map((schedule) => {
						const draft = drafts[schedule.id] ?? toDraft(schedule);
						const isSaving = savingId === schedule.id;

						return (
							<TableRow key={schedule.id}>
								<TableCell>
									<div className='font-medium whitespace-nowrap'>
										{schedule.label}
									</div>
									<div className='font-mono text-xs text-muted-foreground whitespace-nowrap'>
										{schedule.jobKey}
									</div>
								</TableCell>
								<TableCell>
									<div className='flex items-end gap-2 flex-wrap'>
										<label className='space-y-1'>
											<span className='block text-xs text-muted-foreground'>
												Frequency
											</span>
											<Select
												value={draft.frequency}
												onValueChange={(value) =>
													updateDraft(schedule.id, {
														frequency:
															value as AutomationFrequencyValue,
													})
												}
												disabled={isSaving}
											>
												<SelectTrigger size='sm' className='w-28'>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{FREQUENCIES.map((frequency) => (
														<SelectItem
															key={frequency.value}
															value={frequency.value}
														>
															{frequency.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</label>

										{draft.frequency === 'WEEKLY' && (
											<label className='space-y-1'>
												<span className='block text-xs text-muted-foreground'>
													Day
												</span>
												<Select
													value={String(draft.dayOfWeek ?? 0)}
													onValueChange={(value) =>
														updateDraft(schedule.id, {
															dayOfWeek: Number(value),
														})
													}
													disabled={isSaving}
												>
													<SelectTrigger size='sm' className='w-32'>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{DAYS_OF_WEEK.map((day, index) => (
															<SelectItem key={day} value={String(index)}>
																{day}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</label>
										)}

										{draft.frequency === 'MONTHLY' && (
											<label className='space-y-1'>
												<span className='block text-xs text-muted-foreground'>
													Day
												</span>
												<Input
													type='number'
													min={1}
													max={31}
													value={draft.dayOfMonth ?? 1}
													onChange={(event) =>
														updateDraft(schedule.id, {
															dayOfMonth:
																event.target.value === ''
																	? null
																	: Number(event.target.value),
														})
													}
													disabled={isSaving}
													className='h-8 w-20'
													aria-label='Day of month'
												/>
											</label>
										)}

										{draft.frequency !== 'HOURLY' && (
											<label className='space-y-1'>
												<span className='block text-xs text-muted-foreground'>
													Hour
												</span>
												<Input
													type='number'
													min={0}
													max={23}
													value={draft.atHour ?? 0}
													onChange={(event) =>
														updateDraft(schedule.id, {
															atHour:
																event.target.value === ''
																	? null
																	: Number(event.target.value),
														})
													}
													disabled={isSaving}
													className='h-8 w-20'
													aria-label='Hour'
												/>
											</label>
										)}

										<label className='space-y-1'>
											<span className='block text-xs text-muted-foreground'>
												Minute
											</span>
											<Input
												type='number'
												min={0}
												max={59}
												value={draft.atMinute ?? 0}
												onChange={(event) =>
													updateDraft(schedule.id, {
														atMinute:
															event.target.value === ''
																? null
																: Number(event.target.value),
													})
												}
												disabled={isSaving}
												className='h-8 w-20'
												aria-label='Minute'
											/>
										</label>
									</div>
								</TableCell>
								<TableCell>
									<Switch
										checked={draft.enabled}
										onCheckedChange={(enabled) =>
											updateDraft(schedule.id, { enabled })
										}
										disabled={isSaving}
										aria-label={`${schedule.label} enabled`}
									/>
								</TableCell>
								<TableCell className='text-sm whitespace-nowrap'>
									{formatRunDate(schedule.lastRunAt, 'Never')}
								</TableCell>
								<TableCell>
									{statusBadge(schedule.lastStatus, schedule.enabled)}
								</TableCell>
								<TableCell className='text-sm whitespace-nowrap'>
									{formatRunDate(schedule.nextRunAt, 'Due next tick')}
								</TableCell>
								<TableCell className='text-right'>
									<Button
										variant='outline'
										size='sm'
										onClick={() => handleSave(schedule)}
										disabled={
											isSaving ||
											isPending ||
											!isDirty(schedule)
										}
									>
										{isSaving ? (
											<Loader2 className='animate-spin' />
										) : (
											<Save />
										)}
										Save
									</Button>
								</TableCell>
							</TableRow>
						);
					})}

					{schedules.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={7}
								className='py-8 text-center text-muted-foreground'
							>
								No automation schedules configured
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
