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

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

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
								<FormLabel>Password</FormLabel>
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
						Sign In
					</Button>
				</form>
			</Form>
		</div>
	);
}
