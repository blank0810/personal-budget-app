import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { InvoiceDetail } from '@/components/modules/invoice/InvoiceDetail';
import type { InvoiceWithDetails } from '@/components/modules/invoice/InvoiceDetail';
import { serialize } from '@/lib/serialization';
import { urlToQrDataUri } from '@/lib/qr';

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

	const serialized = serialize(invoice) as Record<string, unknown>;

	// Hoist user name/email from the nested relation to top-level fields
	const user = serialized.user as { name?: string | null; email?: string | null } | null | undefined;
	const invoiceWithDetails: InvoiceWithDetails = {
		...(serialized as unknown as InvoiceWithDetails),
		userName: user?.name ?? null,
		userEmail: user?.email ?? null,
	};

	// Build a single QR from the invoice's own payment link
	const paymentQr = await urlToQrDataUri(invoice.paymentLink);

	return (
		<div className='container mx-auto py-6 md:py-10'>
			<InvoiceDetail invoice={invoiceWithDetails} paymentQr={paymentQr} />
		</div>
	);
}
