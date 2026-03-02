'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Shield } from 'lucide-react';
import {
	adminReauth,
	adminReauthOAuth,
} from '@/server/modules/admin/admin.controller';
import { toast } from 'sonner';

interface AdminReauthDialogProps {
	hasPassword: boolean;
}

export function AdminReauthDialog({ hasPassword }: AdminReauthDialogProps) {
	const router = useRouter();
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	async function handlePasswordSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		const result = await adminReauth(password);
		setLoading(false);

		if (result.success) {
			toast.success('Admin mode activated');
			router.refresh();
		} else {
			toast.error(result.error || 'Authentication failed');
		}
	}

	async function handleOAuthSubmit() {
		setLoading(true);
		const result = await adminReauthOAuth();
		setLoading(false);

		if (result.success) {
			toast.success('Admin mode activated');
			router.refresh();
		} else {
			toast.error(result.error || 'Authentication failed');
		}
	}

	return (
		<div className='flex items-center justify-center min-h-[60vh]'>
			<Card className='w-full max-w-md'>
				<CardHeader className='text-center'>
					<div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100'>
						<Shield className='h-6 w-6 text-amber-600' />
					</div>
					<CardTitle>Admin Authentication Required</CardTitle>
					<CardDescription>
						{hasPassword
							? 'Re-enter your password to access admin controls.'
							: 'Confirm your identity to access admin controls.'}
						{' '}Session expires after 15 minutes.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{hasPassword ? (
						<form onSubmit={handlePasswordSubmit} className='space-y-4'>
							<div className='space-y-2'>
								<Label htmlFor='password'>Password</Label>
								<Input
									id='password'
									type='password'
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder='Enter your password'
									required
								/>
							</div>
							<Button
								type='submit'
								className='w-full'
								disabled={loading}
							>
								{loading ? 'Verifying...' : 'Authenticate'}
							</Button>
							<Button
								type='button'
								variant='outline'
								className='w-full'
								onClick={() => router.push('/dashboard')}
							>
								Cancel
							</Button>
						</form>
					) : (
						<div className='space-y-4'>
							<p className='text-sm text-muted-foreground text-center'>
								You signed in with Google. Tap below to confirm your admin access.
							</p>
							<Button
								className='w-full'
								disabled={loading}
								onClick={handleOAuthSubmit}
							>
								{loading ? 'Verifying...' : 'Confirm Admin Access'}
							</Button>
							<Button
								variant='outline'
								className='w-full'
								onClick={() => router.push('/dashboard')}
							>
								Cancel
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
