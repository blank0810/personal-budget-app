'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers } from 'lucide-react';

interface QueueHealth {
	name: string;
	waiting: number;
	active: number;
	completed: number;
	failed: number;
}

interface QueueHealthPanelProps {
	queues: QueueHealth[];
}

export function QueueHealthPanel({ queues }: QueueHealthPanelProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<Layers className='h-4 w-4' />
					Job Queues
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className='grid gap-4 md:grid-cols-2'>
					{queues.map((queue) => (
						<div
							key={queue.name}
							className='rounded-lg border p-4 space-y-3'
						>
							<h4 className='font-mono text-sm font-medium'>
								{queue.name}
							</h4>
							<div className='grid grid-cols-2 gap-2'>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>
										Waiting
									</span>
									<Badge variant='secondary' className='text-xs'>
										{queue.waiting}
									</Badge>
								</div>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>
										Active
									</span>
									<Badge variant='default' className='text-xs'>
										{queue.active}
									</Badge>
								</div>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>
										Completed
									</span>
									<Badge variant='outline' className='text-xs'>
										{queue.completed}
									</Badge>
								</div>
								<div className='flex items-center justify-between'>
									<span className='text-xs text-muted-foreground'>
										Failed
									</span>
									<Badge
										variant={
											queue.failed > 0
												? 'destructive'
												: 'outline'
										}
										className='text-xs'
									>
										{queue.failed}
									</Badge>
								</div>
							</div>
						</div>
					))}
				</div>
				{queues.length === 0 && (
					<p className='text-sm text-muted-foreground text-center py-4'>
						No queues configured
					</p>
				)}
			</CardContent>
		</Card>
	);
}
