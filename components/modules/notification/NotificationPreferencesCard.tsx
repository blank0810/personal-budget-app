'use client';

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	AlertCircle,
	Bell,
	Loader2,
	Mail,
	MessageSquare,
	Pencil,
	Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import {
	updateNotificationPreferenceAction,
	updateEmailNotificationsEnabledAction,
	updateNotificationEmailAction,
} from '@/server/modules/notification/notification.controller';
import type { MergedPreference } from '@/server/modules/notification/notification.types';
import {
	CATEGORY_LABELS,
	CATEGORY_ORDER,
} from '@/server/modules/notification/notification.registry';

/**
 * Notification preferences — the single surface for a user's own email settings.
 *
 * Rendered on the profile page and, via `embedded`, inside the onboarding
 * wizard's "Customize" disclosure. Deliberately one component: two copies of a
 * toggle grid drift, and a preference the user cannot find is worse than no
 * preference.
 */
export function NotificationPreferencesCard({
	preferences,
	hasPhoneNumber,
	emailNotificationsEnabled,
	notificationEmail,
	accountEmail,
	embedded = false,
}: {
	preferences: MergedPreference[];
	hasPhoneNumber: boolean;
	emailNotificationsEnabled: boolean;
	notificationEmail: string | null;
	accountEmail: string;
	/**
	 * Render without the Card chrome, for hosts that supply their own — the
	 * onboarding wizard's "Customize" disclosure. Extracted from ProfilePage so
	 * the two surfaces cannot drift apart.
	 */
	embedded?: boolean;
}) {
	const [localPrefs, setLocalPrefs] = useState(preferences);
	const [shakingKey, setShakingKey] = useState<string | null>(null);

	// Master email toggle state
	const [masterEnabled, setMasterEnabled] = useState(emailNotificationsEnabled);
	const [shakingMaster, setShakingMaster] = useState(false);

	// Delivery email state
	const [deliveryEmail, setDeliveryEmail] = useState<string | null>(notificationEmail);
	const [editingDelivery, setEditingDelivery] = useState(false);
	const [deliveryEmailValue, setDeliveryEmailValue] = useState(
		notificationEmail ?? accountEmail
	);
	const [deliveryEmailError, setDeliveryEmailError] = useState<string | null>(null);
	const [isDeliveryPending, startDeliveryTransition] = useTransition();

	const displayDeliveryEmail = deliveryEmail ?? accountEmail;
	const deliveryDiffersFromAccount =
		deliveryEmail !== null && deliveryEmail !== accountEmail;

	// Group by category, ordered by the registry rather than by insertion order,
	// so adding a notification type cannot silently reshuffle this list.
	const grouped = localPrefs.reduce(
		(acc, pref) => {
			if (!acc[pref.category]) acc[pref.category] = [];
			acc[pref.category].push(pref);
			return acc;
		},
		{} as Record<string, MergedPreference[]>
	);

	const orderedCategories = [
		...CATEGORY_ORDER.filter((c) => grouped[c]?.length),
		// Any category not yet in the registry order still renders, at the end.
		...Object.keys(grouped).filter(
			(c) => !(CATEGORY_ORDER as readonly string[]).includes(c)
		),
	];

	async function handleMasterToggle(checked: boolean) {
		// Optimistic flip
		setMasterEnabled(checked);
		const result = await updateEmailNotificationsEnabledAction(checked);
		if (result.error) {
			setMasterEnabled(!checked);
			setShakingMaster(true);
			setTimeout(() => setShakingMaster(false), 500);
			toast.error(result.error);
		}
	}

	function handleDeliveryEdit() {
		setDeliveryEmailValue(deliveryEmail ?? accountEmail);
		setDeliveryEmailError(null);
		setEditingDelivery(true);
	}

	function handleDeliveryCancel() {
		setDeliveryEmailError(null);
		setEditingDelivery(false);
	}

	function handleDeliverySave() {
		startDeliveryTransition(async () => {
			const trimmed = deliveryEmailValue.trim();
			const payload = trimmed === '' ? null : trimmed;
			const result = await updateNotificationEmailAction(payload);
			if (result.error) {
				setDeliveryEmailError(result.error);
			} else {
				// Backend normalises "same as account email" → null; reflect locally
				setDeliveryEmail(payload === accountEmail ? null : payload);
				setDeliveryEmailError(null);
				setEditingDelivery(false);
				toast.success('Delivery email updated');
			}
		});
	}

	async function handleToggle(
		key: string,
		channel: 'EMAIL' | 'SMS',
		enabled: boolean
	) {
		// Optimistic update
		setLocalPrefs((prev) =>
			prev.map((p) => {
				if (p.key !== key) return p;
				return channel === 'EMAIL'
					? { ...p, emailEnabled: enabled }
					: { ...p, smsEnabled: enabled };
			})
		);

		const result = await updateNotificationPreferenceAction(
			key,
			enabled,
			channel
		);
		if (result.error) {
			// Revert
			setLocalPrefs((prev) =>
				prev.map((p) => {
					if (p.key !== key) return p;
					return channel === 'EMAIL'
						? { ...p, emailEnabled: !enabled }
						: { ...p, smsEnabled: !enabled };
				})
			);
			setShakingKey(key);
			setTimeout(() => setShakingKey(null), 500);
			toast.error(result.error);
		}
	}

	const Shell = embedded ? EmbeddedShell : CardShell;

	return (
		<TooltipProvider>
			<Shell>
					{!hasPhoneNumber && (
						<div className="flex items-start gap-3 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
							<Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
							<div className="text-sm text-blue-800 dark:text-blue-300">
								<p className="font-medium">Add a phone number</p>
								<p className="text-blue-600 dark:text-blue-400">
									Save your mobile number now so you are ready when
									SMS notifications launch.
								</p>
							</div>
						</div>
					)}

					{/* Master email toggle */}
					<div
						className={`flex items-center justify-between py-2 ${
							shakingMaster ? 'animate-shake' : ''
						}`}
					>
						<div className="space-y-0.5 pr-4 flex-1">
							<p className="text-sm font-medium">Email Notifications</p>
							<p className="text-xs text-muted-foreground">
								Master switch for all notification emails
							</p>
						</div>
						<Switch
							checked={masterEnabled}
							onCheckedChange={handleMasterToggle}
						/>
					</div>

					{/* Delivery email row — only visible when master is ON */}
					{masterEnabled && (
						<div className="space-y-2 pl-1">
							{!editingDelivery ? (
								<div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
									<p className="text-xs text-muted-foreground flex-1">
										Sending to:{' '}
										<span className="font-medium text-foreground">
											{displayDeliveryEmail}
										</span>
									</p>
									<div className="flex items-center gap-2">
										{deliveryDiffersFromAccount && (
											<span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500">
												<AlertCircle className="h-3 w-3 shrink-0" />
												Different from your account email
											</span>
										)}
										<Button
											variant="ghost"
											size="sm"
											className="h-7 px-2 text-xs"
											onClick={handleDeliveryEdit}
										>
											<Pencil className="h-3 w-3 mr-1" />
											Edit
										</Button>
									</div>
								</div>
							) : (
								<div className="space-y-2">
									<div className="flex flex-col sm:flex-row gap-2">
										<Input
											value={deliveryEmailValue}
											onChange={(e) =>
												setDeliveryEmailValue(e.target.value)
											}
											placeholder={accountEmail}
											disabled={isDeliveryPending}
											className="flex-1 h-8 text-sm"
										/>
										<div className="flex gap-2 shrink-0">
											<Button
												size="sm"
												className="h-8"
												onClick={handleDeliverySave}
												disabled={isDeliveryPending}
											>
												{isDeliveryPending ? (
													<Loader2 className="h-3 w-3 animate-spin mr-1" />
												) : null}
												Save
											</Button>
											<Button
												size="sm"
												variant="ghost"
												className="h-8"
												onClick={handleDeliveryCancel}
												disabled={isDeliveryPending}
											>
												Cancel
											</Button>
										</div>
									</div>
									{deliveryEmailError && (
										<p className="text-xs text-destructive">
											{deliveryEmailError}
										</p>
									)}
								</div>
							)}
						</div>
					)}

					{/* Divider */}
					<div className="border-t" />

					{/* Column headers */}
					<div className="flex items-center justify-end gap-6 pr-1">
						<div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<Mail className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Email</span>
						</div>
						<div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<MessageSquare className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">SMS</span>
						</div>
					</div>
					<p className="text-right text-xs text-muted-foreground">
						SMS notifications coming soon
					</p>

					{orderedCategories.map((category) => (
						<div key={category} className="space-y-3">
							<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
								{CATEGORY_LABELS[
									category as keyof typeof CATEGORY_LABELS
								] ?? category}
							</h3>
							{grouped[category].map((pref) => (
								<div
									key={pref.key}
									className={`flex items-center justify-between py-2 ${
										shakingKey === pref.key
											? 'animate-shake'
											: ''
									}`}
								>
									<div className="space-y-0.5 pr-4 flex-1">
										<p className="text-sm font-medium">
											{pref.label}
										</p>
										<p className="text-xs text-muted-foreground">
											{pref.description}
										</p>
									</div>
									<div className="flex items-center gap-6">
										{/* Email toggle — gated by master */}
										{masterEnabled ? (
											<Switch
												checked={pref.emailEnabled}
												onCheckedChange={(checked) =>
													handleToggle(
														pref.key,
														'EMAIL',
														checked
													)
												}
											/>
										) : (
											<Tooltip>
												<TooltipTrigger asChild>
													<div>
														<Switch
															checked={pref.emailEnabled}
															disabled
															className="opacity-40"
														/>
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p>Turn on Email Notifications above to enable</p>
												</TooltipContent>
											</Tooltip>
										)}
										{/* SMS toggle — always independent */}
										{hasPhoneNumber ? (
											<Switch
												checked={pref.smsEnabled}
												onCheckedChange={(checked) =>
													handleToggle(
														pref.key,
														'SMS',
														checked
													)
												}
											/>
										) : (
											<Tooltip>
												<TooltipTrigger asChild>
													<div>
														<Switch
															checked={false}
															disabled
															className="opacity-50"
														/>
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p>Add your phone number to enable</p>
												</TooltipContent>
											</Tooltip>
										)}
									</div>
								</div>
							))}
						</div>
					))}
			</Shell>
		</TooltipProvider>
	);
}

function CardShell({ children }: { children: React.ReactNode }) {
	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<Bell className="h-5 w-5" />
					Notification Preferences
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">{children}</CardContent>
		</Card>
	);
}

function EmbeddedShell({ children }: { children: React.ReactNode }) {
	return <div className="space-y-6">{children}</div>;
}

