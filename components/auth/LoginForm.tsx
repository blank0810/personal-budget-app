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
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);

	const form = useForm<LoginInput>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	});

	async function onSubmit(data: LoginInput) {
		setIsLoading(true);
		setError(null);

		try {
			const result = await signIn('credentials', {
				email: data.email,
				password: data.password,
				redirect: false,
			});

			if (result?.error) {
				setError('Invalid email or password');
			} else {
				router.push('/dashboard');
				router.refresh();
			}
		} catch {
			setError('Something went wrong. Please try again.');
		} finally {
			setIsLoading(false);
		}
	}

	async function onGoogleSignIn() {
		setIsGoogleLoading(true);
		setError(null);
		try {
			await signIn('google', { callbackUrl: '/dashboard' });
		} catch {
			setError('Something went wrong. Please try again.');
			setIsGoogleLoading(false);
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
						name='email'
						render={({ field }) => (
							<FormItem>
								<FormLabel>Email</FormLabel>
								<FormControl>
									<Input
										placeholder='name@example.com'
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='password'
						render={({ field }) => (
							<FormItem>
								<div className='flex items-center justify-between'>
									<FormLabel>Password</FormLabel>
									<Link
										href='/forgot-password'
										className='text-sm text-muted-foreground underline-offset-4 hover:underline'
									>
										Forgot password?
									</Link>
								</div>
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
						disabled={isLoading || isGoogleLoading}
					>
						{isLoading && (
							<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						)}
						Sign In
					</Button>
				</form>
			</Form>
			<div className='relative'>
				<div className='absolute inset-0 flex items-center'>
					<span className='w-full border-t' />
				</div>
				<div className='relative flex justify-center text-xs uppercase'>
					<span className='bg-background px-2 text-muted-foreground'>
						Or continue with
					</span>
				</div>
			</div>
			<Button
				variant='outline'
				className='w-full'
				onClick={onGoogleSignIn}
				disabled={isLoading || isGoogleLoading}
			>
				{isGoogleLoading ? (
					<Loader2 className='mr-2 h-4 w-4 animate-spin' />
				) : (
					<svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
						<path
							d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
							fill='#4285F4'
						/>
						<path
							d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
							fill='#34A853'
						/>
						<path
							d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
							fill='#FBBC05'
						/>
						<path
							d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
							fill='#EA4335'
						/>
					</svg>
				)}
				Sign in with Google
			</Button>
		</div>
	);
}
