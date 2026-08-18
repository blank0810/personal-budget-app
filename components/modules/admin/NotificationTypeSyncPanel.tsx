'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, BellRing, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adminSyncNotificationTypesAction } from '@/server/modules/email/email.controller';

/**
 * Surfaces a drift the app cannot otherwise show: notification types live in code
 * but users toggle database rows, and the two only converge on the daily
 * scheduler tick. Right after a deploy that adds a type, the preferences UI is
 * silently missing it — with no way to tell that from "working correctly".
 */
export function NotificationTypeSyncPanel({
	inDatabase,
	inRegistry,
}: {
	inDatabase: number;
	inRegistry: number;
}) {
	const [dbCount, setDbCount] = useState(inDatabase);
	const [isPending, startTransition] = useTransition();

	const drifted = dbCount !== inRegistry;

	function handleSync() {
		startTransition(async () => {
			const result = await adminSyncNotificationTypesAction();

			if ('error' in result) {
				toast.error('Sync failed', { description: result.error });
				return;
			}

			setDbCount(result.data?.synced ?? dbCount);
			toast.success(`${result.data?.synced} notification types synced`, {
				description:
					result.data?.preserved
						? `${result.data.preserved} existing opt-ins preserved before a default changed.`
						: 'Already up to date — nothing changed.',
			});
		});
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<BellRing className='h-4 w-4' />
					Notification Types
					{drifted ? (
						<Badge variant='destructive'>Out of sync</Badge>
					) : (
						<Badge variant='default'>In sync</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className='space-y-4'>
				{drifted && (
					<Alert variant='destructive'>
						<AlertTriangle className='h-4 w-4' />
						<AlertDescription>
							The code defines {inRegistry} notification types but the
							database has {dbCount}. Users cannot see or toggle the
							missing ones until this is synced.
						</AlertDescription>
					</Alert>
				)}

				<div className='flex items-center justify-between text-sm'>
					<span className='text-muted-foreground'>In database</span>
					<span className='font-medium'>
						{dbCount} / {inRegistry}
					</span>
				</div>

				<p className='text-xs text-muted-foreground'>
					Syncs automatically on the daily scheduler run. Use this after a
					deploy that adds a type, rather than triggering the whole cron —
					this touches nothing else.
				</p>

				<Button
					variant={drifted ? 'default' : 'secondary'}
					onClick={handleSync}
					disabled={isPending}
				>
					{isPending ? (
						<Loader2 className='h-4 w-4 animate-spin' />
					) : (
						<RefreshCw className='h-4 w-4' />
					)}
					Sync now
				</Button>
			</CardContent>
		</Card>
	);
}
