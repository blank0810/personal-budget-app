'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	adminDisableUserAction,
	adminEnableUserAction,
	adminExportUserDataAction,
	adminSetUserFeatureAction,
	adminResetUserFeatureAction,
} from '@/server/modules/admin/admin.controller';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
	ArrowLeft,
	Loader2,
	Download,
	Ban,
	CheckCircle,
	ArrowDownLeft,
	ArrowUpRight,
	ArrowRightLeft,
	Target,
	RotateCcw,
	User,
	Wallet,
	Bell,
	Sliders,
	Activity,
	ShieldAlert,
	Calendar,
	Clock,
} from 'lucide-react';

// --- Serialized Types ---

interface SerializedAccount {
	id: string;
	name: string;
	balance: number | string;
	type: string;
}

interface SerializedNotificationPref {
	enabled: boolean;
	notificationType: { key: string; label: string };
}

interface SerializedUser {
	id: string;
	name: string | null;
	email: string;
	role: string;
	currency: string;
	isDisabled: boolean;
	isOnboarded: boolean;
	createdAt: string;
	lastLoginAt: string | null;
	accounts: SerializedAccount[];
	notificationPreferences: SerializedNotificationPref[];
}

interface SerializedTimelineItem {
	id: string;
	type: 'income' | 'expense' | 'transfer' | 'goal';
	description: string;
	amount?: number;
	timestamp: string;
}

interface SerializedFlag {
	key: string;
	description: string | null;
	enabled: boolean;
	overrideCount: number;
}

interface UserDetailPageProps {
	user: SerializedUser;
	timeline: SerializedTimelineItem[];
	flags: SerializedFlag[];
	overrides: Record<string, boolean>;
}

// --- Icon / color maps ---

const TIMELINE_ICONS = {
	income: ArrowDownLeft,
	expense: ArrowUpRight,
	transfer: ArrowRightLeft,
	goal: Target,
};

const TIMELINE_COLORS = {
	income: 'text-green-500',
	expense: 'text-red-500',
	transfer: 'text-blue-500',
	goal: 'text-purple-500',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
	CHECKING: 'Checking',
	SAVINGS: 'Savings',
	CREDIT: 'Credit',
	INVESTMENT: 'Investment',
	CASH: 'Cash',
	OTHER: 'Other',
};

// --- Component ---

export function UserDetailPage({
	user: initialUser,
	timeline,
	flags,
	overrides: initialOverrides,
}: UserDetailPageProps) {
	const router = useRouter();
	const [user, setUser] = useState(initialUser);
	const [actionLoading, setActionLoading] = useState(false);
	const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>(initialOverrides);
	const [featureLoading, setFeatureLoading] = useState<string | null>(null);
	const [, startFeatureTransition] = useTransition();

	// --- Handlers ---

	async function handleToggleDisable() {
		setActionLoading(true);
		const result = user.isDisabled
			? await adminEnableUserAction(user.id)
			: await adminDisableUserAction(user.id);
		setActionLoading(false);

		if (result.success) {
			toast.success(user.isDisabled ? 'User enabled' : 'User disabled');
			setUser((u) => ({ ...u, isDisabled: !u.isDisabled }));
			router.refresh();
		} else {
			toast.error(result.error || 'Action failed');
		}
	}

	async function handleExport() {
		setActionLoading(true);
		const result = await adminExportUserDataAction(user.id);
		setActionLoading(false);

		if ('success' in result && result.data) {
			const blob = new Blob([JSON.stringify(result.data, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `user-export-${user.email}-${new Date().toISOString().slice(0, 10)}.json`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success('User data exported');
		} else {
			toast.error('Export failed');
		}
	}

	function handleFeatureToggle(flagKey: string, enabled: boolean) {
		setFeatureLoading(flagKey);
		startFeatureTransition(async () => {
			const result = await adminSetUserFeatureAction({
				userId: user.id,
				flagKey,
				enabled,
			});
			setFeatureLoading(null);

			if ('error' in result) {
				toast.error(result.error);
			} else {
				setUserOverrides((prev) => ({ ...prev, [flagKey]: enabled }));
				toast.success(`${flagKey} ${enabled ? 'enabled' : 'disabled'} for user`);
			}
		});
	}

	function handleFeatureReset(flagKey: string) {
		setFeatureLoading(flagKey);
		startFeatureTransition(async () => {
			const result = await adminResetUserFeatureAction({
				userId: user.id,
				flagKey,
			});
			setFeatureLoading(null);

			if ('error' in result) {
				toast.error(result.error);
			} else {
				setUserOverrides((prev) => {
					const next = { ...prev };
					delete next[flagKey];
					return next;
				});
				toast.success(`${flagKey} reset to global default`);
			}
		});
	}

	const totalBalance = user.accounts.reduce(
		(sum, a) => sum + Number(a.balance),
		0
	);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			{/* Breadcrumb / Back */}
			<div className='flex items-center gap-2 text-sm text-muted-foreground'>
				<Link
					href='/admin/users'
					className='flex items-center gap-1 hover:text-foreground transition-colors'
				>
					<ArrowLeft className='h-4 w-4' />
					Users
				</Link>
				<span>/</span>
				<span className='text-foreground'>{user.name || user.email}</span>
			</div>

			{/* Header Card */}
			<Card>
				<CardContent className='pt-6'>
					<div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
						<div className='flex items-start gap-4'>
							<div className='h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0'>
								<User className='h-6 w-6 text-muted-foreground' />
							</div>
							<div className='space-y-1'>
								<h1 className='text-xl font-semibold leading-tight'>
									{user.name || 'Unnamed User'}
								</h1>
								<p className='text-sm text-muted-foreground'>{user.email}</p>
								<div className='flex flex-wrap gap-2 pt-1'>
									<Badge
										variant={user.role === 'ADMIN' ? 'default' : 'outline'}
									>
										{user.role}
									</Badge>
									<Badge variant='secondary'>{user.currency}</Badge>
									<Badge
										variant={user.isDisabled ? 'destructive' : 'outline'}
									>
										{user.isDisabled ? 'Disabled' : 'Active'}
									</Badge>
									{user.isOnboarded ? (
										<Badge variant='outline' className='text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900'>
											Onboarded
										</Badge>
									) : (
										<Badge variant='outline' className='text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900'>
											Not Onboarded
										</Badge>
									)}
								</div>
							</div>
						</div>

						<div className='flex flex-wrap gap-2 sm:shrink-0'>
							<Button
								variant={user.isDisabled ? 'default' : 'destructive'}
								size='sm'
								onClick={handleToggleDisable}
								disabled={actionLoading}
							>
								{actionLoading ? (
									<Loader2 className='h-4 w-4 animate-spin' />
								) : user.isDisabled ? (
									<>
										<CheckCircle className='h-4 w-4' />
										Enable User
									</>
								) : (
									<>
										<Ban className='h-4 w-4' />
										Disable User
									</>
								)}
							</Button>
							<Button
								variant='outline'
								size='sm'
								onClick={handleExport}
								disabled={actionLoading}
							>
								<Download className='h-4 w-4' />
								Export Data
							</Button>
						</div>
					</div>

					<Separator className='my-4' />

					<div className='grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm'>
						<div className='flex items-start gap-2'>
							<Calendar className='h-4 w-4 text-muted-foreground mt-0.5 shrink-0' />
							<div>
								<p className='text-xs text-muted-foreground'>Joined</p>
								<p className='font-medium'>
									{format(new Date(user.createdAt), 'MMM d, yyyy')}
								</p>
							</div>
						</div>
						<div className='flex items-start gap-2'>
							<Clock className='h-4 w-4 text-muted-foreground mt-0.5 shrink-0' />
							<div>
								<p className='text-xs text-muted-foreground'>Last Login</p>
								<p className='font-medium'>
									{user.lastLoginAt
										? format(new Date(user.lastLoginAt), 'MMM d, yyyy')
										: 'Never'}
								</p>
							</div>
						</div>
						<div className='flex items-start gap-2'>
							<Wallet className='h-4 w-4 text-muted-foreground mt-0.5 shrink-0' />
							<div>
								<p className='text-xs text-muted-foreground'>Accounts</p>
								<p className='font-medium'>{user.accounts.length}</p>
							</div>
						</div>
						<div className='flex items-start gap-2'>
							<Activity className='h-4 w-4 text-muted-foreground mt-0.5 shrink-0' />
							<div>
								<p className='text-xs text-muted-foreground'>Total Balance</p>
								<p className='font-medium tabular-nums'>
									{totalBalance.toLocaleString(undefined, {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}{' '}
									{user.currency}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Two-column grid for the detail sections */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				{/* Accounts */}
				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-base flex items-center gap-2'>
							<Wallet className='h-4 w-4 text-muted-foreground' />
							Accounts
							<Badge variant='secondary' className='ml-auto font-normal text-xs'>
								{user.accounts.length}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{user.accounts.length > 0 ? (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Type</TableHead>
										<TableHead className='text-right'>Balance</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{user.accounts.map((account) => (
										<TableRow key={account.id}>
											<TableCell className='font-medium'>
												{account.name}
											</TableCell>
											<TableCell className='text-muted-foreground text-sm'>
												{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
											</TableCell>
											<TableCell className='text-right tabular-nums text-sm'>
												{Number(account.balance).toLocaleString(undefined, {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						) : (
							<p className='text-sm text-muted-foreground py-4 text-center'>
								No accounts
							</p>
						)}
					</CardContent>
				</Card>

				{/* Notification Preferences */}
				<Card>
					<CardHeader className='pb-3'>
						<CardTitle className='text-base flex items-center gap-2'>
							<Bell className='h-4 w-4 text-muted-foreground' />
							Notification Preferences
						</CardTitle>
					</CardHeader>
					<CardContent>
						{user.notificationPreferences.length > 0 ? (
							<div className='divide-y'>
								{user.notificationPreferences.map((pref) => (
									<div
										key={pref.notificationType.key}
										className='flex items-center justify-between py-2.5 first:pt-0 last:pb-0'
									>
										<span className='text-sm'>
											{pref.notificationType.label}
										</span>
										<Badge
											variant={pref.enabled ? 'outline' : 'secondary'}
											className='text-xs'
										>
											{pref.enabled ? 'On' : 'Off'}
										</Badge>
									</div>
								))}
							</div>
						) : (
							<p className='text-sm text-muted-foreground py-4 text-center'>
								Using default settings
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Feature Access — full width */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='text-base flex items-center gap-2'>
						<Sliders className='h-4 w-4 text-muted-foreground' />
						Feature Access
						<Badge variant='secondary' className='ml-auto font-normal text-xs'>
							{flags.length} flags
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{flags.length > 0 ? (
						<div className='divide-y'>
							{flags.map((flag) => {
								const hasOverride = flag.key in userOverrides;
								const effectiveValue = hasOverride
									? userOverrides[flag.key]
									: flag.enabled;
								const isLoading = featureLoading === flag.key;

								return (
									<div
										key={flag.key}
										className='flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0'
									>
										<div className='flex-1 min-w-0'>
											<div className='flex items-center gap-2'>
												<span className='text-sm font-mono'>{flag.key}</span>
												{hasOverride ? (
													<Badge variant='outline' className='text-xs shrink-0'>
														Custom
													</Badge>
												) : (
													<Badge variant='secondary' className='text-xs shrink-0'>
														Default
													</Badge>
												)}
											</div>
											{flag.description && (
												<p className='text-xs text-muted-foreground mt-0.5'>
													{flag.description}
												</p>
											)}
										</div>
										<div className='flex items-center gap-2 shrink-0'>
											{hasOverride && (
												<Button
													variant='ghost'
													size='icon'
													className='h-7 w-7'
													onClick={() => handleFeatureReset(flag.key)}
													disabled={isLoading}
													title='Reset to global default'
												>
													{isLoading ? (
														<Loader2 className='h-3 w-3 animate-spin' />
													) : (
														<RotateCcw className='h-3 w-3' />
													)}
												</Button>
											)}
											<Switch
												checked={effectiveValue}
												disabled={isLoading}
												onCheckedChange={(checked) =>
													handleFeatureToggle(flag.key, checked)
												}
											/>
										</div>
									</div>
								);
							})}
						</div>
					) : (
						<p className='text-sm text-muted-foreground py-4 text-center'>
							No feature flags configured
						</p>
					)}
				</CardContent>
			</Card>

			{/* Activity Timeline — full width */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='text-base flex items-center gap-2'>
						<Activity className='h-4 w-4 text-muted-foreground' />
						Recent Activity
						<Badge variant='secondary' className='ml-auto font-normal text-xs'>
							{timeline.length} events
						</Badge>
					</CardTitle>
				</CardHeader>
				<CardContent>
					{timeline.length > 0 ? (
						<div className='relative'>
							{/* Vertical line */}
							<div className='absolute left-[15px] top-2 bottom-2 w-px bg-border' />
							<div className='space-y-4'>
								{timeline.map((item) => {
									const Icon = TIMELINE_ICONS[item.type];
									const color = TIMELINE_COLORS[item.type];
									return (
										<div key={item.id} className='flex items-start gap-3 pl-1'>
											<div
												className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border ${color}`}
											>
												<Icon className='h-4 w-4' />
											</div>
											<div className='flex-1 min-w-0 pt-1'>
												<p className='text-sm leading-snug'>{item.description}</p>
												<p className='text-xs text-muted-foreground mt-0.5'>
													{format(new Date(item.timestamp), 'MMM d, yyyy HH:mm')}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					) : (
						<p className='text-sm text-muted-foreground py-4 text-center'>
							No activity yet
						</p>
					)}
				</CardContent>
			</Card>

			{/* Danger Zone */}
			<Card className='border-destructive/40'>
				<CardHeader className='pb-3'>
					<CardTitle className='text-base flex items-center gap-2 text-destructive'>
						<ShieldAlert className='h-4 w-4' />
						Danger Zone
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='flex flex-wrap items-start justify-between gap-4'>
						<div>
							<p className='text-sm font-medium'>
								{user.isDisabled ? 'Enable this account' : 'Disable this account'}
							</p>
							<p className='text-xs text-muted-foreground mt-1'>
								{user.isDisabled
									? 'Restoring access will allow this user to log in and use the app.'
									: 'Disabling prevents this user from logging in. Their data is preserved.'}
							</p>
						</div>
						<Button
							variant={user.isDisabled ? 'default' : 'destructive'}
							size='sm'
							onClick={handleToggleDisable}
							disabled={actionLoading}
						>
							{actionLoading ? (
								<Loader2 className='h-4 w-4 animate-spin' />
							) : user.isDisabled ? (
								<>
									<CheckCircle className='h-4 w-4' />
									Enable User
								</>
							) : (
								<>
									<Ban className='h-4 w-4' />
									Disable User
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
