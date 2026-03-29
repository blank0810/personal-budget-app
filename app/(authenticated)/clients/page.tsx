import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { requireFeature } from '@/lib/feature-gate';
import { ClientService } from '@/server/modules/client/client.service';
import { ClientList } from '@/components/modules/client/ClientList';
import { ClientFormTrigger } from '@/components/modules/client/ClientFormTrigger';
import { serialize } from '@/lib/serialization';
import type { ClientListProps } from '@/components/modules/client/ClientList';

export default async function ClientsPage() {
	await requireFeature('invoices');
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const clients = await ClientService.getAll(session.user.id);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Clients
				</h1>
				<ClientFormTrigger />
			</div>

			<ClientList
				clients={
					serialize(clients) as unknown as ClientListProps['clients']
				}
			/>
		</div>
	);
}
