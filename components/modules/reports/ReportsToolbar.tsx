'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface ReportsToolbarProps {
	initialFrom: Date;
	initialTo: Date;
}

export function ReportsToolbar({
	initialFrom,
	initialTo,
}: ReportsToolbarProps) {
	const router = useRouter();
	const [date, setDate] = useState<DateRange | undefined>({
		from: initialFrom,
		to: initialTo,
	});

	useEffect(() => {
		if (date?.from && date?.to) {
			const params = new URLSearchParams();
			params.set('from', date.from.toISOString());
			params.set('to', date.to.toISOString());

			// Replace to avoid history stack buildup
			router.push(`?${params.toString()}`);
		}
	}, [date, router]);

	return (
		<div className='flex items-center gap-2'>
			<DateRangePicker date={date} setDate={setDate} />
		</div>
	);
}
