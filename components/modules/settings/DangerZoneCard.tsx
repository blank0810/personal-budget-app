'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	Eye,
	EyeOff,
	Loader2,
	AlertTriangle,
	Download,
	Trash2,
	CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	exportMyDataAction,
	verifyForResetAction,
	executeResetAction,
} from '@/server/modules/account-reset/account-reset.controller';
import { useRouter } from 'next/navigation';

type ResetTier = 'transactions' | 'full';

export function DangerZoneCard({ hasPassword }: { hasPassword: boolean }) {
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
	const [tier, setTier] = useState<ResetTier>('transactions');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [confirmPhrase, setConfirmPhrase] = useState('');
	const [resetToken, setResetToken] = useState('');
	const [error, setError] = useState('');
	const [isPending, startTransition] = useTransition();
	const [isExporting, startExportTransition] = useTransition();

	function resetDialog() {
		setStep(1);
		setTier('transactions');
		setPassword('');
		setShowPassword(false);
		setConfirmPhrase('');
		setResetToken('');
		setError('');
	}

	function handleOpenChange(open: boolean) {
		setDialogOpen(open);
		if (!open) {
			resetDialog();
		}
	}

	function handleVerifyPassword() {
		setError('');
		startTransition(async () => {
			const result = await verifyForResetAction(password);
			if ('error' in result && result.error) {
				setError(result.error);
			} else if ('data' in result && result.data?.token) {
				setResetToken(result.data.token);
				setStep(3);
			}
		});
	}

	function handleExecuteReset() {
		setError('');
		startTransition(async () => {
			const result = await executeResetAction(
				resetToken,
				confirmPhrase,
				tier
			);
			if ('error' in result && result.error) {
				setError(result.error);
			} else {
				setStep(4);
			}
		});
	}

	function handleExportData() {
		startExportTransition(async () => {
			const result = await exportMyDataAction();
			if ('error' in result) {
				toast.error(result.error);
				return;
			}
			if (result.data) {
				const blob = new Blob([JSON.stringify(result.data, null, 2)], {
					type: 'application/json',
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `budget-data-export-${new Date().toISOString().slice(0, 10)}.json`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				toast.success('Data exported successfully');
			}
		});
	}

	function handleFinish() {
		setDialogOpen(false);
		resetDialog();
		if (tier === 'full') {
			router.push('/');
		} else {
			router.refresh();
		}
	}

	return (
		<Card className="border-destructive/50 hover:shadow-md transition-shadow">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg text-destructive">
					<AlertTriangle className="h-5 w-5" />
					Danger Zone
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-3">
					<h3 className="text-sm font-semibold">
						Reset Financial Data
					</h3>
					<p className="text-sm text-muted-foreground">
						Permanently delete your financial data. This action
						cannot be undone. We recommend downloading your data
						first.
					</p>

					<div className="space-y-2 text-sm">
						<div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
							<Trash2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
							<div>
								<p className="font-medium">
									Transaction Reset
								</p>
								<p className="text-xs text-muted-foreground">
									Delete all transactions, keep accounts
									(zeroed), categories, and goals
								</p>
							</div>
						</div>
						<div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
							<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
							<div>
								<p className="font-medium">Full Reset</p>
								<p className="text-xs text-muted-foreground">
									Delete everything and start from scratch
								</p>
							</div>
						</div>
					</div>
				</div>

				<div className="flex flex-wrap gap-2 pt-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleExportData}
						disabled={isExporting}
					>
						{isExporting ? (
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						) : (
							<Download className="h-4 w-4 mr-1" />
						)}
						Download My Data
					</Button>

					<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
						<DialogTrigger asChild>
							<Button
								variant="destructive"
								size="sm"
								disabled={!hasPassword}
							>
								<Trash2 className="h-4 w-4 mr-1" />
								Start Fresh
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-md">
							{step === 1 && (
								<>
									<DialogHeader>
										<DialogTitle>
											Reset Financial Data
										</DialogTitle>
										<DialogDescription>
											Choose what you want to reset. This
											cannot be undone.
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-3 py-4">
										<button
											type="button"
											onClick={() =>
												setTier('transactions')
											}
											className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
												tier === 'transactions'
													? 'border-destructive bg-destructive/5'
													: 'border-muted hover:border-muted-foreground/25'
											}`}
										>
											<p className="font-medium text-sm">
												Transaction Reset
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												Delete all transactions, budgets,
												and reports. Accounts are kept but
												zeroed. Categories and goals remain.
											</p>
										</button>
										<button
											type="button"
											onClick={() => setTier('full')}
											className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
												tier === 'full'
													? 'border-destructive bg-destructive/5'
													: 'border-muted hover:border-muted-foreground/25'
											}`}
										>
											<p className="font-medium text-sm">
												Full Reset
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												Delete everything including
												accounts, categories, and goals.
												You will need to complete
												onboarding again.
											</p>
										</button>
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() =>
												handleOpenChange(false)
											}
										>
											Cancel
										</Button>
										<Button
											variant="destructive"
											onClick={() => setStep(2)}
										>
											Continue
										</Button>
									</DialogFooter>
								</>
							)}

							{step === 2 && (
								<>
									<DialogHeader>
										<DialogTitle>
											Verify Your Identity
										</DialogTitle>
										<DialogDescription>
											Enter your password to continue with
											the{' '}
											{tier === 'full'
												? 'full'
												: 'transaction'}{' '}
											reset.
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-4 py-4">
										{error && (
											<Alert variant="destructive">
												<AlertTriangle className="h-4 w-4" />
												<AlertDescription>
													{error}
												</AlertDescription>
											</Alert>
										)}
										<div className="space-y-2">
											<Label htmlFor="resetPassword">
												Password
											</Label>
											<div className="relative">
												<Input
													id="resetPassword"
													type={
														showPassword
															? 'text'
															: 'password'
													}
													value={password}
													onChange={(e) =>
														setPassword(
															e.target.value
														)
													}
													placeholder="Enter your password"
													disabled={isPending}
													onKeyDown={(e) => {
														if (
															e.key === 'Enter' &&
															password.length > 0
														) {
															handleVerifyPassword();
														}
													}}
												/>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
													onClick={() =>
														setShowPassword(
															!showPassword
														)
													}
												>
													{showPassword ? (
														<EyeOff className="h-4 w-4 text-muted-foreground" />
													) : (
														<Eye className="h-4 w-4 text-muted-foreground" />
													)}
												</Button>
											</div>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => {
												setError('');
												setStep(1);
											}}
											disabled={isPending}
										>
											Back
										</Button>
										<Button
											variant="destructive"
											onClick={handleVerifyPassword}
											disabled={
												isPending ||
												password.length === 0
											}
										>
											{isPending ? (
												<Loader2 className="h-4 w-4 animate-spin mr-1" />
											) : null}
											Verify
										</Button>
									</DialogFooter>
								</>
							)}

							{step === 3 && (
								<>
									<DialogHeader>
										<DialogTitle>
											Confirm Deletion
										</DialogTitle>
										<DialogDescription>
											Type{' '}
											<code className="font-mono font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded select-all cursor-text">
												DELETE ALL DATA
											</code>{' '}
											to confirm the{' '}
											{tier === 'full'
												? 'full'
												: 'transaction'}{' '}
											reset.
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-4 py-4">
										{error && (
											<Alert variant="destructive">
												<AlertTriangle className="h-4 w-4" />
												<AlertDescription>
													{error}
												</AlertDescription>
											</Alert>
										)}
										<Alert variant="destructive">
											<AlertTriangle className="h-4 w-4" />
											<AlertDescription>
												{tier === 'full'
													? 'This will permanently delete ALL your financial data including accounts, categories, and goals. You will need to re-complete onboarding.'
													: 'This will permanently delete all transactions, budgets, and reports. Account balances will be reset to zero.'}
											</AlertDescription>
										</Alert>
										<div className="space-y-2">
											<Label htmlFor="confirmPhrase">
												Type DELETE ALL DATA
											</Label>
											<Input
												id="confirmPhrase"
												value={confirmPhrase}
												onChange={(e) =>
													setConfirmPhrase(
														e.target.value
													)
												}
												placeholder="DELETE ALL DATA"
												disabled={isPending}
												className="font-mono"
												onKeyDown={(e) => {
													if (
														e.key === 'Enter' &&
														confirmPhrase ===
															'DELETE ALL DATA'
													) {
														handleExecuteReset();
													}
												}}
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => {
												setError('');
												setStep(2);
											}}
											disabled={isPending}
										>
											Back
										</Button>
										<Button
											variant="destructive"
											onClick={handleExecuteReset}
											disabled={
												isPending ||
												confirmPhrase !==
													'DELETE ALL DATA'
											}
										>
											{isPending ? (
												<Loader2 className="h-4 w-4 animate-spin mr-1" />
											) : null}
											Permanently Delete
										</Button>
									</DialogFooter>
								</>
							)}

							{step === 4 && (
								<>
									<DialogHeader>
										<DialogTitle className="flex items-center gap-2">
											<CheckCircle2 className="h-5 w-5 text-emerald-500" />
											Reset Complete
										</DialogTitle>
										<DialogDescription>
											{tier === 'full'
												? 'All financial data has been deleted. You will be redirected to start fresh.'
												: 'All transactions have been deleted and account balances have been zeroed.'}
										</DialogDescription>
									</DialogHeader>
									<DialogFooter className="pt-4">
										<Button onClick={handleFinish}>
											{tier === 'full'
												? 'Start Fresh'
												: 'Done'}
										</Button>
									</DialogFooter>
								</>
							)}
						</DialogContent>
					</Dialog>

					{!hasPassword && (
						<p className="text-xs text-muted-foreground self-center">
							Set a password to enable reset
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
