'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	createClientSchema,
	updateClientSchema,
	type CreateClientInput,
	type UpdateClientInput,
} from '@/server/modules/client/client.types';
import {
	createClientAction,
	updateClientAction,
} from '@/server/modules/client/client.controller';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import { useCurrency } from '@/lib/contexts/currency-context';

export interface ClientData {
	id: string;
	name: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	defaultRate?: number | null;
	currency?: string | null;
	notes?: string | null;
}

interface ClientFormProps {
	mode: 'create' | 'edit';
	client?: ClientData;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function CreateClientForm({
	onOpenChange,
}: {
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const { currency: userCurrency } = useCurrency();
	const [isPending, startTransition] = useTransition();

	const form = useForm<CreateClientInput>({
		resolver: zodResolver(createClientSchema),
		defaultValues: {
			name: '',
			email: '',
			phone: '',
			address: '',
			defaultRate: undefined,
			currency: userCurrency || 'USD',
			notes: '',
		},
	});

	function onSubmit(data: CreateClientInput) {
		startTransition(async () => {
			const result = await createClientAction(data);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Client created');
				form.reset();
				onOpenChange(false);
				router.refresh();
			}
		});
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
				<FormField
					control={form.control}
					name='name'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input placeholder='Acme Corp' {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className='grid grid-cols-2 gap-4'>
					<FormField
						control={form.control}
						name='email'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input
										type='email'
										placeholder='client@example.com'
										{...field}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='phone'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Phone</FormLabel>
								<FormControl>
									<Input
										placeholder='+1 555 0100'
										{...field}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name='address'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Address</FormLabel>
							<FormControl>
								<Textarea
									placeholder='123 Main St, City, State'
									rows={2}
									{...field}
									value={field.value ?? ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='defaultRate'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Default Billing Rate</FormLabel>
							<FormControl>
								<Input
									type='number'
									min='0'
									step='any'
									placeholder='0.00'
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
							<FormDescription>
								Auto-fills the Rate when logging entries for this client. Leave blank to enter manually.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='currency'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Billing Currency</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value ?? userCurrency ?? 'USD'}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select currency' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{SUPPORTED_CURRENCIES.map((c) => (
										<SelectItem key={c.code} value={c.code}>
											{c.code} - {c.name} ({c.symbol})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormDescription>
								Currency used for invoices and entries for this client.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='notes'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Notes</FormLabel>
							<FormControl>
								<Textarea
									placeholder='Any additional notes...'
									rows={3}
									{...field}
									value={field.value ?? ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className='flex justify-end gap-3 pt-2'>
					<Button
						type='button'
						variant='outline'
						onClick={() => {
							form.reset();
							onOpenChange(false);
						}}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button type='submit' disabled={isPending}>
						{isPending && (
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						)}
						Create Client
					</Button>
				</div>
			</form>
		</Form>
	);
}

function EditClientForm({
	client,
	onOpenChange,
}: {
	client: ClientData;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const { currency: userCurrency } = useCurrency();
	const [isPending, startTransition] = useTransition();

	const form = useForm<UpdateClientInput>({
		resolver: zodResolver(updateClientSchema),
		defaultValues: {
			id: client.id,
			name: client.name,
			email: client.email ?? '',
			phone: client.phone ?? '',
			address: client.address ?? '',
			defaultRate: client.defaultRate ?? undefined,
			currency: client.currency ?? userCurrency ?? 'USD',
			notes: client.notes ?? '',
		},
	});

	function onSubmit(data: UpdateClientInput) {
		startTransition(async () => {
			const result = await updateClientAction(data);
			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Client updated');
				onOpenChange(false);
				router.refresh();
			}
		});
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
				<FormField
					control={form.control}
					name='name'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Name</FormLabel>
							<FormControl>
								<Input placeholder='Acme Corp' {...field} value={field.value ?? ''} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className='grid grid-cols-2 gap-4'>
					<FormField
						control={form.control}
						name='email'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input
										type='email'
										placeholder='client@example.com'
										{...field}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='phone'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Phone</FormLabel>
								<FormControl>
									<Input
										placeholder='+1 555 0100'
										{...field}
										value={field.value ?? ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<FormField
					control={form.control}
					name='address'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Address</FormLabel>
							<FormControl>
								<Textarea
									placeholder='123 Main St, City, State'
									rows={2}
									{...field}
									value={field.value ?? ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='defaultRate'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Default Billing Rate</FormLabel>
							<FormControl>
								<Input
									type='number'
									min='0'
									step='any'
									placeholder='0.00'
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
							<FormDescription>
								Auto-fills the Rate when logging entries for this client. Leave blank to enter manually.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='currency'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Billing Currency</FormLabel>
							<Select
								onValueChange={field.onChange}
								value={field.value ?? client.currency ?? userCurrency ?? 'USD'}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder='Select currency' />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{SUPPORTED_CURRENCIES.map((c) => (
										<SelectItem key={c.code} value={c.code}>
											{c.code} - {c.name} ({c.symbol})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormDescription>
								Currency used for invoices and entries for this client.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name='notes'
					render={({ field }) => (
						<FormItem>
							<FormLabel>Notes</FormLabel>
							<FormControl>
								<Textarea
									placeholder='Any additional notes...'
									rows={3}
									{...field}
									value={field.value ?? ''}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className='flex justify-end gap-3 pt-2'>
					<Button
						type='button'
						variant='outline'
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button type='submit' disabled={isPending}>
						{isPending && (
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						)}
						Save Changes
					</Button>
				</div>
			</form>
		</Form>
	);
}

export function ClientForm({
	mode,
	client,
	open,
	onOpenChange,
}: ClientFormProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-[480px]'>
				<DialogHeader>
					<DialogTitle>
						{mode === 'create' ? 'Add Client' : 'Edit Client'}
					</DialogTitle>
				</DialogHeader>

				{mode === 'create' ? (
					<CreateClientForm onOpenChange={onOpenChange} />
				) : client ? (
					<EditClientForm client={client} onOpenChange={onOpenChange} />
				) : null}
			</DialogContent>
		</Dialog>
	);
}
