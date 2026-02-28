'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { exitAdminMode } from '@/server/modules/admin/admin.controller';
import { toast } from 'sonner';

export function ExitAdminButton() {
	const router = useRouter();

	async function handleExit() {
		const result = await exitAdminMode();
		if (result.success) {
			toast.success('Admin mode deactivated');
			router.push('/dashboard');
		}
	}

	return (
		<Button
			variant='ghost'
			size='sm'
			onClick={handleExit}
			className='text-amber-700 hover:text-amber-800 hover:bg-amber-500/10'
		>
			<LogOut className='h-4 w-4 mr-1' />
			Exit Admin
		</Button>
	);
}
