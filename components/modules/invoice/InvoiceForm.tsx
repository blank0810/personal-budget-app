'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	createInvoiceAction,
	updateInvoiceAction,
} from '@/server/modules/invoice/invoice.controller';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

// Client-side Zod schema
const lineItemSchema = z.object({
	description: z.string().min(1, 'Description is required'),
	quantity: z.number().positive('Quantity must be positive'),
	unitPrice: z.number().min(0, 'Unit price must be non-negative'),
});

const invoiceFormSchema = z.object({
	clientName: z.string().min(1, 'Client name is required').max(200),
	clientEmail: z.string().email('Invalid email').optional().or(z.literal('')),
	clientAddress: z.string().optional(),
	clientPhone: z.string().optional(),
	issueDate: z.string().min(1, 'Issue date is required'),
	dueDate: z.string().min(1, 'Due date is required'),
	taxRate: z.number().min(0).max(100).optional(),
	notes: z.string().optional(),
	lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export interface ExistingInvoice {
	id: string;
	clientName: string;
	clientEmail: string | null;
	clientAddress: string | null;
	clientPhone: string | null;
	issueDate: string | Date;
	dueDate: string | Date;
	taxRate: number | null;
	notes: string | null;
	lineItems: {
		description: string;
		quantity: number;
		unitPrice: number;
	}[];
}

interface InvoiceFormProps {
	mode: 'create' | 'edit';
	invoice?: ExistingInvoice;
}

function formatDateInput(date: string | Date | null | undefined): string {
	if (!date) return '';
	const d = date instanceof Date ? date : new Date(date);
	return d.toISOString().slice(0, 10);
}

export function InvoiceForm({ mode, invoice }: InvoiceFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const form = useForm<InvoiceFormValues>({
		resolver: zodResolver(invoiceFormSchema),
		defaultValues:
			mode === 'edit' && invoice
				? {
						clientName: invoice.clientName,
						clientEmail: invoice.clientEmail ?? '',
						clientAddress: invoice.clientAddress ?? '',
						clientPhone: invoice.clientPhone ?? '',
						issueDate: formatDateInput(invoice.issueDate),
						dueDate: formatDateInput(invoice.dueDate),
						taxRate: invoice.taxRate ?? undefined,
						notes: invoice.notes ?? '',
						lineItems: invoice.lineItems.map((li) => ({
							description: li.description,
							quantity: li.quantity,
							unitPrice: li.unitPrice,
						})),
					}
				: {
						clientName: '',
						clientEmail: '',
						clientAddress: '',
						clientPhone: '',
						issueDate: new Date().toISOString().slice(0, 10),
						dueDate: '',
						taxRate: undefined,
						notes: '',
						lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
					},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'lineItems',
	});

	// eslint-disable-next-line react-hooks/incompatible-library -- react-hook-form watch() is not memoizable but works correctly here
	const watchedLineItems = form.watch('lineItems');
	const watchedTaxRate = form.watch('taxRate');

	const subtotal = watchedLineItems.reduce((sum, item) => {
		const qty = Number(item.quantity) || 0;
		const price = Number(item.unitPrice) || 0;
		return sum + qty * price;
	}, 0);
	const taxRate = Number(watchedTaxRate) || 0;
	const taxAmount = subtotal * (taxRate / 100);
	const total = subtotal + taxAmount;

	function formatAmount(value: number): string {
		return value.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}

	function onSubmit(values: InvoiceFormValues) {
		startTransition(async () => {
			const payload = {
				...values,
				issueDate: new Date(values.issueDate),
				dueDate: new Date(values.dueDate),
				taxRate: values.taxRate ?? undefined,
				lineItems: values.lineItems.map((li) => ({
					description: li.description,
					quantity: Number(li.quantity),
					unitPrice: Number(li.unitPrice),
				})),
			};

			let result;
			if (mode === 'edit' && invoice) {
				result = await updateInvoiceAction({ ...payload, id: invoice.id });
			} else {
				result = await createInvoiceAction(payload);
			}

			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success(mode === 'edit' ? 'Invoice updated' : 'Invoice created');
				router.push('/invoices');
			}
		});
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
				{/* Client Info */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>Client Information</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<FormField
							control={form.control}
							name='clientName'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Client Name *</FormLabel>
									<FormControl>
										<Input placeholder='Acme Corporation' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
							<FormField
								control={form.control}
								name='clientEmail'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												type='email'
												placeholder='billing@acme.com'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='clientPhone'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Phone</FormLabel>
										<FormControl>
											<Input placeholder='+1 (555) 000-0000' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<FormField
							control={form.control}
							name='clientAddress'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Address</FormLabel>
									<FormControl>
										<Textarea
											placeholder='123 Main St, City, State 12345'
											rows={3}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
				</Card>

				{/* Invoice Dates */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>Invoice Dates</CardTitle>
					</CardHeader>
					<CardContent className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
						<FormField
							control={form.control}
							name='issueDate'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Issue Date *</FormLabel>
									<FormControl>
										<Input type='date' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name='dueDate'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Due Date *</FormLabel>
									<FormControl>
										<Input type='date' {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
				</Card>

				{/* Line Items */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>Line Items</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='rounded-md border'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Description</TableHead>
										<TableHead className='w-[100px]'>Qty</TableHead>
										<TableHead className='w-[130px]'>Rate</TableHead>
										<TableHead className='w-[120px]'>Amount</TableHead>
										<TableHead className='w-[50px]'></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{fields.map((field, index) => {
										const qty =
											Number(watchedLineItems[index]?.quantity) || 0;
										const price =
											Number(watchedLineItems[index]?.unitPrice) || 0;
										const lineAmount = qty * price;
										return (
											<TableRow key={field.id}>
												<TableCell>
													<FormField
														control={form.control}
														name={`lineItems.${index}.description`}
														render={({ field: f }) => (
															<FormItem>
																<FormControl>
																	<Input
																		placeholder='Service description'
																		{...f}
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</TableCell>
												<TableCell>
													<FormField
														control={form.control}
														name={`lineItems.${index}.quantity`}
														render={({ field: f }) => (
															<FormItem>
																<FormControl>
																	<Input
																		type='number'
																		min={0}
																		step='any'
																		value={f.value}
																		onChange={(e) =>
																			f.onChange(
																				parseFloat(
																					e.target.value
																				) || 0
																			)
																		}
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</TableCell>
												<TableCell>
													<FormField
														control={form.control}
														name={`lineItems.${index}.unitPrice`}
														render={({ field: f }) => (
															<FormItem>
																<FormControl>
																	<Input
																		type='number'
																		min={0}
																		step='any'
																		placeholder='0.00'
																		value={f.value}
																		onChange={(e) =>
																			f.onChange(
																				parseFloat(
																					e.target.value
																				) || 0
																			)
																		}
																	/>
																</FormControl>
																<FormMessage />
															</FormItem>
														)}
													/>
												</TableCell>
												<TableCell className='text-sm font-medium tabular-nums'>
													{formatAmount(lineAmount)}
												</TableCell>
												<TableCell>
													<Button
														type='button'
														variant='ghost'
														size='icon'
														onClick={() => remove(index)}
														disabled={fields.length === 1}
													>
														<Trash2 className='h-4 w-4 text-muted-foreground' />
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>

						<Button
							type='button'
							variant='outline'
							size='sm'
							onClick={() =>
								append({ description: '', quantity: 1, unitPrice: 0 })
							}
						>
							<Plus className='mr-2 h-4 w-4' />
							Add Line Item
						</Button>

						{/* Totals */}
						<div className='flex justify-end'>
							<div className='w-full max-w-xs space-y-2 rounded-md border p-4'>
								<div className='flex justify-between text-sm'>
									<span className='text-muted-foreground'>Subtotal</span>
									<span className='tabular-nums'>
										{formatAmount(subtotal)}
									</span>
								</div>
								<div className='flex items-center justify-between gap-4 text-sm'>
									<div className='flex items-center gap-2'>
										<span className='text-muted-foreground'>Tax Rate</span>
										<FormField
											control={form.control}
											name='taxRate'
											render={({ field }) => (
												<FormItem>
													<FormControl>
														<Input
															type='number'
															min={0}
															max={100}
															step='any'
															placeholder='0'
															className='h-7 w-16 text-xs'
															value={field.value ?? ''}
															onChange={(e) =>
																field.onChange(
																	e.target.value === ''
																		? undefined
																		: parseFloat(e.target.value)
																)
															}
														/>
													</FormControl>
												</FormItem>
											)}
										/>
										<span className='text-muted-foreground'>%</span>
									</div>
									<span className='tabular-nums'>
										{formatAmount(taxAmount)}
									</span>
								</div>
								<div className='flex justify-between border-t pt-2 font-semibold'>
									<span>Total</span>
									<span className='tabular-nums'>{formatAmount(total)}</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Notes */}
				<Card>
					<CardHeader>
						<CardTitle className='text-base'>Notes</CardTitle>
					</CardHeader>
					<CardContent>
						<FormField
							control={form.control}
							name='notes'
							render={({ field }) => (
								<FormItem>
									<FormLabel>Notes (optional)</FormLabel>
									<FormControl>
										<Textarea
											placeholder='Payment terms, bank details, or any other notes...'
											rows={4}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</CardContent>
				</Card>

				<div className='flex gap-3'>
					<Button
						type='button'
						variant='outline'
						onClick={() => router.push('/invoices')}
					>
						Cancel
					</Button>
					<Button type='submit' disabled={isPending}>
						{isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
						{mode === 'edit' ? 'Save Changes' : 'Create Invoice'}
					</Button>
				</div>
			</form>
		</Form>
	);
}
