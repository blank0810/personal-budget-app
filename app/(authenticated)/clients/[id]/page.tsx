import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { ClientService } from '@/server/modules/client/client.service';
import { WorkEntryService } from '@/server/modules/work-entry/work-entry.service';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { ClientDetail } from '@/components/modules/client/ClientDetail';
import { serialize } from '@/lib/serialization';
import type { ClientDetailProps } from '@/components/modules/client/ClientDetail';

interface ClientDetailPageProps {
	params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({
	params,
}: ClientDetailPageProps) {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const { id } = await params;

	const [client, entries, invoices] = await Promise.all([
		ClientService.getById(session.user.id, id),
		WorkEntryService.getByClient(session.user.id, id),
		InvoiceService.getAll(session.user.id, { clientId: id }),
	]);

	if (!client) notFound();

	return (
		<div className='container mx-auto py-6 md:py-10'>
			<ClientDetail
				client={serialize(client) as unknown as ClientDetailProps['client']}
				entries={serialize(entries) as unknown as ClientDetailProps['entries']}
				invoices={serialize(invoices) as unknown as ClientDetailProps['invoices']}
			/>
		</div>
	);
}
