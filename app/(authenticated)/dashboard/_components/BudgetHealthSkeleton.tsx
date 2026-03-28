import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function BudgetHealthSkeleton() {
	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
				<div className='space-y-1'>
					<Skeleton className='h-4 w-28' />
					<Skeleton className='h-3 w-20' />
				</div>
				<Skeleton className='h-8 w-8 rounded-full' />
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='flex items-center gap-3'>
					<Skeleton className='h-4 w-20' />
					<Skeleton className='h-4 w-20' />
				</div>
				<div className='space-y-2'>
					<div className='flex justify-between'>
						<Skeleton className='h-4 w-32' />
						<Skeleton className='h-4 w-10' />
					</div>
					<Skeleton className='h-2 w-full' />
					<Skeleton className='h-3 w-40' />
				</div>
			</CardContent>
		</Card>
	);
}
