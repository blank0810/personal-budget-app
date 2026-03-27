'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientForm } from './ClientForm';

export function ClientFormTrigger() {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button onClick={() => setOpen(true)}>
				<Plus className='mr-2 h-4 w-4' />
				Add Client
			</Button>
			<ClientForm mode='create' open={open} onOpenChange={setOpen} />
		</>
	);
}
