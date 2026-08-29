import Link from 'next/link';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface LagoonButtonProps {
	href: string;
	children: React.ReactNode;
	variant?: Variant;
	size?: Size;
	className?: string;
	/** External link — renders <a> instead of next/link */
	external?: boolean;
}

const SIZE: Record<Size, string> = {
	sm: 'h-9 px-5 text-[13px]',
	md: 'h-11 px-6 text-[15px]',
	lg: 'h-12 px-8 text-[16px]',
};

/**
 * LagoonButton — shared CTA primitive.
 * Server component — uses next/link, no client JS.
 *
 * Variants:
 *  - primary: teal bg (--lagoon-accent), white text, pill shape
 *  - ghost: transparent, body-text colour, border
 *  - outline: transparent, teal text + teal border
 *
 * Hover states use Tailwind CSS-variable arbitrary-value classes.
 */
export function LagoonButton({
	href,
	children,
	variant = 'primary',
	size = 'md',
	className = '',
}: LagoonButtonProps) {
	const base =
		'inline-flex items-center justify-center gap-2 rounded-full font-semibold leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lagoon-accent)]';

	const variantStyles: Record<Variant, { style: React.CSSProperties; cls: string }> = {
		primary: {
			style: { background: 'var(--lagoon-accent)', color: 'var(--lagoon-on-accent)' },
			cls: 'hover:opacity-90',
		},
		ghost: {
			style: {
				background: 'transparent',
				color: 'var(--lagoon-body)',
				border: '1px solid var(--lagoon-border)',
			},
			cls: 'hover:border-[var(--lagoon-border-soft)] hover:text-[var(--lagoon-ink)]',
		},
		outline: {
			style: {
				background: 'transparent',
				color: 'var(--lagoon-accent)',
				border: '1px solid var(--lagoon-accent)',
			},
			cls: 'hover:bg-[var(--lagoon-accent-bg)]',
		},
	};

	const { style, cls } = variantStyles[variant];

	return (
		<Link
			href={href}
			className={`${base} ${SIZE[size]} ${cls} ${className}`}
			style={style}
		>
			{children}
		</Link>
	);
}
