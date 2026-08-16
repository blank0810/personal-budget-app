function Block({ className }: { className: string }) {
	return <div className={`rounded-md bg-muted/60 ${className}`} />;
}

export function DashboardSkeleton() {
	return (
		<div
			className='container mx-auto space-y-6 py-5 md:py-6'
			aria-hidden='true'
		>
			<div className='flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-end lg:justify-between'>
				<div className='space-y-2'>
					<Block className='h-10 w-52' />
					<Block className='h-4 w-44' />
				</div>
				<div className='grid grid-cols-2 gap-2 sm:flex'>
					{Array.from({ length: 4 }).map((_, index) => (
						<Block key={index} className='h-9 w-28' />
					))}
				</div>
			</div>
			<div className='grid gap-6 border-y bg-muted/20 py-5 sm:px-6 lg:grid-cols-[9rem_minmax(0,1fr)_minmax(20rem,0.8fr)]'>
				<Block className='h-20 w-28' />
				<Block className='h-20 w-full' />
				<Block className='h-20 w-full' />
			</div>
			<div className='space-y-3'>
				<Block className='h-7 w-40' />
				{Array.from({ length: 5 }).map((_, index) => (
					<div
						key={index}
						className='grid gap-3 border-b py-4 md:grid-cols-[minmax(12rem,1.2fr)_7rem_minmax(12rem,1fr)_auto] md:items-center md:gap-6'
					>
						<Block className='h-11 w-full' />
						<Block className='h-6 w-20' />
						<Block className='h-5 w-full' />
						<Block className='h-8 w-28' />
					</div>
				))}
			</div>
			<div className='grid border-y sm:grid-cols-2 lg:grid-cols-4'>
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className='space-y-2 py-4 sm:px-5'>
						<Block className='h-3 w-24' />
						<Block className='h-7 w-32' />
					</div>
				))}
			</div>
			<div className='grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]'>
				<Block className='h-80 w-full' />
				<Block className='h-80 w-full' />
			</div>
			<div className='grid gap-6 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.65fr)]'>
				<Block className='h-64 w-full' />
				<Block className='h-64 w-full' />
			</div>
		</div>
	);
}
