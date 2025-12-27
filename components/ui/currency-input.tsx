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
			if (displayValue !== '') {
				setDisplayValue('');
			}
			return;
		}

		// Normalize current display value to a number for comparison
		const currentNumeric = parseFloat(displayValue.replace(/,/g, ''));

		// Only update if the external value is meaningfully different from what we are displaying.
		// This prevents "fighting" the user input (e.g. user types "1.", parsed is 1, prop is 1 -> don't overwrite "1." with "1")
		if (value !== currentNumeric) {
			const formatted = new Intl.NumberFormat('en-US', {
				minimumFractionDigits: 0,
				maximumFractionDigits: 2,
				useGrouping: true,
			}).format(value);
			setDisplayValue(formatted);
		}
	}, [value, displayValue]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let inputValue = e.target.value;

		// Allow digits, commas, and one dot
		if (!/^[\d,]*\.?\d*$/.test(inputValue)) {
			return; // Reject invalid chars
		}

		// Fix leading zero issue: if user types "5" while value is "0", input becomes "05".
		// We want to replace "0" with "5" unless it's "0." (decimal start).
		if (
			inputValue.length > 1 &&
			inputValue.startsWith('0') &&
			inputValue[1] !== '.'
		) {
			inputValue = inputValue.substring(1);
		}

		// Handle empty input -> undefined
		if (inputValue === '') {
			setDisplayValue('');
			onChange(undefined);
			return;
		}

		// Remove existing commas to get raw number string
		const rawValue = inputValue.replace(/,/g, '');
		const parts = rawValue.split('.');
		const integerPart = parts[0];
		const decimalPart = parts[1];

		// Format the integer part with commas
		const formattedInteger = integerPart.replace(
			/\B(?=(\d{3})+(?!\d))/g,
			','
		);

		// Reassemble
		let newDisplayValue = formattedInteger;
		if (parts.length > 1) {
			newDisplayValue += '.' + decimalPart;
		} else if (inputValue.endsWith('.')) {
			// User just typed the decimal point
			newDisplayValue += '.';
		}

		setDisplayValue(newDisplayValue);

		const numericValue = parseFloat(rawValue);
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
