'use client';

import { useState, useCallback } from 'react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { adminGetUsersAction } from '@/server/modules/admin/admin.controller';
import { format } from 'date-fns';
import { Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { UserDetailDrawer } from './UserDetailDrawer';

interface UserRow {
	id: string;
	name: string | null;
	email: string;
	role: string;
	currency: string;
	isDisabled: boolean;
	isOnboarded: boolean;
	createdAt: string | Date;
	lastLoginAt: string | Date | null;
	transactionCount: number;
	accountCount: number;
}

interface UserTableProps {
	initialUsers: UserRow[];
	initialTotal: number;
	initialPages: number;
}

export function UserTable({
	initialUsers,
	initialTotal,
	initialPages,
}: UserTableProps) {
	const [users, setUsers] = useState(initialUsers);
	const [total, setTotal] = useState(initialTotal);
	const [pages, setPages] = useState(initialPages);
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [roleFilter, setRoleFilter] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [loading, setLoading] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

	const fetchUsers = useCallback(
		async (p: number, s?: string, role?: string, status?: string) => {
			setLoading(true);
			const result = await adminGetUsersAction(p, s || undefined, {
				role: role || undefined,
				status: status || undefined,
			});
			setLoading(false);

			if (result.success && 'users' in result) {
				setUsers(
					(
						result as {
							users: UserRow[];
							total: number;
							pages: number;
						}
					).users
				);
				setTotal(
					(result as { total: number }).total
				);
				setPages(
					(result as { pages: number }).pages
				);
				setPage(p);
			}
		},
		[]
	);

	function handleSearch() {
		fetchUsers(1, search, roleFilter, statusFilter);
	}

	function handlePageChange(newPage: number) {
		fetchUsers(newPage, search, roleFilter, statusFilter);
	}

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap gap-3'>
				<div className='flex-1 min-w-[200px] flex gap-2'>
					<Input
						placeholder='Search by name or email...'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
					/>
					<Button
						variant='outline'
						size='icon'
						onClick={handleSearch}
						disabled={loading}
					>
						{loading ? (
							<Loader2 className='h-4 w-4 animate-spin' />
						) : (
							<Search className='h-4 w-4' />
						)}
					</Button>
				</div>
				<Select
					value={roleFilter}
					onValueChange={(v) => {
						setRoleFilter(v === '__all__' ? '' : v);
						fetchUsers(
							1,
							search,
							v === '__all__' ? '' : v,
							statusFilter
						);
					}}
				>
					<SelectTrigger className='w-[130px]'>
						<SelectValue placeholder='Role' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='__all__'>All Roles</SelectItem>
						<SelectItem value='USER'>User</SelectItem>
						<SelectItem value='ADMIN'>Admin</SelectItem>
					</SelectContent>
				</Select>
				<Select
					value={statusFilter}
					onValueChange={(v) => {
						setStatusFilter(v === '__all__' ? '' : v);
						fetchUsers(
							1,
							search,
							roleFilter,
							v === '__all__' ? '' : v
						);
					}}
				>
					<SelectTrigger className='w-[130px]'>
						<SelectValue placeholder='Status' />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='__all__'>All Status</SelectItem>
						<SelectItem value='active'>Active</SelectItem>
						<SelectItem value='disabled'>Disabled</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className='text-sm text-muted-foreground'>
				{total} users total
			</div>

			<div className='overflow-x-auto rounded border'>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead className='hidden md:table-cell'>
								Currency
							</TableHead>
							<TableHead className='hidden md:table-cell'>
								Signed Up
							</TableHead>
							<TableHead className='hidden lg:table-cell'>
								Last Login
							</TableHead>
							<TableHead className='text-right hidden sm:table-cell'>
								Accts
							</TableHead>
							<TableHead className='text-right hidden sm:table-cell'>
								Txns
							</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((user) => (
							<TableRow
								key={user.id}
								className='cursor-pointer hover:bg-muted/50'
								onClick={() => setSelectedUserId(user.id)}
							>
								<TableCell className='font-medium'>
									{user.name || '-'}
								</TableCell>
								<TableCell className='text-sm'>
									{user.email}
								</TableCell>
								<TableCell>
									<Badge
										variant={
											user.role === 'ADMIN'
												? 'default'
												: 'outline'
										}
										className='text-xs'
									>
										{user.role}
									</Badge>
								</TableCell>
								<TableCell className='hidden md:table-cell text-sm'>
									{user.currency}
								</TableCell>
								<TableCell className='hidden md:table-cell text-sm'>
									{format(
										new Date(user.createdAt),
										'MMM d, yyyy'
									)}
								</TableCell>
								<TableCell className='hidden lg:table-cell text-sm'>
									{user.lastLoginAt
										? format(
												new Date(user.lastLoginAt),
												'MMM d, yyyy'
											)
										: 'Never'}
								</TableCell>
								<TableCell className='text-right hidden sm:table-cell text-sm'>
									{user.accountCount}
								</TableCell>
								<TableCell className='text-right hidden sm:table-cell text-sm'>
									{user.transactionCount}
								</TableCell>
								<TableCell>
									<Badge
										variant={
											user.isDisabled
												? 'destructive'
												: 'outline'
										}
										className='text-xs'
									>
										{user.isDisabled
											? 'Disabled'
											: 'Active'}
									</Badge>
								</TableCell>
							</TableRow>
						))}
						{users.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={9}
									className='text-center py-8 text-muted-foreground'
								>
									No users found
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{pages > 1 && (
				<div className='flex items-center justify-between'>
					<span className='text-sm text-muted-foreground'>
						Page {page} of {pages}
					</span>
					<div className='flex gap-2'>
						<Button
							variant='outline'
							size='sm'
							disabled={page <= 1}
							onClick={() => handlePageChange(page - 1)}
						>
							<ChevronLeft className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='sm'
							disabled={page >= pages}
							onClick={() => handlePageChange(page + 1)}
						>
							<ChevronRight className='h-4 w-4' />
						</Button>
					</div>
				</div>
			)}

			<UserDetailDrawer
				userId={selectedUserId}
				onClose={() => setSelectedUserId(null)}
			/>
		</div>
	);
}
