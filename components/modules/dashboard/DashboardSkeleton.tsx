import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for the greeting header (Row 1)
 */
export function GreetingHeaderSkeleton() {
	return (
		<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
			<div className='space-y-2'>
				<Skeleton className='h-8 w-64' />
				<Skeleton className='h-4 w-80' />
			</div>
			<div className='flex items-center gap-2'>
				<Skeleton className='h-9 w-24 rounded-md' />
				<Skeleton className='h-9 w-24 rounded-md' />
			</div>
		</div>
	);
}

/**
 * Skeleton for the account card carousel (Row 2 left)
 */
export function AccountCardCarouselSkeleton() {
	return (
		<div className='flex flex-col gap-5'>
			{/* Card row */}
			<div className='flex gap-4 overflow-hidden pb-2'>
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						key={i}
						className='h-[140px] w-[220px] shrink-0 rounded-xl'
					>
						<Skeleton className='h-full w-full rounded-xl' />
					</div>
				))}
			</div>
			{/* Selected account detail */}
			<div className='flex flex-col gap-2'>
				<Skeleton className='h-3 w-24' />
				<Skeleton className='h-3 w-16' />
				<Skeleton className='h-10 w-48' />
			</div>
		</div>
	);
}

/**
 * Skeleton for the dashboard tabs panel content only (no Card wrapper)
 */
export function DashboardTabsSkeleton() {
	return (
		<div>
			{/* Title row */}
			<div className='flex items-center justify-between mb-3'>
				<Skeleton className='h-4 w-20' />
				<Skeleton className='h-3 w-16' />
			</div>
			{/* Pill tabs bar */}
			<Skeleton className='h-8 w-full rounded-full mb-4' />
			<div className='grid grid-cols-2 gap-3'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className='rounded-lg border bg-muted/30 p-3'>
						<Skeleton className='h-2.5 w-14 mb-2' />
						<Skeleton className='h-5 w-20' />
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Skeleton for quick transfer / payment content only (no Card wrapper)
 */
function QuickTransferContentSkeleton() {
	return (
		<div>
			<div className='flex items-center justify-between mb-4'>
				<Skeleton className='h-5 w-28' />
				<Skeleton className='h-7 w-40 rounded-lg' />
			</div>
			<div className='space-y-3'>
				<div className='space-y-1.5'>
					<Skeleton className='h-3 w-10' />
					<Skeleton className='h-9 w-full rounded-md' />
				</div>
				<div className='space-y-1.5'>
					<Skeleton className='h-3 w-6' />
					<Skeleton className='h-9 w-full rounded-md' />
				</div>
				<div className='space-y-1.5'>
					<Skeleton className='h-3 w-14' />
					<Skeleton className='h-9 w-full rounded-md' />
				</div>
				<Skeleton className='h-9 w-full rounded-md mt-1' />
			</div>
		</div>
	);
}

/**
 * Combined skeleton for the merged Overview tabs + Quick Transfer panel (Row 2 right)
 */
export function CombinedTabsTransferSkeleton() {
	return (
		<Card className='flex flex-col'>
			<CardContent className='p-0 flex flex-col'>
				<div className='p-4 sm:p-5'>
					<DashboardTabsSkeleton />
				</div>
				<Separator />
				<div className='p-4 sm:p-5'>
					<QuickTransferContentSkeleton />
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Skeleton for recent transactions (Row 3 left)
 */
export function RecentTransactionsSkeleton() {
	return (
		<Card>
			<CardHeader className='flex flex-row items-center justify-between pb-3'>
				<Skeleton className='h-5 w-28' />
				<Skeleton className='h-3 w-16' />
			</CardHeader>
			<CardContent className='px-4 pb-4'>
				<div className='space-y-5'>
					{Array.from({ length: 5 }).map((_, i) => (
						<div key={i} className='flex items-center gap-3'>
							<Skeleton className='h-9 w-9 rounded-full shrink-0' />
							<div className='min-w-0 flex-1 space-y-1'>
								<Skeleton className='h-4 w-32' />
								<Skeleton className='h-3 w-24' />
							</div>
							<Skeleton className='h-4 w-16 shrink-0' />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Skeleton for quick transfer / payment standalone card (used in DashboardPageSkeleton)
 */
export function QuickTransferPaymentSkeleton() {
	return (
		<Card>
			<CardHeader className='pb-3'>
				<div className='flex items-center justify-between'>
					<Skeleton className='h-5 w-28' />
					<Skeleton className='h-7 w-40 rounded-lg' />
				</div>
			</CardHeader>
			<CardContent className='px-4 pb-4 space-y-3'>
				<div className='space-y-1.5'>
					<Skeleton className='h-3 w-10' />
					<Skeleton className='h-9 w-full rounded-md' />
				</div>
				<div className='space-y-1.5'>
					<Skeleton className='h-3 w-6' />
					<Skeleton className='h-9 w-full rounded-md' />
				</div>
				<div className='space-y-1.5'>
					<Skeleton className='h-3 w-14' />
					<Skeleton className='h-9 w-full rounded-md' />
				</div>
				<Skeleton className='h-9 w-full rounded-md mt-1' />
			</CardContent>
		</Card>
	);
}

/**
 * Skeleton for AI advisor teaser (Row 4 left)
 */
export function AiAdvisorTeaserSkeleton() {
	return (
		<Card className='min-h-[350px] flex flex-col items-center justify-center'>
			<CardContent className='flex flex-col items-center gap-4 p-8'>
				<Skeleton className='h-16 w-16 rounded-full' />
				<Skeleton className='h-6 w-44' />
				<Skeleton className='h-4 w-60' />
				<Skeleton className='h-4 w-48' />
				<Skeleton className='h-6 w-24 rounded-full' />
			</CardContent>
		</Card>
	);
}

/**
 * Skeleton for income/expense trend chart (Row 4 right)
 */
export function IncomeExpenseTrendSkeleton() {
	return (
		<Card className='flex flex-col'>
			<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
				<Skeleton className='h-5 w-36' />
				<Skeleton className='h-3 w-20' />
			</CardHeader>
			<CardContent className='flex flex-1 flex-col gap-6'>
				{/* Chart area */}
				<Skeleton className='h-[260px] w-full rounded-md' />
				{/* Summary stats */}
				<div className='grid grid-cols-3 gap-4 pt-4 border-t'>
					{Array.from({ length: 3 }).map((_, i) => (
						<div key={i} className='space-y-1'>
							<Skeleton className='h-3 w-20' />
							<Skeleton className='h-5 w-24' />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Full dashboard skeleton -- all rows
 */
export function DashboardPageSkeleton() {
	return (
		<div className='container mx-auto space-y-6 py-6 md:py-10'>
			<GreetingHeaderSkeleton />

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.54fr]'>
				<AccountCardCarouselSkeleton />
				<DashboardTabsSkeleton />
			</div>

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-[1.33fr_1fr]'>
				<RecentTransactionsSkeleton />
				<QuickTransferPaymentSkeleton />
			</div>

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
				<AiAdvisorTeaserSkeleton />
				<IncomeExpenseTrendSkeleton />
			</div>
		</div>
	);
}
