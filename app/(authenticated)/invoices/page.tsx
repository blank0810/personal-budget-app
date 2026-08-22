import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { requireFeature } from '@/lib/feature-gate';
import Link from 'next/link';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { ClientService } from '@/server/modules/client/client.service';
import { InvoiceExportDialog } from '@/components/modules/invoice/InvoiceExportDialog';
import { InvoiceSummaryCards } from '@/components/modules/invoice/InvoiceSummaryCards';
import { InvoiceList } from '@/components/modules/invoice/InvoiceList';
import { Button } from '@/components/ui/button';
import { serialize } from '@/lib/serialization';
import { Plus } from 'lucide-react';
import type { InvoiceRow } from '@/components/modules/invoice/InvoiceList';
import type { InvoiceSummary } from '@/server/modules/invoice/invoice.types';

export default async function InvoicesPage() {
	await requireFeature('invoices');
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const [invoices, summary, clients] = await Promise.all([
		InvoiceService.getAll(session.user.id),
		InvoiceService.getSummary(session.user.id),
		ClientService.getAll(session.user.id),
	]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Invoices
				</h1>
				<div className='flex items-center gap-2'>
					<InvoiceExportDialog
						clients={serialize(
							clients.map(({ id, name }) => ({ id, name }))
						)}
					/>
					<Button asChild>
						<Link href='/invoices/new'>
							<Plus className='mr-2 h-4 w-4' />
							New Invoice
						</Link>
					</Button>
				</div>
			</div>

			<InvoiceSummaryCards
				summary={serialize(summary) as unknown as InvoiceSummary}
			/>

			<InvoiceList
				invoices={serialize(invoices) as unknown as InvoiceRow[]}
			/>
		</div>
	);
}
