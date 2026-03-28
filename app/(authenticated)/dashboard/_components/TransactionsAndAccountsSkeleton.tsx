import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TransactionsAndAccountsSkeleton() {
	return (
		<div className='grid gap-4 md:grid-cols-2 lg:grid-cols-7'>
			{/* Recent Transactions skeleton */}
			<Card className='md:col-span-2 lg:col-span-4'>
				<CardHeader className='flex flex-row items-center justify-between'>
					<Skeleton className='h-5 w-40' />
					<Skeleton className='h-3 w-20' />
				</CardHeader>
				<CardContent>
					<div className='space-y-4'>
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className='flex items-center'>
								<Skeleton className='h-9 w-9 rounded-full shrink-0' />
								<div className='ml-4 space-y-1 flex-1'>
									<Skeleton className='h-4 w-36' />
									<Skeleton className='h-3 w-24' />
								</div>
								<Skeleton className='h-4 w-16 ml-auto' />
							</div>
						))}
					</div>
					<div className='mt-4 pt-4 border-t'>
						<div className='flex justify-end'>
							<Skeleton className='h-3 w-32' />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Accounts skeleton */}
			<Card className='md:col-span-2 lg:col-span-3'>
				<CardHeader>
					<Skeleton className='h-5 w-24' />
				</CardHeader>
				<CardContent>
					<div className='space-y-4'>
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className='flex items-center'>
								<Skeleton className='h-9 w-9 rounded-full shrink-0' />
								<div className='ml-4 space-y-1 flex-1'>
									<Skeleton className='h-4 w-28' />
									<Skeleton className='h-3 w-16' />
								</div>
								<Skeleton className='h-4 w-16 ml-auto' />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
