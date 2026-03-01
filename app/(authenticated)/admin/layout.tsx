import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminService } from '@/server/modules/admin/admin.service';
import { AdminReauthDialog } from '@/components/modules/admin/AdminReauthDialog';
import { ExitAdminButton } from '@/components/modules/admin/ExitAdminButton';
import { AdminNav } from '@/components/modules/admin/AdminNav';
import { Shield } from 'lucide-react';

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();
	if (!session?.user?.id || session.user.role !== 'ADMIN') {
		redirect('/dashboard');
	}

	const isActive = await AdminService.isAdminSessionActive(session.user.id);

	if (!isActive) {
		return <AdminReauthDialog />;
	}

	return (
		<div>
			<div className='bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-sm text-amber-700 flex items-center justify-between'>
				<div className='flex items-center gap-2'>
					<Shield className='h-4 w-4' />
					<span>Admin mode active</span>
				</div>
				<ExitAdminButton />
			</div>
			<div className='border-b'>
				<div className='container mx-auto px-4'>
					<AdminNav />
				</div>
			</div>
			{children}
		</div>
	);
}
