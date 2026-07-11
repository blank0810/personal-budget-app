import { NextRequest, NextResponse } from 'next/server';
import { AutomationService } from '@/server/modules/automation/automation.service';

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const results = await AutomationService.runDue(new Date());
		return NextResponse.json({ results });
	} catch (error) {
		console.error('Automation scheduler failed:', error);
		return NextResponse.json(
			{ error: 'Scheduler failed' },
			{ status: 500 }
		);
	}
}
