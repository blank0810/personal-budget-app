/**
 * Wordmark — plain type, no logotype flourish. The brand's whole claim
 * is that it doesn't dress things up; the mark shouldn't either.
 */
export function Wordmark({ className = '' }: { className?: string }) {
	return (
		<span
			className={`text-[1.0625rem] font-bold tracking-[-0.035em] ${className}`}
			style={{ color: 'var(--st-ink)' }}
		>
			Budget Planner
		</span>
	);
}
