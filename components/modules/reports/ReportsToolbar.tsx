'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

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
			// Use date-only format (YYYY-MM-DD) to avoid timezone shifts
			params.set('from', format(date.from, 'yyyy-MM-dd'));
			params.set('to', format(date.to, 'yyyy-MM-dd'));

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
