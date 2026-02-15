'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	User,
	Pencil,
	X,
	Lock,
	Eye,
	EyeOff,
	Shield,
	ShieldCheck,
	Link2,
	Unlink,
	Bell,
	Loader2,
	Phone,
	Smartphone,
	Mail,
	MessageSquare,
	Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import {
	updateProfileAction,
	updatePasswordAction,
	disconnectProviderAction,
	updateNotificationPreferenceAction,
	updatePhoneNumberAction,
	sendTestSmsAction,
} from '@/server/modules/notification/notification.controller';
import { signIn } from 'next-auth/react';
import type { MergedPreference } from '@/server/modules/notification/notification.types';

interface ProfilePageProps {
	user: {
		name: string | null;
		email: string;
		phoneNumber: string | null;
		hasPassword: boolean;
		createdAt: string;
		providers: string[];
	};
	preferences: MergedPreference[];
}

function GoogleIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24">
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
}

export function ProfilePage({ user, preferences }: ProfilePageProps) {
	const initials = (user.name || user.email)
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);

	const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
	});

	const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);

	return (
		<div className="container mx-auto py-6 md:py-10 space-y-8 max-w-3xl">
			{/* Page Header */}
			<div className="flex items-center gap-4">
				<div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
					{initials}
				</div>
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
						Your Profile
					</h1>
					<p className="text-muted-foreground">
						Member since {memberSince}
					</p>
				</div>
			</div>

			{/* Cards */}
			<div className="space-y-6">
				<PersonalInfoCard
					name={user.name}
					email={user.email}
					phoneNumber={phoneNumber}
					onPhoneNumberChange={setPhoneNumber}
				/>
				<SecurityCard hasPassword={user.hasPassword} />
				<LinkedAccountsCard
					providers={user.providers}
					hasPassword={user.hasPassword}
				/>
				<NotificationPreferencesCard
					preferences={preferences}
					hasPhoneNumber={!!phoneNumber}
				/>
			</div>
		</div>
	);
}

// --- Card 1: Personal Info ---

function PersonalInfoCard({
	name,
	email,
	phoneNumber,
	onPhoneNumberChange,
}: {
	name: string | null;
	email: string;
	phoneNumber: string | null;
	onPhoneNumberChange: (phone: string | null) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [nameValue, setNameValue] = useState(name || '');
	const [isPending, startTransition] = useTransition();

	const [editingPhone, setEditingPhone] = useState(false);
	const [phoneValue, setPhoneValue] = useState(phoneNumber || '');
	const [isPhonePending, startPhoneTransition] = useTransition();
	const [isTestSmsPending, startTestSmsTransition] = useTransition();

	const isValidPhone = /^\+639\d{9}$/.test(phoneValue);

	function handleSave() {
		startTransition(async () => {
			const result = await updateProfileAction({ name: nameValue });
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success('Profile updated');
				setEditing(false);
			}
		});
	}

	function handleCancel() {
		setNameValue(name || '');
		setEditing(false);
	}

	function handlePhoneSave() {
		startPhoneTransition(async () => {
			const value = phoneValue.trim() || null;
			const result = await updatePhoneNumberAction(value);
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success(value ? 'Phone number updated' : 'Phone number removed');
				onPhoneNumberChange(value);
				setEditingPhone(false);
			}
		});
	}

	function handlePhoneCancel() {
		setPhoneValue(phoneNumber || '');
		setEditingPhone(false);
	}

	function handleTestSms() {
		startTestSmsTransition(async () => {
			const result = await sendTestSmsAction();
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success('Test SMS sent! Check your phone.');
			}
		});
	}

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2 text-lg">
					<User className="h-5 w-5" />
					Personal Information
				</CardTitle>
				{!editing && !editingPhone && (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setEditing(true)}
					>
						<Pencil className="h-4 w-4" />
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="name">Name</Label>
					{editing ? (
						<Input
							id="name"
							value={nameValue}
							onChange={(e) => setNameValue(e.target.value)}
							placeholder="Your name"
							disabled={isPending}
						/>
					) : (
						<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50">
							{name || 'Not set'}
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">
						Email
						<Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />
					</Label>
					<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50 text-muted-foreground">
						{email}
					</p>
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="phone" className="flex items-center gap-1">
							<Phone className="h-3 w-3" />
							Phone Number
						</Label>
						{!editing && !editingPhone && (
							<Button
								variant="ghost"
								size="sm"
								className="h-6 px-2 text-xs"
								onClick={() => setEditingPhone(true)}
							>
								<Pencil className="h-3 w-3 mr-1" />
								{phoneNumber ? 'Edit' : 'Add'}
							</Button>
						)}
					</div>
					{editingPhone ? (
						<div className="space-y-2">
							<Input
								id="phone"
								value={phoneValue}
								onChange={(e) => setPhoneValue(e.target.value)}
								placeholder="+639XXXXXXXXX"
								disabled={isPhonePending}
							/>
							{phoneValue && !isValidPhone && (
								<p className="text-xs text-destructive">
									Must be a Philippine number (+639XXXXXXXXX)
								</p>
							)}
							<div className="flex gap-2">
								<Button
									size="sm"
									onClick={handlePhoneSave}
									disabled={isPhonePending || (phoneValue.trim() !== '' && !isValidPhone)}
								>
									{isPhonePending ? (
										<Loader2 className="h-4 w-4 animate-spin mr-1" />
									) : null}
									Save
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={handlePhoneCancel}
									disabled={isPhonePending}
								>
									<X className="h-4 w-4 mr-1" />
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50 flex-1">
								{phoneNumber || (
									<span className="text-muted-foreground">Not set</span>
								)}
							</p>
							{phoneNumber && (
								<Button
									variant="outline"
									size="sm"
									className="shrink-0 text-xs"
									onClick={handleTestSms}
									disabled={isTestSmsPending}
								>
									{isTestSmsPending ? (
										<Loader2 className="h-3 w-3 animate-spin mr-1" />
									) : (
										<MessageSquare className="h-3 w-3 mr-1" />
									)}
									Test SMS
								</Button>
							)}
						</div>
					)}
				</div>
				{editing && (
					<div className="flex gap-2 pt-2">
						<Button
							size="sm"
							onClick={handleSave}
							disabled={isPending || nameValue.length < 2}
						>
							{isPending ? (
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							) : null}
							Save
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={handleCancel}
							disabled={isPending}
						>
							<X className="h-4 w-4 mr-1" />
							Cancel
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// --- Card 2: Security ---

function PasswordStrengthBar({ password }: { password: string }) {
	const getStrength = (pw: string) => {
		let score = 0;
		if (pw.length >= 6) score++;
		if (pw.length >= 10) score++;
		if (/[A-Z]/.test(pw)) score++;
		if (/[0-9]/.test(pw)) score++;
		if (/[^A-Za-z0-9]/.test(pw)) score++;
		return score;
	};

	const strength = getStrength(password);
	const colors = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-500'];
	const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
	const widths = ['w-1/6', 'w-2/6', 'w-3/6', 'w-4/6', 'w-5/6', 'w-full'];

	if (!password) return null;

	return (
		<div className="space-y-1">
			<div className="h-1.5 w-full rounded-full bg-muted">
				<div
					className={`h-full rounded-full transition-all duration-300 ${colors[strength]} ${widths[strength]}`}
				/>
			</div>
			<p className="text-xs text-muted-foreground">{labels[strength]}</p>
		</div>
	);
}

function SecurityCard({ hasPassword }: { hasPassword: boolean }) {
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showCurrent, setShowCurrent] = useState(false);
	const [showNew, setShowNew] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [isPending, startTransition] = useTransition();

	function handleSubmit() {
		startTransition(async () => {
			const result = await updatePasswordAction({
				currentPassword: hasPassword ? currentPassword : undefined,
				newPassword,
				confirmPassword,
			});
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success(
					hasPassword ? 'Password updated' : 'Password set'
				);
				setCurrentPassword('');
				setNewPassword('');
				setConfirmPassword('');
			}
		});
	}

	const canSubmit =
		(!hasPassword || currentPassword.length > 0) &&
		newPassword.length >= 6 &&
		confirmPassword === newPassword;

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<Lock className="h-5 w-5" />
					Security
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{!hasPassword && (
					<div className="flex items-start gap-3 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
						<Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
						<div className="text-sm text-blue-800 dark:text-blue-300">
							<p className="font-medium">
								No password set
							</p>
							<p className="text-blue-600 dark:text-blue-400">
								You signed up with Google. Set a password to
								enable email/password login.
							</p>
						</div>
					</div>
				)}

				{hasPassword && (
					<div className="space-y-2">
						<Label htmlFor="currentPassword">Current Password</Label>
						<div className="relative">
							<Input
								id="currentPassword"
								type={showCurrent ? 'text' : 'password'}
								value={currentPassword}
								onChange={(e) =>
									setCurrentPassword(e.target.value)
								}
								placeholder="Enter current password"
								disabled={isPending}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
								onClick={() => setShowCurrent(!showCurrent)}
							>
								{showCurrent ? (
									<EyeOff className="h-4 w-4 text-muted-foreground" />
								) : (
									<Eye className="h-4 w-4 text-muted-foreground" />
								)}
							</Button>
						</div>
					</div>
				)}

				<div className="space-y-2">
					<Label htmlFor="newPassword">New Password</Label>
					<div className="relative">
						<Input
							id="newPassword"
							type={showNew ? 'text' : 'password'}
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Enter new password"
							disabled={isPending}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
							onClick={() => setShowNew(!showNew)}
						>
							{showNew ? (
								<EyeOff className="h-4 w-4 text-muted-foreground" />
							) : (
								<Eye className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
					</div>
					<PasswordStrengthBar password={newPassword} />
				</div>

				<div className="space-y-2">
					<Label htmlFor="confirmPassword">Confirm Password</Label>
					<div className="relative">
						<Input
							id="confirmPassword"
							type={showConfirm ? 'text' : 'password'}
							value={confirmPassword}
							onChange={(e) =>
								setConfirmPassword(e.target.value)
							}
							placeholder="Confirm new password"
							disabled={isPending}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
							onClick={() => setShowConfirm(!showConfirm)}
						>
							{showConfirm ? (
								<EyeOff className="h-4 w-4 text-muted-foreground" />
							) : (
								<Eye className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
					</div>
					{confirmPassword && confirmPassword !== newPassword && (
						<p className="text-xs text-destructive">
							Passwords do not match
						</p>
					)}
				</div>

				<Button
					onClick={handleSubmit}
					disabled={isPending || !canSubmit}
					className="w-full sm:w-auto"
				>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin mr-1" />
					) : null}
					{hasPassword ? 'Update Password' : 'Set Password'}
				</Button>
			</CardContent>
		</Card>
	);
}

// --- Card 3: Linked Accounts ---

function LinkedAccountsCard({
	providers,
	hasPassword,
}: {
	providers: string[];
	hasPassword: boolean;
}) {
	const [isPending, startTransition] = useTransition();
	const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
	const hasGoogle = providers.includes('google');

	function handleDisconnect() {
		startTransition(async () => {
			const result = await disconnectProviderAction('google');
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success('Google account disconnected');
				setDisconnectDialogOpen(false);
			}
		});
	}

	function handleConnect() {
		signIn('google', { callbackUrl: '/profile' });
	}

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<Link2 className="h-5 w-5" />
					Linked Accounts
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between py-3">
					<div className="flex items-center gap-3">
						<GoogleIcon className="h-5 w-5" />
						<div>
							<p className="text-sm font-medium">Google</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{hasGoogle ? (
							<>
								<Badge
									variant="outline"
									className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
								>
									<ShieldCheck className="h-3 w-3 mr-1" />
									Connected
								</Badge>
								{hasPassword ? (
									<Dialog
										open={disconnectDialogOpen}
										onOpenChange={
											setDisconnectDialogOpen
										}
									>
										<DialogTrigger asChild>
											<Button
												variant="outline"
												size="sm"
												disabled={isPending}
											>
												<Unlink className="h-3 w-3 mr-1" />
												Disconnect
											</Button>
										</DialogTrigger>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>
													Disconnect Google?
												</DialogTitle>
												<DialogDescription>
													You will no longer be able
													to sign in with Google.
													You can still sign in with
													your email and password.
												</DialogDescription>
											</DialogHeader>
											<DialogFooter>
												<Button
													variant="outline"
													onClick={() =>
														setDisconnectDialogOpen(
															false
														)
													}
												>
													Cancel
												</Button>
												<Button
													variant="destructive"
													onClick={handleDisconnect}
													disabled={isPending}
												>
													{isPending ? (
														<Loader2 className="h-4 w-4 animate-spin mr-1" />
													) : null}
													Disconnect
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								) : (
									<p className="text-xs text-muted-foreground max-w-[180px]">
										Set a password before disconnecting
									</p>
								)}
							</>
						) : (
							<Button
								variant="outline"
								size="sm"
								onClick={handleConnect}
							>
								<GoogleIcon className="h-3 w-3 mr-1" />
								Connect
							</Button>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// --- Card 4: Notification Preferences (Dual Email/SMS Toggles) ---

function NotificationPreferencesCard({
	preferences,
	hasPhoneNumber,
}: {
	preferences: MergedPreference[];
	hasPhoneNumber: boolean;
}) {
	const [localPrefs, setLocalPrefs] = useState(preferences);
	const [shakingKey, setShakingKey] = useState<string | null>(null);

	// Group by category
	const grouped = localPrefs.reduce(
		(acc, pref) => {
			if (!acc[pref.category]) acc[pref.category] = [];
			acc[pref.category].push(pref);
			return acc;
		},
		{} as Record<string, MergedPreference[]>
	);

	const categoryLabels: Record<string, string> = {
		reports: 'Reports',
		alerts: 'Alerts',
		activity: 'Activity',
	};

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

	return (
		<TooltipProvider>
			<Card className="hover:shadow-md transition-shadow">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Bell className="h-5 w-5" />
						Notification Preferences
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{!hasPhoneNumber && (
						<div className="flex items-start gap-3 p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
							<Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
							<div className="text-sm text-blue-800 dark:text-blue-300">
								<p className="font-medium">
									SMS notifications available
								</p>
								<p className="text-blue-600 dark:text-blue-400">
									Add your mobile number in Personal Info above
									to unlock SMS notifications.
								</p>
							</div>
						</div>
					)}

					{/* Column headers */}
					<div className="flex items-center justify-end gap-6 pr-1">
						<div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<Mail className="h-3.5 w-3.5" />
							Email
						</div>
						<div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
							<MessageSquare className="h-3.5 w-3.5" />
							SMS
						</div>
					</div>

					{Object.entries(grouped).map(([category, prefs]) => (
						<div key={category} className="space-y-3">
							<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
								{categoryLabels[category] || category}
							</h3>
							{prefs.map((pref) => (
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
										{/* Email toggle */}
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
										{/* SMS toggle */}
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
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
