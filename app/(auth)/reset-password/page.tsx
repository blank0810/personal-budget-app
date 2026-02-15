import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
	return (
		<div className='container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
			<div className='relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex'>
				<div className='absolute inset-0 bg-zinc-900' />
				<div className='relative z-20 flex items-center text-lg font-medium'>
					<Wallet className='mr-2 h-6 w-6' />
					Budget Planner
				</div>
				<div className='relative z-20 mt-auto'>
					<blockquote className='space-y-2'>
						<p className='text-lg'>
							&ldquo;A fresh start is just a new password
							away.&rdquo;
						</p>
					</blockquote>
				</div>
			</div>
			<div className='lg:p-8'>
				<div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]'>
					<div className='flex flex-col space-y-2 text-center'>
						<h1 className='text-2xl font-semibold tracking-tight'>
							Reset your password
						</h1>
						<p className='text-sm text-muted-foreground'>
							Enter your new password below
						</p>
					</div>
					<Suspense>
						<ResetPasswordForm />
					</Suspense>
					<p className='px-8 text-center text-sm text-muted-foreground'>
						<Link
							href='/login'
							className='underline underline-offset-4 hover:text-primary'
						>
							Back to login
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
