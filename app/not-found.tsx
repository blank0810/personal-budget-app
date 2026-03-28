import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export default function NotFound() {
	return (
		<div className='flex min-h-screen items-center justify-center p-4'>
			<Card className='w-full max-w-md'>
				<CardHeader>
					<CardTitle>Page not found</CardTitle>
					<CardDescription>
						The page you are looking for does not exist or has been moved.
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<Button asChild>
						<Link href='/'>Go home</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
