'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
	Pencil,
	X,
	Loader2,
	Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
	updateBusinessProfileAction,
} from '@/server/modules/notification/notification.controller';

export function BusinessProfileCard({
	businessName,
	businessAddress,
	businessTaxId,
	paymentInstructions,
}: {
	businessName: string | null;
	businessAddress: string | null;
	businessTaxId: string | null;
	paymentInstructions: string | null;
}) {
	const [editing, setEditing] = useState(false);
	const [nameValue, setNameValue] = useState(businessName || '');
	const [addressValue, setAddressValue] = useState(businessAddress || '');
	const [taxIdValue, setTaxIdValue] = useState(businessTaxId || '');
	const [paymentValue, setPaymentValue] = useState(paymentInstructions || '');
	const [isPending, startTransition] = useTransition();

	function handleSave() {
		startTransition(async () => {
			const result = await updateBusinessProfileAction({
				businessName: nameValue.trim() || null,
				businessAddress: addressValue.trim() || null,
				businessTaxId: taxIdValue.trim() || null,
				paymentInstructions: paymentValue.trim() || null,
			});
			if (result.error) {
				toast.error(result.error);
			} else {
				toast.success('Business details updated');
				setEditing(false);
			}
		});
	}

	function handleCancel() {
		setNameValue(businessName || '');
		setAddressValue(businessAddress || '');
		setTaxIdValue(businessTaxId || '');
		setPaymentValue(paymentInstructions || '');
		setEditing(false);
	}

	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="flex flex-row items-center justify-between">
				<div className="space-y-1">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Building2 className="h-5 w-5" />
						Business &amp; Invoice Details
					</CardTitle>
					<p className="text-sm text-muted-foreground">
						These details appear on invoices you generate.
					</p>
				</div>
				{!editing && (
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
					<Label htmlFor="businessName">Business Name</Label>
					{editing ? (
						<div className="space-y-1">
							<Input
								id="businessName"
								value={nameValue}
								onChange={(e) => setNameValue(e.target.value)}
								placeholder="Your business or trading name"
								disabled={isPending}
							/>
							<p className="text-xs text-muted-foreground">
								Appears as the heading on your invoices.
							</p>
						</div>
					) : (
						<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50">
							{businessName || (
								<span className="text-muted-foreground">Not set</span>
							)}
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="businessTaxId">Tax ID</Label>
					{editing ? (
						<div className="space-y-1">
							<Input
								id="businessTaxId"
								value={taxIdValue}
								onChange={(e) => setTaxIdValue(e.target.value)}
								placeholder="e.g. TIN, VAT, ABN"
								disabled={isPending}
							/>
							<p className="text-xs text-muted-foreground">
								e.g. TIN, VAT, ABN
							</p>
						</div>
					) : (
						<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50">
							{businessTaxId || (
								<span className="text-muted-foreground">Not set</span>
							)}
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="businessAddress">Business Address</Label>
					{editing ? (
						<Textarea
							id="businessAddress"
							value={addressValue}
							onChange={(e) => setAddressValue(e.target.value)}
							placeholder="Street, city, province, postal code"
							disabled={isPending}
							rows={3}
						/>
					) : (
						<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50 whitespace-pre-wrap">
							{businessAddress || (
								<span className="text-muted-foreground">Not set</span>
							)}
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="paymentInstructions">Payment instructions (optional)</Label>
					{editing ? (
						<div className="space-y-1">
							<Textarea
								id="paymentInstructions"
								value={paymentValue}
								onChange={(e) => setPaymentValue(e.target.value)}
								placeholder="Any extra instructions for clients (e.g. reference number format)."
								disabled={isPending}
								rows={4}
							/>
							<p className="text-xs text-muted-foreground">
								Free-form notes shown in the payment section of the invoice.
							</p>
						</div>
					) : (
						<p className="text-sm font-medium py-2 px-3 rounded-md bg-muted/50 whitespace-pre-wrap">
							{paymentInstructions || (
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
							disabled={isPending}
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

