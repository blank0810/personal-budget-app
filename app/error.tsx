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

export default function Error({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className='flex min-h-screen items-center justify-center p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle>Something went wrong</CardTitle>
					<CardDescription>
						An unexpected error occurred. You can try again or return to the
						home page.
					</CardDescription>
				</CardHeader>
				<CardContent />
				<CardFooter className='flex gap-3'>
					<Button onClick={reset}>Try again</Button>
					<Button variant='outline' asChild>
						<Link href='/'>Go home</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
