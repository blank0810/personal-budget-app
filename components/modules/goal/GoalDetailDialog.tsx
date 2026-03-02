'use client';

import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
	archiveGoalAction,
	completeGoalAction,
	deleteGoalAction,
} from '@/server/modules/goal/goal.controller';
import { useCurrency } from '@/lib/contexts/currency-context';
import { toast } from 'sonner';
import {
	Archive,
	CheckCircle2,
	Plus,
	Trash2,
	Shield,
} from 'lucide-react';
import { AddContributionDialog } from './AddContributionDialog';
import type { GoalCardData } from './GoalCard';

const HEALTH_STATUS_MAP: Record<
	string,
	{ label: string; color: string; bg: string }
> = {
	critical: {
		label: 'Critical',
		color: 'text-red-700 dark:text-red-400',
		bg: 'bg-red-100 dark:bg-red-900/50',
	},
	underfunded: {
		label: 'Underfunded',
		color: 'text-yellow-700 dark:text-yellow-400',
		bg: 'bg-yellow-100 dark:bg-yellow-900/50',
	},
	building: {
		label: 'Building',
		color: 'text-blue-700 dark:text-blue-400',
		bg: 'bg-blue-100 dark:bg-blue-900/50',
	},
	funded: {
		label: 'Funded',
		color: 'text-green-700 dark:text-green-400',
		bg: 'bg-green-100 dark:bg-green-900/50',
	},
};

interface GoalDetailDialogProps {
	goal: GoalCardData | null;
	onClose: () => void;
}

export function GoalDetailDialog({ goal, onClose }: GoalDetailDialogProps) {
	const { formatCurrency } = useCurrency();
	const [showContribution, setShowContribution] = useState(false);
	const [loading, setLoading] = useState(false);

	if (!goal) return null;

	const target = Number(goal.targetAmount);
	const current = Number(goal.currentAmount);
	const isMonthsCoverage = goal.goalType === 'MONTHS_COVERAGE';

	let percentage: number;
	if (isMonthsCoverage && goal.thresholdHigh) {
		const months = goal.monthsCoverage ?? 0;
		percentage = Math.min((months / goal.thresholdHigh) * 100, 100);
	} else {
		percentage =
			target > 0 ? Math.min((current / target) * 100, 100) : 0;
	}

	const healthInfo = goal.healthStatus
		? HEALTH_STATUS_MAP[goal.healthStatus]
		: null;

	async function handleArchive() {
		setLoading(true);
		const result = await archiveGoalAction(goal!.id);
		setLoading(false);
		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Goal archived');
			onClose();
		}
	}

	async function handleComplete() {
		setLoading(true);
		const result = await completeGoalAction(goal!.id);
		setLoading(false);
		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Goal completed!');
			onClose();
		}
	}

	async function handleDelete() {
		setLoading(true);
		const result = await deleteGoalAction(goal!.id);
		setLoading(false);
		if (result?.error) {
			toast.error(result.error);
		} else {
			toast.success('Goal deleted');
			onClose();
		}
	}

	return (
		<>
			<Dialog
				open={!!goal}
				onOpenChange={(v) => !v && onClose()}
			>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle className='flex items-center gap-2'>
							{goal.name}
							{goal.isEmergencyFund && (
								<Shield className='h-4 w-4 text-blue-600' />
							)}
							{healthInfo && (
								<Badge
									variant='outline'
									className={`text-xs ${healthInfo.color} ${healthInfo.bg} border-0`}
								>
									{healthInfo.label}
								</Badge>
							)}
						</DialogTitle>
					</DialogHeader>

					<div className='space-y-4'>
						{/* Progress Section */}
						<div className='space-y-2'>
							<div className='flex justify-between text-sm'>
								{isMonthsCoverage ? (
									<>
										<span>
											{goal.monthsCoverage !== undefined
												? `${goal.monthsCoverage.toFixed(1)} months of coverage`
												: formatCurrency(current)}
										</span>
										<span className='font-medium'>
											{percentage.toFixed(1)}%
										</span>
									</>
								) : (
									<>
										<span>
											{formatCurrency(current)} of{' '}
											{formatCurrency(target)}
										</span>
										<span className='font-medium'>
											{percentage.toFixed(1)}%
										</span>
									</>
								)}
							</div>
							<Progress value={percentage} className='h-3' />
						</div>

						{/* Milestones */}
						{isMonthsCoverage &&
						goal.thresholdLow &&
						goal.thresholdMid &&
						goal.thresholdHigh ? (
							<div className='flex justify-between'>
								{[
									{
										months: goal.thresholdLow,
										label: 'Critical',
										color: 'text-red-600',
									},
									{
										months: goal.thresholdMid,
										label: 'Underfunded',
										color: 'text-yellow-600',
									},
									{
										months: goal.thresholdHigh,
										label: 'Funded',
										color: 'text-green-600',
									},
								].map((m) => {
									const months =
										goal.monthsCoverage ?? 0;
									const reached = months >= m.months;
									return (
										<div
											key={m.label}
											className='flex flex-col items-center'
										>
											<div
												className={`h-2 w-2 rounded-full ${
													reached
														? 'bg-primary'
														: 'bg-muted'
												}`}
											/>
											<span
												className={`text-xs mt-1 ${reached ? m.color : 'text-muted-foreground'}`}
											>
												{m.months}mo
											</span>
											<span className='text-[10px] text-muted-foreground'>
												{m.label}
											</span>
										</div>
									);
								})}
							</div>
						) : (
							<div className='flex justify-between'>
								{[25, 50, 75, 100].map((m) => (
									<div
										key={m}
										className='flex flex-col items-center'
									>
										<div
											className={`h-2 w-2 rounded-full ${
												percentage >= m
													? 'bg-primary'
													: 'bg-muted'
											}`}
										/>
										<span className='text-xs text-muted-foreground mt-1'>
											{m}%
										</span>
									</div>
								))}
							</div>
						)}

						{/* Info */}
						{isMonthsCoverage && (
							<div className='rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1'>
								<p>
									Balance: {formatCurrency(current)}
								</p>
								{goal.isEmergencyFund && (
									<p className='text-blue-600 dark:text-blue-400 flex items-center gap-1'>
										<Shield className='h-3 w-3' />
										Emergency Fund — receives auto-contributions from income
									</p>
								)}
							</div>
						)}

						{goal.linkedAccount && (
							<p className='text-sm text-muted-foreground'>
								Linked to{' '}
								<span className='font-medium'>
									{goal.linkedAccount.name}
								</span>{' '}
								— progress tracked automatically
							</p>
						)}

						{goal.status === 'ACTIVE' && (
							<div className='flex flex-wrap gap-2'>
								{!goal.linkedAccount && (
									<Button
										size='sm'
										onClick={() =>
											setShowContribution(true)
										}
									>
										<Plus className='h-4 w-4 mr-1' />
										Add Contribution
									</Button>
								)}
								<Button
									size='sm'
									variant='outline'
									onClick={handleComplete}
									disabled={loading}
								>
									<CheckCircle2 className='h-4 w-4 mr-1' />
									Complete
								</Button>
								<Button
									size='sm'
									variant='outline'
									onClick={handleArchive}
									disabled={loading}
								>
									<Archive className='h-4 w-4 mr-1' />
									Archive
								</Button>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											size='sm'
											variant='ghost'
											disabled={loading}
										>
											<Trash2 className='h-4 w-4 text-destructive' />
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												Delete &quot;{goal.name}&quot;?
											</AlertDialogTitle>
											<AlertDialogDescription>
												This will permanently delete
												this goal and all its
												contributions.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>
												Cancel
											</AlertDialogCancel>
											<AlertDialogAction
												onClick={handleDelete}
											>
												Delete
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
						)}

						{goal.status !== 'ACTIVE' && (
							<Badge
								variant={
									goal.status === 'COMPLETED'
										? 'default'
										: 'secondary'
								}
							>
								{goal.status}
							</Badge>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{showContribution && (
				<AddContributionDialog
					goalId={goal.id}
					goalName={goal.name}
					open={showContribution}
					onClose={() => setShowContribution(false)}
				/>
			)}
		</>
	);
}
