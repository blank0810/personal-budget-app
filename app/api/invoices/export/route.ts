import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { invoicesToCsv } from '@/lib/invoice-csv';
import { InvoiceService } from '@/server/modules/invoice/invoice.service';
import { exportInvoicesSchema } from '@/server/modules/invoice/invoice.types';

export async function GET(request: NextRequest) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const parsed = exportInvoicesSchema.safeParse(
		Object.fromEntries(request.nextUrl.searchParams)
	);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? 'Invalid export request' },
			{ status: 400 }
		);
	}

	const rows = await InvoiceService.getForExport(session.user.id, parsed.data);
	const csv = invoicesToCsv(rows);
	const filename = [
		'invoices',
		parsed.data.payment.toLowerCase(),
		parsed.data.from.toISOString().slice(0, 10),
		parsed.data.to.toISOString().slice(0, 10),
	].join('_');

	return new NextResponse(`\uFEFF${csv}`, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}.csv"`,
		},
	});
}
