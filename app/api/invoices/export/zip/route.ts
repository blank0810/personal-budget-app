import { tasks } from '@trigger.dev/sdk';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { exportInvoicesSchema } from '@/server/modules/invoice/invoice.types';
import type { invoiceExportTask } from '@/trigger/invoice-export';

export async function POST(request: NextRequest) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: 'Invalid export request' },
			{ status: 400 }
		);
	}

	const parsed = exportInvoicesSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.issues[0]?.message ?? 'Invalid export request' },
			{ status: 400 }
		);
	}

	const handle = await tasks.trigger<typeof invoiceExportTask>(
		'invoice-export',
		{
			userId: session.user.id,
			...parsed.data,
			from: parsed.data.from.toISOString(),
			to: parsed.data.to.toISOString(),
		}
	);

	return NextResponse.json({
		runId: handle.id,
		publicAccessToken: handle.publicAccessToken,
	});
}
