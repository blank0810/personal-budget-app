import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function InvoiceSkeleton() {
	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between pb-3'>
				<Skeleton className='h-5 w-24' />
				<Skeleton className='h-4 w-16' />
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid grid-cols-3 gap-3'>
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className='space-y-1'>
							<Skeleton className='h-3 w-16' />
							<Skeleton className='h-7 w-20' />
						</div>
					))}
				</div>
				<div className='flex gap-2'>
					<Skeleton className='h-9 flex-1' />
					<Skeleton className='h-9 flex-1' />
				</div>
			</CardContent>
		</Card>
	);
}
