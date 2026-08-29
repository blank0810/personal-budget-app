/** Public navigation, shared by the header, the mobile drawer and the footer. */
export const PRIMARY_LINKS = [
	{ label: 'Features', href: '/features' },
	{ label: 'How it works', href: '/how-it-works' },
	{ label: 'Invoicing', href: '/invoicing' },
	{ label: 'Pricing', href: '/pricing' },
	{ label: 'FAQ', href: '/faq' },
] as const;

export const FOOTER_GROUPS = [
	{
		heading: 'Product',
		links: [
			{ label: 'Features', href: '/features' },
			{ label: 'How it works', href: '/how-it-works' },
			{ label: 'Invoicing', href: '/invoicing' },
			{ label: 'AI Advisor', href: '/ai-advisor' },
		],
	},
	{
		heading: 'Company',
		links: [
			{ label: 'Pricing', href: '/pricing' },
			{ label: 'FAQ', href: '/faq' },
			{ label: 'Changelog', href: '/changelog' },
		],
	},
	{
		heading: 'Account',
		links: [
			{ label: 'Sign in', href: '/login' },
			{ label: 'Create account', href: '/register' },
		],
	},
] as const;

/** localStorage key for the public theme. Read by the no-flash script. */
export const THEME_KEY = 'bp-public-theme';
