'use client';

import { useEffect, useState, useTransition } from 'react';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
	adminGetUserDetailAction,
	adminGetUserActivityAction,
	adminDisableUserAction,
	adminEnableUserAction,
	adminExportUserDataAction,
	adminGetUserFeaturesAction,
	adminSetUserFeatureAction,
	adminResetUserFeatureAction,
} from '@/server/modules/admin/admin.controller';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
	Loader2,
	Download,
	Ban,
	CheckCircle,
	ArrowDownLeft,
	ArrowUpRight,
	ArrowRightLeft,
	Target,
	RotateCcw,
} from 'lucide-react';

interface UserDetailDrawerProps {
	userId: string | null;
	onClose: () => void;
}

interface UserDetail {
	id: string;
	name: string | null;
	email: string;
	role: string;
	currency: string;
	isDisabled: boolean;
	isOnboarded: boolean;
	createdAt: Date | string;
	lastLoginAt: Date | string | null;
	accounts: Array<{
		id: string;
		name: string;
		balance: number | { toNumber(): number };
		type: string;
	}>;
	notificationPreferences: Array<{
		enabled: boolean;
		notificationType: { key: string; label: string };
	}>;
}

interface TimelineItem {
	id: string;
	type: 'income' | 'expense' | 'transfer' | 'goal';
	description: string;
	amount?: number;
	timestamp: Date | string;
}

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

export function UserDetailDrawer({ userId, onClose }: UserDetailDrawerProps) {
	const [user, setUser] = useState<UserDetail | null>(null);
	const [timeline, setTimeline] = useState<TimelineItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const [featureFlags, setFeatureFlags] = useState<
		Array<{ key: string; description: string | null; globalEnabled: boolean }>
	>([]);
	const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
	const [featureLoading, setFeatureLoading] = useState<string | null>(null);
	const [, startFeatureTransition] = useTransition();

	/* eslint-disable react-hooks/set-state-in-effect -- Data fetching effect: setState is needed for async load/reset */
	useEffect(() => {
		if (!userId) {
			setUser(null);
			setTimeline([]);
			return;
		}

		async function load() {
			setLoading(true);
			const [detailResult, activityResult, featuresResult] = await Promise.all([
				adminGetUserDetailAction(userId!),
				adminGetUserActivityAction(userId!),
				adminGetUserFeaturesAction({ userId: userId! }),
			]);

			if ('success' in detailResult && detailResult.data) {
				setUser((detailResult.data as { user: unknown }).user as UserDetail);
			}
			if ('success' in activityResult && activityResult.data) {
				setTimeline((activityResult.data as { timeline: TimelineItem[] }).timeline);
			}
			if (!('error' in featuresResult) && featuresResult.data) {
				setFeatureFlags(
					featuresResult.data.flags.map(
						(f: { key: string; description: string | null; enabled: boolean }) => ({
							key: f.key,
							description: f.description,
							globalEnabled: f.enabled,
						})
					)
				);
				setUserOverrides(featuresResult.data.overrides);
			}
			setLoading(false);
		}

		load();
	}, [userId]);
	/* eslint-enable react-hooks/set-state-in-effect */

	async function handleToggleDisable() {
		if (!user) return;
		setActionLoading(true);
		const result = user.isDisabled
			? await adminEnableUserAction(user.id)
			: await adminDisableUserAction(user.id);
		setActionLoading(false);

		if (result.success) {
			toast.success(user.isDisabled ? 'User enabled' : 'User disabled');
			setUser({ ...user, isDisabled: !user.isDisabled });
		} else {
			toast.error(result.error || 'Failed');
		}
	}

	async function handleExport() {
		if (!user) return;
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
		if (!user) return;
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
		if (!user) return;
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

	return (
		<Sheet open={!!userId} onOpenChange={(v) => !v && onClose()}>
			<SheetContent className='w-full sm:max-w-lg overflow-y-auto'>
				<SheetHeader>
					<SheetTitle>User Details</SheetTitle>
				</SheetHeader>

				{loading ? (
					<div className='flex items-center justify-center py-12'>
						<Loader2 className='h-6 w-6 animate-spin' />
					</div>
				) : user ? (
					<div className='space-y-6 mt-4'>
						{/* Profile Info */}
						<div className='space-y-2'>
							<h3 className='font-semibold'>
								{user.name || 'Unnamed'}
							</h3>
							<p className='text-sm text-muted-foreground'>
								{user.email}
							</p>
							<div className='flex gap-2'>
								<Badge
									variant={
										user.role === 'ADMIN'
											? 'default'
											: 'outline'
									}
								>
									{user.role}
								</Badge>
								<Badge variant='secondary'>
									{user.currency}
								</Badge>
								<Badge
									variant={
										user.isDisabled
											? 'destructive'
											: 'outline'
									}
								>
									{user.isDisabled ? 'Disabled' : 'Active'}
								</Badge>
							</div>
							<div className='text-xs text-muted-foreground space-y-1 mt-2'>
								<p>
									Joined:{' '}
									{format(
										new Date(user.createdAt),
										'MMM d, yyyy'
									)}
								</p>
								<p>
									Last login:{' '}
									{user.lastLoginAt
										? format(
												new Date(user.lastLoginAt),
												'MMM d, yyyy HH:mm'
											)
										: 'Never'}
								</p>
								<p>
									Onboarded:{' '}
									{user.isOnboarded ? 'Yes' : 'No'}
								</p>
							</div>
						</div>

						<Separator />

						{/* Accounts */}
						<div>
							<h4 className='font-medium text-sm mb-2'>
								Accounts ({user.accounts.length})
							</h4>
							{user.accounts.length > 0 ? (
								<div className='space-y-2'>
									{user.accounts.map((a) => (
										<div
											key={a.id}
											className='flex justify-between text-sm'
										>
											<span>{a.name}</span>
											<span className='text-muted-foreground'>
												{Number(a.balance).toLocaleString()}{' '}
												({a.type})
											</span>
										</div>
									))}
								</div>
							) : (
								<p className='text-sm text-muted-foreground'>
									No accounts
								</p>
							)}
						</div>

						<Separator />

						{/* Notification Prefs */}
						<div>
							<h4 className='font-medium text-sm mb-2'>
								Notification Preferences
							</h4>
							{user.notificationPreferences.length > 0 ? (
								<div className='space-y-1'>
									{user.notificationPreferences.map(
										(pref) => (
											<div
												key={pref.notificationType.key}
												className='flex justify-between text-sm'
											>
												<span>
													{
														pref.notificationType
															.label
													}
												</span>
												<Badge
													variant={
														pref.enabled
															? 'outline'
															: 'secondary'
													}
													className='text-xs'
												>
													{pref.enabled
														? 'On'
														: 'Off'}
												</Badge>
											</div>
										)
									)}
								</div>
							) : (
								<p className='text-sm text-muted-foreground'>
									Default settings
								</p>
							)}
						</div>

						<Separator />

						{/* Feature Access */}
						<div>
							<h4 className='font-medium text-sm mb-2'>
								Feature Access ({featureFlags.length})
							</h4>
							{featureFlags.length > 0 ? (
								<div className='space-y-3'>
									{featureFlags.map((flag) => {
										const hasOverride = flag.key in userOverrides;
										const effectiveValue = hasOverride
											? userOverrides[flag.key]
											: flag.globalEnabled;
										const isLoading = featureLoading === flag.key;

										return (
											<div
												key={flag.key}
												className='flex items-center justify-between gap-2'
											>
												<div className='flex-1 min-w-0'>
													<div className='flex items-center gap-2'>
														<span className='text-sm font-mono truncate'>
															{flag.key}
														</span>
														{hasOverride ? (
															<Badge
																variant='outline'
																className='text-xs shrink-0'
															>
																Custom
															</Badge>
														) : (
															<Badge
																variant='secondary'
																className='text-xs shrink-0'
															>
																Default
															</Badge>
														)}
													</div>
													{flag.description && (
														<p className='text-xs text-muted-foreground truncate'>
															{flag.description}
														</p>
													)}
												</div>
												<div className='flex items-center gap-1 shrink-0'>
													{hasOverride && (
														<Button
															variant='ghost'
															size='icon'
															className='h-7 w-7'
															onClick={() =>
																handleFeatureReset(flag.key)
															}
															disabled={isLoading}
															title='Reset to global default'
														>
															<RotateCcw className='h-3 w-3' />
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
								<p className='text-sm text-muted-foreground'>
									No feature flags configured
								</p>
							)}
						</div>

						<Separator />

						{/* Actions */}
						<div className='flex flex-wrap gap-2'>
							<Button
								variant={
									user.isDisabled ? 'default' : 'destructive'
								}
								size='sm'
								onClick={handleToggleDisable}
								disabled={actionLoading}
							>
								{user.isDisabled ? (
									<>
										<CheckCircle className='h-4 w-4 mr-1' />
										Enable User
									</>
								) : (
									<>
										<Ban className='h-4 w-4 mr-1' />
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
								<Download className='h-4 w-4 mr-1' />
								Export Data
							</Button>
						</div>

						<Separator />

						{/* Activity Timeline */}
						<div>
							<h4 className='font-medium text-sm mb-3'>
								Recent Activity
							</h4>
							{timeline.length > 0 ? (
								<div className='space-y-3'>
									{timeline.map((item) => {
										const Icon =
											TIMELINE_ICONS[item.type];
										const color =
											TIMELINE_COLORS[item.type];
										return (
											<div
												key={item.id}
												className='flex items-start gap-3'
											>
												<div
													className={`mt-0.5 ${color}`}
												>
													<Icon className='h-4 w-4' />
												</div>
												<div className='flex-1 min-w-0'>
													<p className='text-sm truncate'>
														{item.description}
													</p>
													<p className='text-xs text-muted-foreground'>
														{format(
															new Date(
																item.timestamp
															),
															'MMM d, yyyy HH:mm'
														)}
													</p>
												</div>
											</div>
										);
									})}
								</div>
							) : (
								<p className='text-sm text-muted-foreground'>
									No activity yet
								</p>
							)}
						</div>
					</div>
				) : (
					<p className='text-center py-8 text-muted-foreground'>
						User not found
					</p>
				)}
			</SheetContent>
		</Sheet>
	);
}
