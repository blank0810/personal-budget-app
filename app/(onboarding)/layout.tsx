import { Wallet } from 'lucide-react';

export default function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className='min-h-screen flex flex-col'>
			<header className='border-b px-6 py-4'>
				<div className='flex items-center gap-2'>
					<Wallet className='h-5 w-5' />
					<span className='text-lg font-bold'>Budget Planner</span>
				</div>
			</header>
			<main className='flex-1 flex items-center justify-center p-4'>
				{children}
			</main>
		</div>
	);
}
