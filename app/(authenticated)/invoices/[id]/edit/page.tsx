import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { InvoiceForm } from '@/components/modules/invoice/InvoiceForm';
import type { ExistingInvoice } from '@/components/modules/invoice/InvoiceForm';
import { Button } from '@/components/ui/button';
import { serialize } from '@/lib/serialization';
import { ArrowLeft } from 'lucide-react';

interface EditInvoicePageProps {
	params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({
	params,
}: EditInvoicePageProps) {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const { id } = await params;

	const invoice = await InvoiceService.getById(session.user.id, id);

	if (!invoice) notFound();

	// Only DRAFT invoices can be edited
	if (invoice.status !== 'DRAFT') {
		redirect(`/invoices/${id}`);
	}

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<div className='flex items-center gap-4'>
				<Button variant='ghost' size='sm' asChild>
					<Link href={`/invoices/${id}`}>
						<ArrowLeft className='mr-2 h-4 w-4' />
						Back to Invoice
					</Link>
				</Button>
			</div>

			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				Edit Invoice
			</h1>

			<div className='max-w-3xl'>
				<InvoiceForm
					mode='edit'
					invoice={serialize(invoice) as unknown as ExistingInvoice}
				/>
			</div>
		</div>
	);
}
