import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function KpiCardsSkeleton() {
	return (
		<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
			{Array.from({ length: 4 }).map((_, i) => (
				<Card key={i} className='transition-all'>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
						<Skeleton className='h-4 w-24' />
						<Skeleton className='h-8 w-8 rounded-full' />
					</CardHeader>
					<CardContent className='space-y-2'>
						<Skeleton className='h-8 w-32' />
						<Skeleton className='h-3 w-40' />
					</CardContent>
				</Card>
			))}
		</div>
	);
}
