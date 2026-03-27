import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { InvoiceSummaryCards } from '@/components/modules/invoice/InvoiceSummaryCards';
import { InvoiceList } from '@/components/modules/invoice/InvoiceList';
import { Button } from '@/components/ui/button';
import { serialize } from '@/lib/serialization';
import { Plus } from 'lucide-react';
import type { InvoiceRow } from '@/components/modules/invoice/InvoiceList';
import type { InvoiceSummaryData } from '@/components/modules/invoice/InvoiceSummaryCards';

export default async function InvoicesPage() {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const [invoices, summary] = await Promise.all([
		InvoiceService.getAll(session.user.id),
		InvoiceService.getSummary(session.user.id),
	]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-8'>
			<div className='flex justify-between items-center'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Invoices
				</h1>
				<Button asChild>
					<Link href='/invoices/new'>
						<Plus className='mr-2 h-4 w-4' />
						New Invoice
					</Link>
				</Button>
			</div>

			<InvoiceSummaryCards
				summary={serialize(summary) as unknown as InvoiceSummaryData}
			/>

			<InvoiceList
				invoices={serialize(invoices) as unknown as InvoiceRow[]}
			/>
		</div>
	);
}
