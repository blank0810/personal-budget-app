function Block({ className }: { className: string }) {
	return <div className={`rounded-md bg-muted/60 ${className}`} />;
}

export function DashboardSkeleton() {
	return (
		<div
			className='container mx-auto space-y-5 py-4'
			aria-hidden='true'
		>
			<div className='flex flex-col gap-4 border-b pb-4 xl:flex-row xl:items-end xl:justify-between'>
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
			<div className='border-y bg-muted/20 py-4 sm:px-6'>
				<div className='grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.75fr)] xl:items-center'>
					<div className='space-y-2'>
						<Block className='h-3 w-20' />
						<Block className='h-12 w-72' />
						<Block className='h-5 w-full max-w-[36rem]' />
					</div>
					<Block className='h-16 w-full' />
				</div>
				<div className='-mb-4 mt-4 grid border-t sm:-mx-6 sm:grid-cols-3'>
					{Array.from({ length: 3 }).map((_, index) => (
						<div key={index} className='space-y-2 py-3 sm:px-6'>
							<Block className='h-3 w-24' />
							<Block className='h-7 w-32' />
						</div>
					))}
				</div>
			</div>
			<div className='space-y-3'>
				<Block className='h-7 w-40' />
				{Array.from({ length: 5 }).map((_, index) => (
					<div
						key={index}
						className='grid gap-3 border-b py-3 md:grid-cols-[minmax(0,1.2fr)_7rem_minmax(0,1fr)] md:items-center md:gap-x-6 md:pr-8'
					>
						<Block className='h-11 w-full' />
						<Block className='h-6 w-20' />
						<Block className='h-5 w-full' />
					</div>
				))}
			</div>
			<div className='grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]'>
				<Block className='h-80 w-full' />
				<Block className='h-80 w-full' />
			</div>
			<div className='grid gap-5 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.65fr)]'>
				<Block className='h-64 w-full' />
				<Block className='h-64 w-full' />
			</div>
		</div>
	);
}
