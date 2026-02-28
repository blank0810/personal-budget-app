'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarDays, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Category, Budget } from '@prisma/client';
import { useCurrency } from '@/lib/contexts/currency-context';

interface BudgetWithCategory extends Budget {
	category: Category;
	spent: number;
	remaining: number;
	percentage: number;
}

interface MonthGroup {
	key: string;
	label: string;
	date: Date;
	budgets: BudgetWithCategory[];
}

interface BudgetSelectorProps {
	budgets: BudgetWithCategory[];
	value?: string;
	onChange: (budgetId: string | undefined) => void;
	selectedDate?: Date;
	disabled?: boolean;
}

function getBudgetColorClass(b: BudgetWithCategory) {
	if (b.remaining < 0) return 'text-red-600';
	if (b.percentage >= 80 && b.percentage < 100) return 'text-amber-600';
	return 'text-green-600';
}

/**
 * Accordion wrapper that animates height from 0 to auto.
 * Uses a ref to measure content height and CSS transition.
 */
function AccordionContent({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
	const contentRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState(0);

	useEffect(() => {
		if (expanded && contentRef.current) {
			setHeight(contentRef.current.scrollHeight);
		} else {
			setHeight(0);
		}
	}, [expanded]);

	return (
		<div
			className='overflow-hidden transition-all duration-200 ease-out'
			style={{ height: expanded ? height : 0, opacity: expanded ? 1 : 0 }}
		>
			<div ref={contentRef}>
				{children}
			</div>
		</div>
	);
}

export function BudgetSelector({
	budgets,
	value,
	onChange,
	selectedDate,
	disabled,
}: BudgetSelectorProps) {
	const { formatCurrency } = useCurrency();
	const [open, setOpen] = useState(false);
	const [view, setView] = useState<'current' | 'months'>('current');
	const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
	// Track slide direction for page transition animation
	const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
	const [isAnimating, setIsAnimating] = useState(false);

	// Group budgets by current month vs previous months
	const { currentMonthBudgets, previousMonthGroups } = useMemo(() => {
		if (!selectedDate) return { currentMonthBudgets: budgets, previousMonthGroups: [] };

		const expMonth = selectedDate.getMonth();
		const expYear = selectedDate.getFullYear();

		const current: BudgetWithCategory[] = [];
		const previousMap = new Map<string, MonthGroup>();

		const threeMonthsAgo = new Date(expYear, expMonth - 3, 1);
		const currentMonthStart = new Date(expYear, expMonth, 1);

		for (const b of budgets) {
			const bDate = new Date(b.month);
			const bMonth = bDate.getMonth();
			const bYear = bDate.getFullYear();

			if (bMonth === expMonth && bYear === expYear) {
				current.push(b);
			} else if (bDate >= threeMonthsAgo && bDate < currentMonthStart) {
				const key = `${bYear}-${String(bMonth).padStart(2, '0')}`;
				if (!previousMap.has(key)) {
					previousMap.set(key, {
						key,
						label: format(bDate, 'MMMM yyyy'),
						date: bDate,
						budgets: [],
					});
				}
				previousMap.get(key)!.budgets.push(b);
			}
		}

		const groups = Array.from(previousMap.values()).sort(
			(a, b) => b.date.getTime() - a.date.getTime()
		);

		return { currentMonthBudgets: current, previousMonthGroups: groups };
	}, [selectedDate, budgets]);

	// Find selected budget for display
	const selectedBudget = budgets.find((b) => b.id === value);
	const isSelectedFromPreviousMonth = useMemo(() => {
		if (!selectedBudget || !selectedDate) return false;
		const bDate = new Date(selectedBudget.month);
		return bDate.getMonth() !== selectedDate.getMonth() || bDate.getFullYear() !== selectedDate.getFullYear();
	}, [selectedBudget, selectedDate]);

	// Display text for trigger
	const triggerText = useMemo(() => {
		if (!selectedBudget) return null;
		if (isSelectedFromPreviousMonth) {
			return `${selectedBudget.name} (${format(new Date(selectedBudget.month), 'MMM yyyy')})`;
		}
		return selectedBudget.name;
	}, [selectedBudget, isSelectedFromPreviousMonth]);

	// Reset view when popover closes
	const handleOpenChange = useCallback((isOpen: boolean) => {
		setOpen(isOpen);
		if (!isOpen) {
			// Delay reset so close animation finishes before content changes
			setTimeout(() => {
				setView('current');
				setExpandedMonth(null);
				setIsAnimating(false);
			}, 150);
		}
	}, []);

	// Navigate to months page with slide-left animation
	const handleChooseAnotherMonth = useCallback(() => {
		setSlideDirection('left');
		setIsAnimating(true);
		// Brief delay so the exit animation plays before content swaps
		setTimeout(() => {
			setView('months');
			// Auto-expand the month of the currently selected budget
			if (selectedBudget && isSelectedFromPreviousMonth) {
				const bDate = new Date(selectedBudget.month);
				const key = `${bDate.getFullYear()}-${String(bDate.getMonth()).padStart(2, '0')}`;
				setExpandedMonth(key);
			}
			// Let enter animation start on next frame
			requestAnimationFrame(() => setIsAnimating(false));
		}, 150);
	}, [selectedBudget, isSelectedFromPreviousMonth]);

	// Navigate back with slide-right animation
	const handleBack = useCallback(() => {
		setSlideDirection('right');
		setIsAnimating(true);
		setTimeout(() => {
			setView('current');
			setExpandedMonth(null);
			requestAnimationFrame(() => setIsAnimating(false));
		}, 150);
	}, []);

	// Toggle accordion month
	const handleToggleMonth = useCallback((key: string) => {
		setExpandedMonth((prev) => (prev === key ? null : key));
	}, []);

	// Select a budget
	const handleSelect = useCallback((budgetId: string | undefined) => {
		onChange(budgetId);
		setOpen(false);
		setView('current');
		setExpandedMonth(null);
	}, [onChange]);

	// Compute slide animation classes
	const getSlideClasses = () => {
		if (isAnimating) {
			// Exit: slide out in the direction of navigation
			return slideDirection === 'left'
				? 'translate-x-[-20px] opacity-0'
				: 'translate-x-[20px] opacity-0';
		}
		// Enter: content is in place
		return 'translate-x-0 opacity-100';
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className={cn(
						'w-full justify-between font-normal',
						disabled && 'bg-muted cursor-not-allowed',
						!triggerText && 'text-muted-foreground'
					)}
					disabled={disabled}
				>
					<span className='truncate'>
						{triggerText || 'Link to a budget (optional)'}
					</span>
					<ChevronRight className={cn(
						'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform duration-200',
						open && 'rotate-90'
					)} />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[--radix-popover-trigger-width] p-0 overflow-hidden'
				align='start'
			>
				<div className={cn(
					'transition-all duration-200 ease-out',
					getSlideClasses()
				)}>
					{view === 'current' ? (
						/* ── PAGE 1: Current Month ── */
						<div className='max-h-[300px] overflow-y-auto'>
							{/* No budget option */}
							<button
								type='button'
								className={cn(
									'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
									!value && 'bg-accent'
								)}
								onClick={() => handleSelect(undefined)}
							>
								<Check className={cn('h-4 w-4 shrink-0', value ? 'opacity-0' : 'opacity-100')} />
								<span>No budget</span>
							</button>

							{/* Current month header */}
							{currentMonthBudgets.length > 0 && (
								<div className='px-3 py-1.5'>
									<span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
										{selectedDate ? format(selectedDate, 'MMMM yyyy') : 'Current Month'}
									</span>
								</div>
							)}

							{/* Current month budgets */}
							{currentMonthBudgets.map((budget, i) => (
								<button
									key={budget.id}
									type='button'
									className={cn(
										'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
										value === budget.id && 'bg-accent'
									)}
									style={{ animationDelay: `${i * 30}ms` }}
									onClick={() => handleSelect(budget.id)}
								>
									<Check className={cn('h-4 w-4 shrink-0', value === budget.id ? 'opacity-100' : 'opacity-0')} />
									<span className='truncate'>{budget.name}</span>
									<span className={cn('ml-auto text-xs font-medium shrink-0', getBudgetColorClass(budget))}>
										{formatCurrency(budget.remaining, { decimals: 0 })} left
									</span>
								</button>
							))}

							{/* Empty state */}
							{currentMonthBudgets.length === 0 && selectedDate && (
								<div className='px-3 py-3 text-sm text-muted-foreground italic text-center'>
									No budgets for {format(selectedDate, 'MMMM yyyy')}
								</div>
							)}

							{/* Choose another month link */}
							{previousMonthGroups.length > 0 && (
								<>
									<div className='border-t mx-2 my-1' />
									<button
										type='button'
										className='flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors group'
										onClick={handleChooseAnotherMonth}
									>
										<CalendarDays className='h-4 w-4 shrink-0' />
										<span>Choose another month</span>
										<ChevronRight className='ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5' />
									</button>
								</>
							)}
						</div>
					) : (
						/* ── PAGE 2: Previous Months ── */
						<div className='max-h-[300px] overflow-y-auto'>
							{/* Back button */}
							<button
								type='button'
								className='flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent transition-colors border-b group'
								onClick={handleBack}
							>
								<ArrowLeft className='h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5' />
								<span>Back to {selectedDate ? format(selectedDate, 'MMMM yyyy') : 'current month'}</span>
							</button>

							{/* Month groups */}
							{previousMonthGroups.map((group) => (
								<div key={group.key}>
									{/* Month header (accordion trigger) */}
									<button
										type='button'
										className='flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors'
										onClick={() => handleToggleMonth(group.key)}
									>
										<ChevronRight className={cn(
											'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
											expandedMonth === group.key && 'rotate-90'
										)} />
										<span className='font-medium'>{group.label}</span>
										<span className='ml-auto text-xs text-muted-foreground'>
											{group.budgets.length} budget{group.budgets.length !== 1 ? 's' : ''}
										</span>
									</button>

									{/* Animated accordion content */}
									<AccordionContent expanded={expandedMonth === group.key}>
										<div className='bg-muted/30'>
											{group.budgets.map((budget) => (
												<button
													key={budget.id}
													type='button'
													className={cn(
														'flex w-full items-center gap-2 pl-9 pr-3 py-2 text-sm hover:bg-accent transition-colors',
														value === budget.id && 'bg-accent'
													)}
													onClick={() => handleSelect(budget.id)}
												>
													<Check className={cn('h-4 w-4 shrink-0', value === budget.id ? 'opacity-100' : 'opacity-0')} />
													<span className='truncate'>{budget.name}</span>
													<span className={cn('ml-auto text-xs font-medium shrink-0', getBudgetColorClass(budget))}>
														{formatCurrency(budget.remaining, { decimals: 0 })} left
													</span>
												</button>
											))}
										</div>
									</AccordionContent>
								</div>
							))}
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
