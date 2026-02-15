'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { resetPassword } from '@/server/actions/auth';

const resetPasswordSchema = z
	.object({
		password: z.string().min(6, 'Password must be at least 6 characters'),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get('token');
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const form = useForm<ResetPasswordInput>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: {
			password: '',
			confirmPassword: '',
		},
	});

	if (!token) {
		return (
			<Alert variant='destructive'>
				<AlertDescription>
					Invalid reset link. Please request a new one.
				</AlertDescription>
			</Alert>
		);
	}

	async function onSubmit(data: ResetPasswordInput) {
		setIsLoading(true);
		setError(null);

		try {
			const result = await resetPassword({
				token: token!,
				password: data.password,
			});

			if (result.error) {
				setError(result.error);
			} else {
				router.push('/login?reset=true');
			}
		} catch {
			setError('Something went wrong. Please try again.');
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className='grid gap-6'>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className='space-y-4'
				>
					{error && (
						<Alert variant='destructive'>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<FormField
						control={form.control}
						name='password'
						render={({ field }) => (
							<FormItem>
								<FormLabel>New Password</FormLabel>
								<FormControl>
									<Input
										type='password'
										placeholder='******'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='confirmPassword'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Confirm Password</FormLabel>
								<FormControl>
									<Input
										type='password'
										placeholder='******'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button
						type='submit'
						className='w-full'
						disabled={isLoading}
					>
						{isLoading && (
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						)}
						Reset Password
					</Button>
				</form>
			</Form>
		</div>
	);
}
