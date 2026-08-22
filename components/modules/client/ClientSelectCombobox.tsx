'use client';

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface ClientSelectComboboxProps {
	id?: string;
	clients: { id: string; name: string }[];
	value: string;
	onChange: (clientId: string) => void;
	placeholder?: string;
}

export function ClientSelectCombobox({
	id,
	clients,
	value,
	onChange,
	placeholder = 'Select client...',
}: ClientSelectComboboxProps) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger id={id} className='w-full'>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{clients.map((client) => (
					<SelectItem key={client.id} value={client.id}>
						{client.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
