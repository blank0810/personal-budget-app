'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Flame, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Category } from '@prisma/client';
import { getFrequentCategoriesAction } from '@/server/modules/category/category.controller';

interface CategoryComboboxProps {
	categories: Category[];
	value?: string;
	onChange: (value: string | undefined) => void;
	onCreateNew: () => void;
	disabled?: boolean;
	lockedCategoryId?: string; // When budget is selected
}

export function CategoryCombobox({
	categories,
	value,
	onChange,
	onCreateNew,
	disabled,
	lockedCategoryId,
}: CategoryComboboxProps) {
	const [open, setOpen] = useState(false);
	const [frequentCategories, setFrequentCategories] = useState<Category[]>([]);

	useEffect(() => {
		getFrequentCategoriesAction().then((result) => {
			if (result.success && result.data) {
				setFrequentCategories(result.data as Category[]);
			}
		});
	}, []);

	const selectedCategory = categories.find((c) => c.id === value);
	const displayValue = lockedCategoryId
		? categories.find((c) => c.id === lockedCategoryId)?.name
		: selectedCategory?.name;

	// Filter out frequent categories from "All" list to avoid duplicates
	const frequentIds = new Set(frequentCategories.map((c) => c.id));
	const otherCategories = categories.filter((c) => !frequentIds.has(c.id));

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className={cn(
						'w-full justify-between font-normal',
						disabled && 'bg-muted cursor-not-allowed',
						!displayValue && 'text-muted-foreground'
					)}
					disabled={disabled}
				>
					{displayValue || 'Select category...'}
					<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-[--radix-popover-trigger-width] p-0'
				align='start'
			>
				<Command>
					<CommandInput placeholder='Search categories...' />
					<CommandList>
						<CommandEmpty>No category found.</CommandEmpty>

						{/* Frequent Categories */}
						{frequentCategories.length > 0 && (
							<CommandGroup heading='Frequent'>
								{frequentCategories.map((category) => (
									<CommandItem
										key={category.id}
										value={category.name}
										onSelect={() => {
											onChange(category.id);
											setOpen(false);
										}}
									>
										<Flame className='mr-2 h-4 w-4 text-orange-500' />
										{category.name}
										<Check
											className={cn(
												'ml-auto h-4 w-4',
												value === category.id
													? 'opacity-100'
													: 'opacity-0'
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						)}

						{frequentCategories.length > 0 && otherCategories.length > 0 && (
							<CommandSeparator />
						)}

						{/* All Categories */}
						{otherCategories.length > 0 && (
							<CommandGroup heading='All Categories'>
								{otherCategories.map((category) => (
									<CommandItem
										key={category.id}
										value={category.name}
										onSelect={() => {
											onChange(category.id);
											setOpen(false);
										}}
									>
										{category.name}
										<Check
											className={cn(
												'ml-auto h-4 w-4',
												value === category.id
													? 'opacity-100'
													: 'opacity-0'
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						)}

						<CommandSeparator />

						{/* Create New Option */}
						<CommandGroup>
							<CommandItem
								onSelect={() => {
									onCreateNew();
									setOpen(false);
								}}
								disabled={disabled}
							>
								<Plus className='mr-2 h-4 w-4' />
								Create Custom Category
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
