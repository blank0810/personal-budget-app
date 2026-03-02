import { AdminUsersService } from '@/server/modules/admin/admin-users.service';
import { UserTable } from '@/components/modules/admin/UserTable';
import { serialize } from '@/lib/serialization';

export default async function AdminUsersPage() {
	const result = await AdminUsersService.getUsers(1);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				User Management
			</h1>
			<UserTable
				initialUsers={serialize(result.users)}
				initialTotal={result.total}
				initialPages={result.pages}
			/>
		</div>
	);
}
