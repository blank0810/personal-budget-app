import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { renderInvoicePDF } from '@/server/modules/invoice/invoice.templates';
import { UserService } from '@/server/modules/user/user.service';

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id } = await params;

	try {
		const invoice = await InvoiceService.getById(session.user.id, id);

		if (!invoice) {
			return NextResponse.json(
				{ error: 'Invoice not found' },
				{ status: 404 }
			);
		}

		// Use the invoice's own currency, falling back to user's currency
		let currency = invoice.currency;
		if (!currency) {
			currency = await UserService.getCurrency(session.user.id);
		}

		// Convert Decimals to numbers for the template
		const pdfData = {
			...invoice,
			userName: invoice.user?.name ?? null,
			userEmail: invoice.user?.email ?? null,
			subtotal: Number(invoice.subtotal),
			taxRate: invoice.taxRate ? Number(invoice.taxRate) : null,
			taxAmount: Number(invoice.taxAmount),
			totalAmount: Number(invoice.totalAmount),
			lineItems: invoice.lineItems.map((li) => ({
				...li,
				quantity: Number(li.quantity),
				unitPrice: Number(li.unitPrice),
				amount: Number(li.amount),
			})),
		};

		const pdfBuffer = await renderInvoicePDF(pdfData, currency);

		return new NextResponse(new Uint8Array(pdfBuffer), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
			},
		});
	} catch {
		return NextResponse.json(
			{ error: 'Invoice not found' },
			{ status: 404 }
		);
	}
}
