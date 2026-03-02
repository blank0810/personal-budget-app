'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { Timer } from 'lucide-react';

interface CronStatus {
	key: string;
	lastRunAt: string | Date | null;
	status: string;
	processedCount: number;
	duration: number | null;
	errorMessage: string | null;
	health: 'green' | 'yellow' | 'red';
}

const HEALTH_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> =
	{
		green: 'default',
		yellow: 'secondary',
		red: 'destructive',
	};

const HEALTH_LABELS: Record<string, string> = {
	green: 'Healthy',
	yellow: 'Warning',
	red: 'Error',
};

interface CronStatusPanelProps {
	cronStatuses: CronStatus[];
}

export function CronStatusPanel({ cronStatuses }: CronStatusPanelProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<Timer className='h-4 w-4' />
					Cron Jobs
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className='overflow-x-auto rounded border'>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Job</TableHead>
								<TableHead>Last Run</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className='text-right'>
									Processed
								</TableHead>
								<TableHead className='text-right hidden sm:table-cell'>
									Duration
								</TableHead>
								<TableHead>Health</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{cronStatuses.map((cron) => (
								<TableRow key={cron.key}>
									<TableCell className='font-mono text-sm'>
										{cron.key}
									</TableCell>
									<TableCell className='text-sm'>
										{cron.lastRunAt
											? formatDistanceToNow(
													new Date(cron.lastRunAt),
													{ addSuffix: true }
												)
											: 'Never'}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												cron.status === 'success'
													? 'outline'
													: cron.status === 'failed'
														? 'destructive'
														: 'secondary'
											}
											className='text-xs'
										>
											{cron.status}
										</Badge>
									</TableCell>
									<TableCell className='text-right text-sm'>
										{cron.processedCount}
									</TableCell>
									<TableCell className='text-right text-sm hidden sm:table-cell'>
										{cron.duration
											? `${cron.duration}ms`
											: '-'}
									</TableCell>
									<TableCell>
										<Badge
											variant={
												HEALTH_COLORS[cron.health]
											}
											className='text-xs'
										>
											{HEALTH_LABELS[cron.health]}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				{cronStatuses.some((c) => c.errorMessage) && (
					<div className='mt-4 space-y-2'>
						<p className='text-sm font-medium text-destructive'>
							Errors:
						</p>
						{cronStatuses
							.filter((c) => c.errorMessage)
							.map((c) => (
								<div
									key={c.key}
									className='text-xs text-destructive bg-destructive/10 rounded p-2'
								>
									<span className='font-mono'>
										{c.key}:
									</span>{' '}
									{c.errorMessage}
								</div>
							))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
