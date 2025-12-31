'use client';

import * as React from 'react';
import {
	format,
	startOfMonth,
	endOfMonth,
	subMonths,
	startOfYear,
	endOfYear,
	subYears,
} from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface DateRangePickerProps {
	className?: string;
	date: DateRange | undefined;
	setDate: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
	className,
	date,
	setDate,
}: DateRangePickerProps) {
	const [month, setMonth] = React.useState<Date>(new Date());
	const [mounted, setMounted] = React.useState(false);

	// Prevent hydration mismatch by only rendering dates after mount
	React.useEffect(() => {
		setMounted(true);
	}, []);

	// Presets for quick selection
	const presets = [
		{
			label: 'This Month',
			getValue: () => {
				const now = new Date();
				return { from: startOfMonth(now), to: endOfMonth(now) };
			},
		},
		{
			label: 'Last Month',
			getValue: () => {
				const now = new Date();
				const lastMonth = subMonths(now, 1);
				return {
					from: startOfMonth(lastMonth),
					to: endOfMonth(lastMonth),
				};
			},
		},
		{
			label: 'This Year',
			getValue: () => {
				const now = new Date();
				return { from: startOfYear(now), to: endOfYear(now) };
			},
		},
		{
			label: 'Last Year',
			getValue: () => {
				const now = new Date();
				const lastYear = subYears(now, 1);
				return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
			},
		},
	];

	const handlePresetChange = (value: string) => {
		const preset = presets.find((p) => p.label === value);
		if (preset) {
			const newRange = preset.getValue();
			setDate(newRange);
			setMonth(newRange.from); // Jump calendar to start of range
		}
	};

	return (
		<div className={cn('grid gap-2', className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id='date'
						variant={'outline'}
						className={cn(
							'w-[300px] justify-start text-left font-normal',
							!date && 'text-muted-foreground'
						)}
					>
						<CalendarIcon className='mr-2 h-4 w-4' />
						{!mounted ? (
							<span>Loading...</span>
						) : date?.from ? (
							date.to ? (
								<>
									{format(date.from, 'LLL dd, y')} -{' '}
									{format(date.to, 'LLL dd, y')}
								</>
							) : (
								format(date.from, 'LLL dd, y')
							)
						) : (
							<span>Pick a date</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-auto p-0' align='start'>
					<div className='p-3 border-b'>
						<Select onValueChange={handlePresetChange}>
							<SelectTrigger>
								<SelectValue placeholder='Select a preset...' />
							</SelectTrigger>
							<SelectContent position='popper'>
								{presets.map((preset) => (
									<SelectItem
										key={preset.label}
										value={preset.label}
									>
										{preset.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<Calendar
						initialFocus
						mode='range'
						defaultMonth={date?.from}
						month={month}
						onMonthChange={setMonth}
						selected={date}
						onSelect={setDate}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
