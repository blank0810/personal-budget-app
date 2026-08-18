'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	ShieldCheck,
	Link2,
	Unlink,
	Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
	disconnectProviderAction,
} from '@/server/modules/notification/notification.controller';
import { signIn } from 'next-auth/react';

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


export function LinkedAccountsCard({
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
		signIn('google', { callbackUrl: '/settings/security' });
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

