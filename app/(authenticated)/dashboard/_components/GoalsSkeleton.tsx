import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function GoalsSkeleton() {
	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between'>
				<Skeleton className='h-5 w-32' />
				<Skeleton className='h-4 w-20' />
			</CardHeader>
			<CardContent>
				<div className='space-y-1'>
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className='flex items-center gap-3 p-2'>
							<Skeleton className='h-8 w-8 rounded-full shrink-0' />
							<div className='flex-1 space-y-1.5'>
								<Skeleton className='h-4 w-32' />
								<Skeleton className='h-1.5 w-full' />
							</div>
							<Skeleton className='h-4 w-10' />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
