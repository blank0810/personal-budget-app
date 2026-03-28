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

export default function AuthenticatedNotFound() {
	return (
		<div className='container mx-auto py-6 md:py-10'>
			<div className='flex items-center justify-center min-h-[60vh]'>
				<Card className='w-full max-w-md'>
					<CardHeader>
						<CardTitle>Page not found</CardTitle>
						<CardDescription>
							The page you are looking for does not exist or has been moved.
						</CardDescription>
					</CardHeader>
					<CardContent />
					<CardFooter>
						<Button asChild>
							<Link href='/dashboard'>Go to Dashboard</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
