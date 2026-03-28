'use client';

export default function GlobalError({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<html lang='en'>
			<body
				style={{
					margin: 0,
					fontFamily: 'system-ui, sans-serif',
					display: 'flex',
					minHeight: '100vh',
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: '#fff',
					color: '#111',
				}}
			>
				<div
					style={{
						textAlign: 'center',
						padding: '2rem',
						maxWidth: '400px',
					}}
				>
					<h1
						style={{
							fontSize: '1.5rem',
							fontWeight: 700,
							marginBottom: '0.5rem',
						}}
					>
						Something went wrong
					</h1>
					<p
						style={{
							color: '#666',
							marginBottom: '1.5rem',
							fontSize: '0.95rem',
						}}
					>
						An unexpected error occurred. Please try again.
					</p>
					<button
						onClick={reset}
						style={{
							padding: '0.5rem 1.25rem',
							backgroundColor: '#111',
							color: '#fff',
							border: 'none',
							borderRadius: '6px',
							fontSize: '0.875rem',
							fontWeight: 500,
							cursor: 'pointer',
						}}
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
