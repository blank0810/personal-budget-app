import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { InvoiceDetail } from '@/components/modules/invoice/InvoiceDetail';
import type { InvoiceWithDetails } from '@/components/modules/invoice/InvoiceDetail';
import { serialize } from '@/lib/serialization';

interface InvoiceDetailPageProps {
	params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({
	params,
}: InvoiceDetailPageProps) {
	const session = await auth();
	if (!session?.user?.id) redirect('/login');

	const { id } = await params;

	const invoice = await InvoiceService.getById(session.user.id, id);

	if (!invoice) notFound();

	return (
		<div className='container mx-auto py-6 md:py-10'>
			<InvoiceDetail
				invoice={serialize(invoice) as unknown as InvoiceWithDetails}
			/>
		</div>
	);
}
