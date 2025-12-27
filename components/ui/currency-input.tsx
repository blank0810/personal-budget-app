'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		'onChange' | 'value'
	> {
	value: number | undefined;
	onChange: (value: number | undefined) => void;
}

export const CurrencyInput = React.forwardRef<
	HTMLInputElement,
	CurrencyInputProps
>(({ value, onChange, placeholder, ...props }, ref) => {
	const [displayValue, setDisplayValue] = React.useState('');

	// Sync internal display state with external value prop
	React.useEffect(() => {
		if (value === undefined || value === null) {
			setDisplayValue('');
			return;
		}

		// checking if the input is currently focused is tricky with just useEffect
		// so we use a simple heuristic: if the parsed display value matches the props value,
		// preserve the display value (to keep partial inputs like "1." or "1.0"),
		// otherwise update it.

		// Actually, a simpler approach for a controlled component that formats on blur
		// or carefully on change is crucial.
		// Let's implement a "format on blur" strategy for simplicity and stability,
		// or a robust "format as you type" if we can.

		// For this iteration, let's try to keep it simple:
		// If we are not editing, show formatted.
		// If we are editing, we rely on the component's internal state handling changes.
		// BUT, if the external value changes (e.g. from initial load), we must update.

		// Let's just update if the numeric representation changes significantly
		// or if it's the first load.
		const currentNumeric = parseFloat(displayValue.replace(/,/g, ''));
		if (value !== currentNumeric) {
			// Format only if it's a "clean" update from outside,
			// usually initially or reset.
			// We can simply format it standardly.
			setDisplayValue(value.toString());
		}
	}, [value]); // eslint-disable-line react-hooks/exhaustive-deps

	// Improved strategy:
	// 1. Maintain displayValue.
	// 2. On Change: update displayValue, parse to number, call onChange.
	// 3. On Blur: format displayValue to nice string.

	// Let's rewrite the useEffect to be safer and only run when strictly needed,
	// or just rely on the heuristic that if `value` passed in is different from what we think it is, update.

	// Actually, let's just initialize.
	// When `value` comes in from outside (e.g. database load), we want to show it.
	// But if user is typing "100", `value` is 100.
	// If user types "1,000", `value` is 1000.

	// We will prioritize `displayValue` for rendering.
	// We will sync `value` -> `displayValue` ONLY if the numeric values mismatch
	// AND the user is not actively typing something equal.

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;

		// Allow digits, commas, and one dot
		if (!/^[\d,]*\.?\d*$/.test(inputValue)) {
			return; // Reject invalid chars
		}

		setDisplayValue(inputValue);

		const numericValue = parseFloat(inputValue.replace(/,/g, ''));
		if (!isNaN(numericValue)) {
			onChange(numericValue);
		} else {
			onChange(undefined);
		}
	};

	const handleBlur = () => {
		const numericValue = parseFloat(displayValue.replace(/,/g, ''));
		if (!isNaN(numericValue)) {
			const formatted = new Intl.NumberFormat('en-US', {
				minimumFractionDigits: 0,
				maximumFractionDigits: 2,
				useGrouping: true,
			}).format(numericValue);
			setDisplayValue(formatted);
		}
	};

	// To handle initial load properly:
	React.useEffect(() => {
		// Only update if we are essentially empty or vastly different,
		// avoiding overwriting "1." which is numeric 1.
		const currentParsed = parseFloat(displayValue.replace(/,/g, ''));
		if (value !== undefined && value !== currentParsed) {
			// It's an external update (or initial load).
			// We shouldn't format it nicely here because it might fight typing if `value` updates round-trip.
			// But typically form state updates are fast.
			// Let's just set it to string for now.
			// Optimization: if it looks like we are typing (cursor position etc), this is hard.
			// Simple path: just set string.

			// If the value passed in is roughly the same as we have, don't touch display.
			// e.g. display "1000." (value 1000) -> prop value 1000. Don't change display to "1000".
			if (currentParsed === value) return;

			// Otherwise, standard format (e.g. loading from DB)
			// But wait, if I type "1000", onChange sends 1000. Prop comes back 1000.
			// If I set display to "1000" (no commas), it breaks the "currency" feel during typing?
			// No, we want auto-formatting.

			// Let's keep it simple: On Blur does the formatting.
			// useEffect handles "reset" or "initial".
			setDisplayValue(value.toString());
		}
	}, [value]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<Input
			{...props}
			type='text'
			inputMode='decimal'
			ref={ref}
			value={displayValue}
			onChange={handleChange}
			onBlur={handleBlur}
			placeholder={placeholder}
		/>
	);
});

CurrencyInput.displayName = 'CurrencyInput';
