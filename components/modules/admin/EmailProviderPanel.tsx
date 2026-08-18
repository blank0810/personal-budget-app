'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	AlertTriangle,
	CheckCircle2,
	Loader2,
	Mail,
	Save,
	Send,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
	adminSendTestEmailAction,
	adminUpdateEmailConfigAction,
} from '@/server/modules/email/email.controller';

interface ProviderRow {
	provider: string;
	isActive: boolean;
	fromEmail: string;
	fromName: string;
	replyToEmail: string | null;
	hasCredential: boolean;
	lastVerifiedAt: string | Date | null;
	lastError: string | null;
}

interface QuotaStatus {
	sentToday: number;
	dailyLimit: number;
	remaining: number;
	normalSuppressed: boolean;
	reserveForPriority: number;
}

interface EmailProviderPanelProps {
	configured: boolean;
	providers: ProviderRow[];
	quota: QuotaStatus;
	availableProviders: ReadonlyArray<{ key: string; label: string }>;
}

export function EmailProviderPanel({
	configured,
	providers,
	quota,
	availableProviders,
}: EmailProviderPanelProps) {
	const active = providers.find((p) => p.isActive) ?? providers[0] ?? null;

	const [provider, setProvider] = useState(
		active?.provider ?? availableProviders[0]?.key ?? 'RESEND'
	);
	const [fromEmail, setFromEmail] = useState(active?.fromEmail ?? '');
	const [fromName, setFromName] = useState(
		active?.fromName ?? 'Budget Planner'
	);
	const [replyToEmail, setReplyToEmail] = useState(active?.replyToEmail ?? '');
	const [apiKey, setApiKey] = useState('');
	const [testTo, setTestTo] = useState('');
	const [isSaving, startSaving] = useTransition();
	const [isTesting, startTesting] = useTransition();

	const current = providers.find((p) => p.provider === provider) ?? null;
	const hasStoredKey = current?.hasCredential ?? false;

	function handleSave() {
		startSaving(async () => {
			const result = await adminUpdateEmailConfigAction({
				provider,
				fromEmail,
				fromName,
				replyToEmail,
				apiKey,
			});

			if ('error' in result) {
				toast.error(result.error);
				return;
			}

			// Clear the field so a stored key is never left in the DOM.
			setApiKey('');

			if (result.data?.verified) {
				toast.success('Saved and verified', {
					description: result.data.message,
				});
			} else {
				toast.warning('Saved, but verification failed', {
					description: result.data?.message,
				});
			}
		});
	}

	function handleTest() {
		startTesting(async () => {
			const result = await adminSendTestEmailAction({ to: testTo });

			if ('error' in result) {
				toast.error('Test email failed', { description: result.error });
				return;
			}

			toast.success(`Test email sent to ${result.data?.sentTo}`);
		});
	}

	const canSave =
		fromEmail.trim() !== '' &&
		fromName.trim() !== '' &&
		(hasStoredKey || apiKey.trim() !== '');

	const quotaPercent =
		quota.dailyLimit > 0
			? Math.min(100, (quota.sentToday / quota.dailyLimit) * 100)
			: 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Mail className='h-4 w-4' />
					Email Provider
					{configured ? (
						<Badge variant='default'>Configured</Badge>
					) : (
						<Badge variant='destructive'>Not configured</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className='space-y-6'>
				{!configured && (
					<Alert variant='destructive'>
						<AlertTriangle className='h-4 w-4' />
						<AlertDescription>
							No provider is active, so no email is being delivered —
							password resets, invoices, and reports will all fail. Add a
							credential below to enable delivery.
						</AlertDescription>
					</Alert>
				)}

				{current?.lastError && (
					<Alert variant='destructive'>
						<AlertTriangle className='h-4 w-4' />
						<AlertDescription>
							Last error: {current.lastError}
						</AlertDescription>
					</Alert>
				)}

				{current?.lastVerifiedAt && !current.lastError && (
					<p className='flex items-center gap-2 text-sm text-muted-foreground'>
						<CheckCircle2 className='h-4 w-4 text-emerald-600' />
						Verified{' '}
						{formatDistanceToNow(new Date(current.lastVerifiedAt), {
							addSuffix: true,
						})}
					</p>
				)}

				<div className='grid gap-4 sm:grid-cols-2'>
					<div className='space-y-2'>
						<Label htmlFor='email-provider'>Provider</Label>
						<Select value={provider} onValueChange={setProvider}>
							<SelectTrigger id='email-provider'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{availableProviders.map((p) => (
									<SelectItem key={p.key} value={p.key}>
										{p.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='email-api-key'>API key</Label>
						<Input
							id='email-api-key'
							type='password'
							autoComplete='off'
							value={apiKey}
							onChange={(e) => setApiKey(e.target.value)}
							placeholder={
								hasStoredKey
									? 'Stored — leave blank to keep'
									: 're_...'
							}
						/>
						<p className='text-xs text-muted-foreground'>
							Create one at resend.com/api-keys with{' '}
							<strong>Sending access</strong> scoped to your domain — full
							access is not needed. Stored encrypted; never displayed again
							after saving.
						</p>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='email-from'>From address</Label>
						<Input
							id='email-from'
							type='email'
							value={fromEmail}
							onChange={(e) => setFromEmail(e.target.value)}
							placeholder='noreply@budget.umbra.build'
						/>
						<p className='text-xs text-muted-foreground'>
							Must be on a domain verified with the provider.
						</p>
					</div>

					<div className='space-y-2'>
						<Label htmlFor='email-from-name'>From name</Label>
						<Input
							id='email-from-name'
							value={fromName}
							onChange={(e) => setFromName(e.target.value)}
							placeholder='Budget Planner'
						/>
					</div>

					<div className='space-y-2 sm:col-span-2'>
						<Label htmlFor='email-reply-to'>
							Default reply-to{' '}
							<span className='text-muted-foreground'>(optional)</span>
						</Label>
						<Input
							id='email-reply-to'
							type='email'
							value={replyToEmail}
							onChange={(e) => setReplyToEmail(e.target.value)}
							placeholder='Leave blank for no reply-to'
						/>
						<p className='text-xs text-muted-foreground'>
							Invoice emails override this with the sender&apos;s own
							address so client replies reach them directly.
						</p>
					</div>
				</div>

				<div className='flex flex-wrap items-center gap-2'>
					<Button onClick={handleSave} disabled={!canSave || isSaving}>
						{isSaving ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : (
							<Save className='h-4 w-4' />
						)}
						Save &amp; verify
					</Button>
				</div>

				<div className='space-y-3 rounded-lg border p-4'>
					<div className='space-y-1'>
						<p className='text-sm font-medium'>Send a test email</p>
						<p className='text-xs text-muted-foreground'>
							Delivers a real message through the active provider. Blank
							sends to your own account address.
						</p>
					</div>
					<div className='flex flex-col gap-2 sm:flex-row'>
						<Input
							type='email'
							value={testTo}
							onChange={(e) => setTestTo(e.target.value)}
							placeholder='you@example.com'
							className='sm:max-w-xs'
						/>
						<Button
							variant='secondary'
							onClick={handleTest}
							disabled={!configured || isTesting}
						>
							{isTesting ? (
								<Loader2 className='h-4 w-4 animate-spin' />
							) : (
								<Send className='h-4 w-4' />
							)}
							Send test
						</Button>
					</div>
				</div>

				<div className='space-y-2'>
					<div className='flex items-center justify-between text-sm'>
						<span className='font-medium'>Today&apos;s send quota</span>
						<span className='text-muted-foreground'>
							{quota.sentToday} / {quota.dailyLimit}
						</span>
					</div>
					<Progress value={quotaPercent} />
					<p className='text-xs text-muted-foreground'>
						{quota.normalSuppressed
							? `Digests and alerts are being held back — only the ${quota.reserveForPriority}-send reserve for password resets and invoices remains.`
							: `${quota.remaining} remaining. Digests pause once only the ${quota.reserveForPriority}-send reserve is left.`}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
