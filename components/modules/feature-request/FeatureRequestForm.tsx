'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { MessageSquarePlus, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { submitFeatureRequestAction } from '@/server/modules/feature-request/feature-request.controller';

const CATEGORIES = [
	{ value: 'BUG', label: 'Bug Report' },
	{ value: 'ENHANCEMENT', label: 'Enhancement' },
	{ value: 'NEW_FEATURE', label: 'New Feature' },
	{ value: 'UI_UX', label: 'UI/UX' },
];

interface FeatureRequestFormProps {
	userEmail: string | null;
}

export function FeatureRequestForm({ userEmail }: FeatureRequestFormProps) {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [category, setCategory] = useState('');
	const [email, setEmail] = useState(userEmail || '');
	const [submitted, setSubmitted] = useState(false);
	const [isPending, startTransition] = useTransition();

	function handleSubmit() {
		startTransition(async () => {
			const result = await submitFeatureRequestAction({
				title,
				description,
				category,
				email,
			});

			if (result.error) {
				toast.error(result.error);
			} else {
				setSubmitted(true);
				toast.success('Request submitted! Thank you for your feedback.');
			}
		});
	}

	const canSubmit =
		title.trim().length >= 3 &&
		description.trim().length >= 10 &&
		category !== '' &&
		email.trim().length > 0;

	if (submitted) {
		return (
			<Card className='border-dashed'>
				<CardContent className='flex flex-col items-center justify-center py-12 text-center space-y-3'>
					<CheckCircle2 className='h-12 w-12 text-emerald-500' />
					<h3 className='text-lg font-semibold'>Thank you!</h3>
					<p className='text-sm text-muted-foreground max-w-md'>
						Your feature request has been submitted. We review every submission
						and ship the best ideas into future updates.
					</p>
					<Button
						variant='outline'
						size='sm'
						onClick={() => {
							setSubmitted(false);
							setTitle('');
							setDescription('');
							setCategory('');
							if (!userEmail) setEmail('');
						}}
					>
						Submit Another
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-lg'>
					<MessageSquarePlus className='h-5 w-5' />
					Request a Feature
				</CardTitle>
				<p className='text-sm text-muted-foreground'>
					Have an idea or found a bug? Let us know and we&apos;ll consider it
					for a future update.
				</p>
			</CardHeader>
			<CardContent className='space-y-4'>
				<div className='grid gap-4 sm:grid-cols-2'>
					<div className='space-y-2'>
						<Label htmlFor='request-title'>Title</Label>
						<Input
							id='request-title'
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder='Short summary of your idea'
							disabled={isPending}
							maxLength={100}
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='request-category'>Category</Label>
						<Select
							value={category}
							onValueChange={setCategory}
							disabled={isPending}
						>
							<SelectTrigger id='request-category'>
								<SelectValue placeholder='Select a category' />
							</SelectTrigger>
							<SelectContent>
								{CATEGORIES.map((cat) => (
									<SelectItem key={cat.value} value={cat.value}>
										{cat.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className='space-y-2'>
					<Label htmlFor='request-description'>Description</Label>
					<Textarea
						id='request-description'
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Describe what you'd like to see, how it should work, or what's broken..."
						disabled={isPending}
						rows={4}
						maxLength={1000}
					/>
					<p className='text-xs text-muted-foreground text-right'>
						{description.length}/1000
					</p>
				</div>
				{!userEmail && (
					<div className='space-y-2'>
						<Label htmlFor='request-email'>Your Email</Label>
						<Input
							id='request-email'
							type='email'
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder='your@email.com'
							disabled={isPending}
						/>
					</div>
				)}
				<Button
					onClick={handleSubmit}
					disabled={isPending || !canSubmit}
					className='w-full sm:w-auto'
				>
					{isPending ? (
						<Loader2 className='h-4 w-4 animate-spin mr-1' />
					) : (
						<Send className='h-4 w-4 mr-1' />
					)}
					Submit Request
				</Button>
			</CardContent>
		</Card>
	);
}
