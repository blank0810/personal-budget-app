'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export default function AuthenticatedError({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className='container mx-auto py-6 md:py-10'>
			<div className='flex items-center justify-center min-h-[60vh]'>
				<Card className='w-full max-w-md'>
					<CardHeader>
						<CardTitle>Something went wrong</CardTitle>
						<CardDescription>
							An unexpected error occurred while loading this page. You can try
							again or head back to the dashboard.
						</CardDescription>
					</CardHeader>
					<CardContent />
					<CardFooter className='flex gap-3'>
						<Button onClick={reset}>Try again</Button>
						<Button variant='outline' asChild>
							<Link href='/dashboard'>Go to Dashboard</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
