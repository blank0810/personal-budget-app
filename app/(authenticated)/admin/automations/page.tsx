import { AutomationsTable } from '@/components/modules/admin/AutomationsTable';
import { getSchedulesAction } from '@/server/modules/automation/automation.controller';

export default async function AdminAutomationsPage() {
	const result = await getSchedulesAction();

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<div className='space-y-1'>
				<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
					Automations
				</h1>
				<p className='text-sm text-muted-foreground'>
					Control the system-wide cadence for background jobs. Changes
					take effect on the next hourly scheduler tick.
				</p>
			</div>

			{'error' in result ? (
				<div className='rounded border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
					{result.error}
				</div>
			) : (
				<AutomationsTable initialSchedules={result.data.schedules} />
			)}
		</div>
	);
}
