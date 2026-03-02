import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Navbar } from '@/components/modules/landing/Navbar';
import { Hero } from '@/components/modules/landing/Hero';
import { ProblemStatement } from '@/components/modules/landing/ProblemStatement';
import { Features } from '@/components/modules/landing/Features';
import { HowItWorks } from '@/components/modules/landing/HowItWorks';
import { DashboardPreview } from '@/components/modules/landing/DashboardPreview';
import { Testimonials } from '@/components/modules/landing/Testimonials';
import { CTA } from '@/components/modules/landing/CTA';
import { Footer } from '@/components/modules/landing/Footer';
import { ScrollReveal } from '@/components/modules/landing/ScrollReveal';

export default async function LandingPage() {
	const session = await auth();

	if (session) {
		redirect('/dashboard');
	}

	return (
		<div className='dark'>
			<div className='relative min-h-screen bg-background landing-grid-bg overflow-hidden'>
				<Navbar />
				<main>
					<Hero />
					<ProblemStatement />
					<Features />
					<HowItWorks />
					<DashboardPreview />
					<Testimonials />
					<CTA />
				</main>
				<Footer />
				<ScrollReveal />
			</div>
		</div>
	);
}
