'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { createWorkEntryAction } from '@/server/modules/work-entry/work-entry.controller';

interface ClientOption {
	id: string;
	name: string;
	defaultRate: number | null;
}

interface WorkEntryFormProps {
	clients: ClientOption[];
	defaultClientId?: string;
}

function getTodayString(): string {
	return new Date().toISOString().slice(0, 10);
}

interface FormState {
	clientId: string;
	date: string;
	description: string;
	quantity: string;
	unitPrice: string;
}

function getInitialState(
	defaultClientId: string | undefined,
	clients: ClientOption[]
): FormState {
	const client = clients.find((c) => c.id === defaultClientId);
	return {
		clientId: defaultClientId ?? '',
		date: getTodayString(),
		description: '',
		quantity: '1',
		unitPrice: client?.defaultRate != null ? String(client.defaultRate) : '',
	};
}

interface EntryFieldsProps {
	clients: ClientOption[];
	form: FormState;
	onChange: (field: keyof FormState, value: string) => void;
	onClientChange: (clientId: string) => void;
	isPending: boolean;
	onSubmit: (e: React.FormEvent) => void;
	layout?: 'inline' | 'stacked';
}

function EntryFields({
	clients,
	form,
	onChange,
	onClientChange,
	isPending,
	onSubmit,
	layout = 'inline',
}: EntryFieldsProps) {
	if (layout === 'stacked') {
		return (
			<form onSubmit={onSubmit} className='space-y-4 p-4'>
				<div className='space-y-1.5'>
					<Label htmlFor='mobile-client'>Client</Label>
					<Select
						value={form.clientId}
						onValueChange={onClientChange}
					>
						<SelectTrigger id='mobile-client' className='w-full'>
							<SelectValue placeholder='Select client...' />
						</SelectTrigger>
						<SelectContent>
							{clients.map((c) => (
								<SelectItem key={c.id} value={c.id}>
									{c.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className='space-y-1.5'>
					<Label htmlFor='mobile-date'>Date</Label>
					<Input
						id='mobile-date'
						type='date'
						value={form.date}
						onChange={(e) => onChange('date', e.target.value)}
						required
					/>
				</div>

				<div className='space-y-1.5'>
					<Label htmlFor='mobile-description'>Description</Label>
					<Input
						id='mobile-description'
						placeholder='What did you work on?'
						value={form.description}
						onChange={(e) => onChange('description', e.target.value)}
						required
					/>
				</div>

				<div className='grid grid-cols-2 gap-3'>
					<div className='space-y-1.5'>
						<Label htmlFor='mobile-quantity'>Hours / Qty</Label>
						<Input
							id='mobile-quantity'
							type='number'
							min='0.01'
							step='any'
							placeholder='1'
							value={form.quantity}
							onChange={(e) => onChange('quantity', e.target.value)}
							required
						/>
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='mobile-unitPrice'>Rate</Label>
						<Input
							id='mobile-unitPrice'
							type='number'
							min='0'
							step='any'
							placeholder='0.00'
							value={form.unitPrice}
							onChange={(e) => onChange('unitPrice', e.target.value)}
							required
						/>
					</div>
				</div>

				<Button type='submit' className='w-full' disabled={isPending}>
					{isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
					Add Entry
				</Button>
			</form>
		);
	}

	return (
		<form onSubmit={onSubmit} className='flex items-end gap-2'>
			<div className='space-y-1.5 min-w-[160px]'>
				<Label htmlFor='desktop-client' className='text-xs'>
					Client
				</Label>
				<Select value={form.clientId} onValueChange={onClientChange}>
					<SelectTrigger id='desktop-client' className='w-full'>
						<SelectValue placeholder='Select client...' />
					</SelectTrigger>
					<SelectContent>
						{clients.map((c) => (
							<SelectItem key={c.id} value={c.id}>
								{c.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className='space-y-1.5'>
				<Label htmlFor='desktop-date' className='text-xs'>
					Date
				</Label>
				<Input
					id='desktop-date'
					type='date'
					value={form.date}
					onChange={(e) => onChange('date', e.target.value)}
					className='w-[140px]'
					required
				/>
			</div>

			<div className='space-y-1.5 flex-1 min-w-[160px]'>
				<Label htmlFor='desktop-description' className='text-xs'>
					Description
				</Label>
				<Input
					id='desktop-description'
					placeholder='What did you work on?'
					value={form.description}
					onChange={(e) => onChange('description', e.target.value)}
					required
				/>
			</div>

			<div className='space-y-1.5'>
				<Label htmlFor='desktop-quantity' className='text-xs'>
					Hours / Qty
				</Label>
				<Input
					id='desktop-quantity'
					type='number'
					min='0.01'
					step='any'
					placeholder='1'
					value={form.quantity}
					onChange={(e) => onChange('quantity', e.target.value)}
					className='w-[70px]'
					required
				/>
			</div>

			<div className='space-y-1.5'>
				<Label htmlFor='desktop-unitPrice' className='text-xs'>
					Rate
				</Label>
				<Input
					id='desktop-unitPrice'
					type='number'
					min='0'
					step='any'
					placeholder='0.00'
					value={form.unitPrice}
					onChange={(e) => onChange('unitPrice', e.target.value)}
					className='w-[100px]'
					required
				/>
			</div>

			<Button type='submit' disabled={isPending}>
				{isPending ? (
					<Loader2 className='h-4 w-4 animate-spin' />
				) : (
					<Plus className='h-4 w-4' />
				)}
				<span className='ml-1'>Add</span>
			</Button>
		</form>
	);
}

export function WorkEntryForm({ clients, defaultClientId }: WorkEntryFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [form, setForm] = useState<FormState>(() =>
		getInitialState(defaultClientId, clients)
	);

	function handleChange(field: keyof FormState, value: string) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	function handleClientChange(clientId: string) {
		const client = clients.find((c) => c.id === clientId);
		setForm((prev) => ({
			...prev,
			clientId,
			unitPrice:
				client?.defaultRate != null ? String(client.defaultRate) : prev.unitPrice,
		}));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const quantity = parseFloat(form.quantity);
		const unitPrice = parseFloat(form.unitPrice);

		if (!form.clientId || !form.description || isNaN(quantity) || isNaN(unitPrice)) {
			toast.error('Please fill in all required fields');
			return;
		}

		startTransition(async () => {
			const result = await createWorkEntryAction({
				clientId: form.clientId,
				description: form.description,
				date: new Date(form.date),
				quantity,
				unitPrice,
			});

			if (result?.error) {
				toast.error(result.error);
			} else {
				toast.success('Entry added');
				setForm(getInitialState(defaultClientId, clients));
				setSheetOpen(false);
				router.refresh();
			}
		});
	}

	return (
		<>
			{/* Desktop inline form */}
			<div className='hidden md:block rounded-lg border bg-card p-4'>
				<EntryFields
					clients={clients}
					form={form}
					onChange={handleChange}
					onClientChange={handleClientChange}
					isPending={isPending}
					onSubmit={handleSubmit}
					layout='inline'
				/>
			</div>

			{/* Mobile: fixed bottom button + Sheet */}
			<div className='md:hidden'>
				<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
					<SheetTrigger asChild>
						<Button
							size='lg'
							className='fixed bottom-6 right-6 z-50 shadow-lg rounded-full h-14 w-14 p-0'
						>
							<Plus className='h-6 w-6' />
							<span className='sr-only'>Add Entry</span>
						</Button>
					</SheetTrigger>
					<SheetContent side='bottom' className='rounded-t-2xl'>
						<SheetHeader className='px-4 pt-4 pb-0'>
							<SheetTitle>Add Entry</SheetTitle>
						</SheetHeader>
						<EntryFields
							clients={clients}
							form={form}
							onChange={handleChange}
							onClientChange={handleClientChange}
							isPending={isPending}
							onSubmit={handleSubmit}
							layout='stacked'
						/>
					</SheetContent>
				</Sheet>
			</div>
		</>
	);
}
