import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Budget Planner — Simple Personal Finance Tracking',
	description:
		'Track income, expenses, and budgets. Set savings goals, automate recurring transactions, and understand your financial health. Free to use.',
	openGraph: {
		title: 'Budget Planner — Simple Personal Finance Tracking',
		description: 'Track income, expenses, and budgets. Free to use.',
		images: ['/og-image.png'],
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Budget Planner',
		description: 'Simple personal finance tracking. Free to use.',
	},
};

export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'SoftwareApplication',
						name: 'Budget Planner',
						applicationCategory: 'FinanceApplication',
						operatingSystem: 'Web',
						offers: {
							'@type': 'Offer',
							price: '0',
							priceCurrency: 'USD',
						},
						description:
							'Track income, expenses, and budgets. Set savings goals, automate recurring transactions, and understand your financial health.',
					}),
				}}
			/>
			{children}
		</>
	);
}
