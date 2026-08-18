'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	Lock,
	Eye,
	EyeOff,
	Shield,
	Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	updatePasswordAction,
} from '@/server/modules/notification/notification.controller';

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

export function SecurityCard({ hasPassword }: { hasPassword: boolean }) {
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

