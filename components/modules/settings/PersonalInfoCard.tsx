'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	User,
	Pencil,
	X,
	Lock,
	Loader2,
	Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	updateProfileAction,
	updatePhoneNumberAction,
} from '@/server/modules/notification/notification.controller';

export function PersonalInfoCard({
	name,
	email,
	phoneNumber,
}: {
	name: string | null;
	email: string;
	phoneNumber: string | null;
}) {
	const [editing, setEditing] = useState(false);
	const [nameValue, setNameValue] = useState(name || '');
	const [isPending, startTransition] = useTransition();

	const [editingPhone, setEditingPhone] = useState(false);
	const [phoneValue, setPhoneValue] = useState(phoneNumber || '');
	const [isPhonePending, startPhoneTransition] = useTransition();

	// E.164: '+' then 1-15 digits, first digit non-zero. The previous pattern was
	// /^\+639\d{9}$/ — Philippine mobile numbers only — which silently made the
	// field unusable for every other country.
	const isValidPhone = /^\+[1-9]\d{1,14}$/.test(phoneValue);

	function handleSave() {
		startTransition(async () => {
			const result = await updateProfileAction({ name: nameValue });
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success('Profile updated');
				setEditing(false);
			}
		});
	}

	function handleCancel() {
		setNameValue(name || '');
		setEditing(false);
	}

	function handlePhoneSave() {
		startPhoneTransition(async () => {
			const value = phoneValue.trim() || null;
			const result = await updatePhoneNumberAction(value);
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success(value ? 'Phone number updated' : 'Phone number removed');
				setEditingPhone(false);
			}
		});
	}

	function handlePhoneCancel() {
		setPhoneValue(phoneNumber || '');
		setEditingPhone(false);
	}

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2 text-lg">
					<User className="h-5 w-5" />
					Personal Information
				</CardTitle>
				{!editing && !editingPhone && (
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setEditing(true)}
					>
						<Pencil className="h-4 w-4" />
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="name">Name</Label>
					{editing ? (
						<Input
							id="name"
							value={nameValue}
							onChange={(e) => setNameValue(e.target.value)}
							placeholder="Your name"
							disabled={isPending}
						/>
					) : (
						<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50">
							{name || 'Not set'}
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">
						Email
						<Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />
					</Label>
					<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50 text-muted-foreground">
						{email}
					</p>
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="phone" className="flex items-center gap-1">
							<Phone className="h-3 w-3" />
							Phone Number
						</Label>
						{!editing && !editingPhone && (
							<Button
								variant="ghost"
								size="sm"
								className="h-6 px-2 text-xs"
								onClick={() => setEditingPhone(true)}
							>
								<Pencil className="h-3 w-3 mr-1" />
								{phoneNumber ? 'Edit' : 'Add'}
							</Button>
						)}
					</div>
					{editingPhone ? (
						<div className="space-y-2">
							<Input
								id="phone"
								value={phoneValue}
								onChange={(e) => setPhoneValue(e.target.value)}
								placeholder="+12125551234"
								disabled={isPhonePending}
							/>
							{phoneValue && !isValidPhone && (
								<p className="text-xs text-destructive">
									Include the country code, e.g. +12125551234
								</p>
							)}
							<div className="flex gap-2">
								<Button
									size="sm"
									onClick={handlePhoneSave}
									disabled={isPhonePending || (phoneValue.trim() !== '' && !isValidPhone)}
								>
									{isPhonePending ? (
										<Loader2 className="h-4 w-4 animate-spin mr-1" />
									) : null}
									Save
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={handlePhoneCancel}
									disabled={isPhonePending}
								>
									<X className="h-4 w-4 mr-1" />
									Cancel
								</Button>
							</div>
						</div>
					) : (
						<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50">
							{phoneNumber || (
								<span className="text-muted-foreground">Not set</span>
							)}
						</p>
					)}
				</div>
				{editing && (
					<div className="flex gap-2 pt-2">
						<Button
							size="sm"
							onClick={handleSave}
							disabled={isPending || nameValue.length < 2}
						>
							{isPending ? (
								<Loader2 className="h-4 w-4 animate-spin mr-1" />
							) : null}
							Save
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={handleCancel}
							disabled={isPending}
						>
							<X className="h-4 w-4 mr-1" />
							Cancel
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

