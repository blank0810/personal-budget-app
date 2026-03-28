'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Archive, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientForm } from './ClientForm';
import { archiveClientAction } from '@/server/modules/client/client.controller';
import { formatCurrency } from '@/lib/formatters';
import { useServerAction } from '@/hooks/use-server-action';

interface ClientWithUnbilled {
	id: string;
	name: string;
	email: string | null;
	phone: string | null;
	address: string | null;
	defaultRate: number | null;
	currency: string;
	notes: string | null;
	isArchived: boolean;
	unbilled: {
		count: number;
		total: number;
	};
}

export interface ClientListProps {
	clients: ClientWithUnbilled[];
}

function ClientCard({ client }: { client: ClientWithUnbilled }) {
	const router = useRouter();
	const [editOpen, setEditOpen] = useState(false);
	const { execute: archiveClient, isPending } = useServerAction(archiveClientAction, {
		successMessage: 'Client archived',
		onSuccess: () => router.refresh(),
	});

	return (
		<>
			<Card className='flex flex-col hover:shadow-md transition-shadow'>
				<CardHeader className='pb-3'>
					<div className='flex items-start justify-between gap-2'>
						<CardTitle className='text-base leading-tight'>
							<Link
								href={`/clients/${client.id}`}
								className='hover:underline'
							>
								{client.name}
							</Link>
						</CardTitle>
						<div className='flex gap-1 shrink-0'>
							<Button
								variant='ghost'
								size='icon'
								className='h-8 w-8'
								onClick={() => setEditOpen(true)}
								title='Edit client'
							>
								<Pencil className='h-4 w-4' />
								<span className='sr-only'>Edit</span>
							</Button>
							<Button
								variant='ghost'
								size='icon'
								className='h-8 w-8 text-muted-foreground hover:text-destructive'
								onClick={() => archiveClient(client.id)}
								disabled={isPending}
								title='Archive client'
							>
								<Archive className='h-4 w-4' />
								<span className='sr-only'>Archive</span>
							</Button>
						</div>
					</div>
					{client.email && (
						<p className='text-sm text-muted-foreground truncate'>
							{client.email}
						</p>
					)}
				</CardHeader>

				<CardContent className='pt-0 mt-auto'>
					<dl className='grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
						<div>
							<dt className='text-muted-foreground'>Default Billing Rate</dt>
							<dd className='font-medium'>
								{client.defaultRate != null
									? formatCurrency(client.defaultRate, { currency: client.currency })
									: <span className='text-muted-foreground'>—</span>}
							</dd>
						</div>
						<div>
							<dt className='text-muted-foreground'>Unbilled</dt>
							<dd className='font-medium'>
								{client.unbilled.count > 0 ? (
									<span className='text-orange-600 dark:text-orange-400'>
										{client.unbilled.count} ({formatCurrency(client.unbilled.total, { currency: client.currency })})
									</span>
								) : (
									<span className='text-muted-foreground'>None</span>
								)}
							</dd>
						</div>
					</dl>
				</CardContent>
			</Card>

			<ClientForm
				mode='edit'
				client={client}
				open={editOpen}
				onOpenChange={setEditOpen}
			/>
		</>
	);
}

export function ClientList({ clients }: ClientListProps) {
	if (clients.length === 0) {
		return (
			<div className='rounded-lg border border-dashed p-12 text-center'>
				<Users className='mx-auto h-10 w-10 text-muted-foreground mb-4' />
				<h3 className='text-sm font-medium mb-1'>No clients yet</h3>
				<p className='text-sm text-muted-foreground'>
					Add your first client to start tracking billable work.
				</p>
			</div>
		);
	}

	return (
		<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
			{clients.map((client) => (
				<ClientCard key={client.id} client={client} />
			))}
		</div>
	);
}
