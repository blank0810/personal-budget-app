import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Navbar } from '@/components/modules/landing/Navbar';
import { Hero } from '@/components/modules/landing/Hero';
import { Features } from '@/components/modules/landing/Features';
import { HowItWorks } from '@/components/modules/landing/HowItWorks';
import { DashboardPreview } from '@/components/modules/landing/DashboardPreview';
import { CTA } from '@/components/modules/landing/CTA';
import { Footer } from '@/components/modules/landing/Footer';

export default async function LandingPage() {
	const session = await auth();

	if (session) {
		redirect('/dashboard');
	}

	return (
		<div className='min-h-screen bg-background'>
			<Navbar />
			<main>
				<Hero />
				<Features />
				<HowItWorks />
				<DashboardPreview />
				<CTA />
			</main>
			<Footer />
		</div>
	);
}
