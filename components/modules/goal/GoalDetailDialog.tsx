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
} from 'lucide-react';
import { AddContributionDialog } from './AddContributionDialog';
import type { GoalCardData } from './GoalCard';

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
	const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

	const milestones = [25, 50, 75, 100];

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
						<DialogTitle>{goal.name}</DialogTitle>
					</DialogHeader>

					<div className='space-y-4'>
						<div className='space-y-2'>
							<div className='flex justify-between text-sm'>
								<span>
									{formatCurrency(current)} of{' '}
									{formatCurrency(target)}
								</span>
								<span className='font-medium'>
									{percentage.toFixed(1)}%
								</span>
							</div>
							<Progress value={percentage} className='h-3' />
						</div>

						{/* Milestones */}
						<div className='flex justify-between'>
							{milestones.map((m) => (
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
