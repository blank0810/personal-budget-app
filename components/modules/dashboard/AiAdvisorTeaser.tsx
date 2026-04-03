'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/contexts/currency-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummaryData {
	income: number;
	expenses: number;
	savings: number;
	rate: number;
}

interface AlertData {
	category: string;
	budget: number;
	spent: number;
	percent: number;
}

interface GoalItem {
	name: string;
	progress: number;
}

type RichCard =
	| { type: 'summary'; data: SummaryData }
	| { type: 'alert'; data: AlertData }
	| { type: 'goals'; data: GoalItem[] };

interface MockMessage {
	role: 'user' | 'ai';
	text: string;
	richCard?: RichCard;
}

// ---------------------------------------------------------------------------
// Mock conversation data
// ---------------------------------------------------------------------------

const MOCK_MESSAGES: MockMessage[] = [
	{ role: 'user', text: 'How am I doing this month?' },
	{
		role: 'ai',
		text: "You're on track! Here's your summary:",
		richCard: {
			type: 'summary',
			data: { income: 45000, expenses: 32000, savings: 13000, rate: 28.9 },
		},
	},
	{ role: 'user', text: 'Any spending alerts?' },
	{
		role: 'ai',
		text: 'Your dining expenses are 40% over budget this month.',
		richCard: {
			type: 'alert',
			data: { category: 'Dining', budget: 5000, spent: 7000, percent: 140 },
		},
	},
	{ role: 'user', text: 'What should I do?' },
	{
		role: 'ai',
		text: 'I suggest reducing dining by \u20b12,000 and moving it to your emergency fund. Want me to adjust your budget?',
	},
	{ role: 'user', text: 'Show my savings goals' },
	{
		role: 'ai',
		text: 'Here are your active goals:',
		richCard: {
			type: 'goals',
			data: [
				{ name: 'Emergency Fund', progress: 65 },
				{ name: 'New Laptop', progress: 40 },
			],
		},
	},
];

// ---------------------------------------------------------------------------
// Rich card sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ data }: { data: SummaryData }) {
	const { formatCurrency } = useCurrency();
	return (
		<div className='mt-2 rounded-xl border bg-card p-4 space-y-3'>
			<div className='flex items-center gap-2 mb-1'>
				<TrendingUp className='h-4 w-4 text-emerald-500' />
				<span className='text-sm font-semibold'>Monthly Summary</span>
			</div>
			<div className='grid grid-cols-3 gap-3 text-center'>
				<div>
					<p className='text-xs text-muted-foreground'>Income</p>
					<p className='text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums'>
						{formatCurrency(data.income)}
					</p>
				</div>
				<div>
					<p className='text-xs text-muted-foreground'>Expenses</p>
					<p className='text-sm font-bold text-red-500 dark:text-red-400 tabular-nums'>
						{formatCurrency(data.expenses)}
					</p>
				</div>
				<div>
					<p className='text-xs text-muted-foreground'>Saved</p>
					<p className='text-sm font-bold text-primary tabular-nums'>
						{formatCurrency(data.savings)}
					</p>
				</div>
			</div>
			<div>
				<div className='flex items-center justify-between mb-1'>
					<span className='text-xs text-muted-foreground'>Savings rate</span>
					<span className='text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
						{data.rate}%
					</span>
				</div>
				<div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
					<div
						className='h-full rounded-full bg-emerald-500'
						style={{ width: `${Math.min(data.rate, 100)}%` }}
					/>
				</div>
			</div>
		</div>
	);
}

function AlertCard({ data }: { data: AlertData }) {
	const { formatCurrency } = useCurrency();
	const overPercent = Math.min(data.percent, 200);
	return (
		<div className='mt-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3'>
			<div className='flex items-center gap-2'>
				<AlertTriangle className='h-4 w-4 text-amber-500' />
				<span className='text-sm font-semibold text-amber-700 dark:text-amber-400'>
					{data.category} — {data.percent}% of budget
				</span>
			</div>
			<div className='flex items-center justify-between text-xs text-muted-foreground'>
				<span>Budget: {formatCurrency(data.budget)}</span>
				<span className='text-red-500 font-semibold'>
					Spent: {formatCurrency(data.spent)}
				</span>
			</div>
			<div className='h-2 w-full rounded-full bg-amber-200 dark:bg-amber-900 overflow-hidden'>
				<div
					className='h-full rounded-full bg-amber-500'
					style={{ width: `${Math.min((overPercent / 200) * 100, 100)}%` }}
				/>
			</div>
		</div>
	);
}

function GoalsCard({ data }: { data: GoalItem[] }) {
	return (
		<div className='mt-2 rounded-xl border bg-card p-4 space-y-3'>
			<div className='flex items-center gap-2'>
				<Target className='h-4 w-4 text-primary' />
				<span className='text-sm font-semibold'>Active Goals</span>
			</div>
			{data.map((goal) => (
				<div key={goal.name} className='space-y-1.5'>
					<div className='flex items-center justify-between text-xs'>
						<span className='font-medium text-foreground'>{goal.name}</span>
						<span className='text-muted-foreground font-semibold tabular-nums'>
							{goal.progress}%
						</span>
					</div>
					<div className='h-2 w-full rounded-full bg-muted overflow-hidden'>
						<div
							className='h-full rounded-full bg-primary'
							style={{ width: `${goal.progress}%` }}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

function RichCardRenderer({ card }: { card: RichCard }) {
	if (card.type === 'summary') return <SummaryCard data={card.data} />;
	if (card.type === 'alert') return <AlertCard data={card.data} />;
	if (card.type === 'goals') return <GoalsCard data={card.data} />;
	return null;
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
	return (
		<div className='flex items-end gap-2 justify-start'>
			<div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10'>
				<Bot className='h-3.5 w-3.5 text-primary' />
			</div>
			<div className='rounded-2xl rounded-bl-sm bg-muted px-3 py-2'>
				<div className='flex items-center gap-1 h-4'>
					<span className='h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]' />
					<span className='h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]' />
					<span className='h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]' />
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Individual chat bubble
// ---------------------------------------------------------------------------

function ChatBubble({ message }: { message: MockMessage }) {
	const isUser = message.role === 'user';
	return (
		<div
			className={cn(
				'flex items-end gap-2',
				isUser ? 'justify-end' : 'justify-start'
			)}
			style={{
				animation: 'chat-fade-up 0.35s ease-out both',
			}}
		>
			{!isUser && (
				<div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10'>
					<Bot className='h-3.5 w-3.5 text-primary' />
				</div>
			)}
			<div className={cn('max-w-[82%]', isUser ? 'items-end' : 'items-start', 'flex flex-col')}>
				<div
					className={cn(
						'rounded-2xl px-3 py-2 text-xs leading-relaxed',
						isUser
							? 'rounded-br-sm bg-primary text-primary-foreground'
							: 'rounded-bl-sm bg-muted text-foreground'
					)}
				>
					{message.text}
				</div>
				{message.richCard && <RichCardRenderer card={message.richCard} />}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Timings
// ---------------------------------------------------------------------------

// How long each message is "displayed" before adding the next
const MESSAGE_INTERVAL_MS = 3000;
// Typing indicator duration before AI message appears
const TYPING_DURATION_MS = 1200;
// After all messages are shown, wait before showing announcement
const LOOP_PAUSE_MS = 2000;
// How long the announcement is shown
const ANNOUNCEMENT_DURATION_MS = 4000;
// Fade-out duration (matches CSS transition)
const FADE_OUT_MS = 600;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AiAdvisorTeaser() {
	const [visibleCount, setVisibleCount] = useState(0);
	const [showTyping, setShowTyping] = useState(false);
	const [fading, setFading] = useState(false);
	const [showAnnouncement, setShowAnnouncement] = useState(false);
	const chatEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let cancelled = false;

		async function sleep(ms: number) {
			return new Promise<void>((resolve) => {
				const t = setTimeout(() => {
					if (!cancelled) resolve();
				}, ms);
				return () => clearTimeout(t);
			});
		}

		async function runLoop() {
			while (!cancelled) {
				setVisibleCount(0);
				setShowTyping(false);
				setFading(false);
				setShowAnnouncement(false);

				// Initial pause before starting
				await sleep(1000);

				for (let i = 0; i < MOCK_MESSAGES.length; i++) {
					if (cancelled) return;

					const msg = MOCK_MESSAGES[i];

					// Show typing indicator before AI messages
					if (msg.role === 'ai') {
						setShowTyping(true);
						await sleep(TYPING_DURATION_MS);
						if (cancelled) return;
						setShowTyping(false);
					}

					setVisibleCount(i + 1);
					await sleep(MESSAGE_INTERVAL_MS);
				}

				// All messages shown — fade out chat
				await sleep(LOOP_PAUSE_MS);
				if (cancelled) return;

				setFading(true);
				await sleep(FADE_OUT_MS);
				if (cancelled) return;

				// Show announcement
				setShowAnnouncement(true);
				await sleep(ANNOUNCEMENT_DURATION_MS);
				if (cancelled) return;

				setShowAnnouncement(false);
				await sleep(FADE_OUT_MS);
			}
		}

		runLoop();

		return () => {
			cancelled = true;
		};
	}, []);

	// Auto-scroll chat container (not the page) to bottom as messages appear
	useEffect(() => {
		const el = chatEndRef.current?.parentElement;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	}, [visibleCount, showTyping]);

	const visibleMessages = MOCK_MESSAGES.slice(0, visibleCount);

	return (
		<>
			{/* Keyframe for individual message entrance */}
			<style>{`
				@keyframes chat-fade-up {
					from { opacity: 0; transform: translateY(10px); }
					to   { opacity: 1; transform: translateY(0); }
				}
			`}</style>

			<Card className='flex flex-col h-full overflow-hidden max-h-[500px]'>
				{/* Header */}
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3 shrink-0'>
					<div className='flex items-center gap-2'>
						<div className='flex h-7 w-7 items-center justify-center rounded-full bg-primary/10'>
							<Bot className='h-4 w-4 text-primary' />
						</div>
						<CardTitle className='text-base'>AI Financial Advisor</CardTitle>
					</div>
					<Badge variant='outline' className='text-[10px] text-muted-foreground shrink-0'>
						Coming Soon
					</Badge>
				</CardHeader>

				{/* Chat area */}
				<CardContent className='flex flex-1 flex-col gap-0 p-0 min-h-0 relative'>
					{/* Messages viewport */}
					<div
						className={cn(
							'flex-1 min-h-0 overflow-hidden relative pointer-events-none transition-opacity duration-500',
							(fading || showAnnouncement) ? 'opacity-0' : 'opacity-100'
						)}
					>
						{/* Gradient mask at top */}
						<div className='absolute inset-x-0 top-0 h-8 z-10 bg-gradient-to-b from-card to-transparent pointer-events-none' />

						<div className='h-full overflow-y-auto px-4 py-3 space-y-3 flex flex-col justify-end'>
							<div className='flex-1' />
							{visibleMessages.map((msg, idx) => (
								<ChatBubble key={idx} message={msg} />
							))}
							{showTyping && <TypingIndicator />}
							<div ref={chatEndRef} />
						</div>
					</div>

					{/* Announcement overlay -- shows between loops */}
					<div
						className={cn(
							'absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center pointer-events-none transition-opacity duration-500',
							showAnnouncement ? 'opacity-100' : 'opacity-0'
						)}
					>
						<div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary/10'>
							<Bot className='h-8 w-8 text-primary' />
						</div>
						<div className='space-y-2'>
							<h3 className='text-lg font-bold'>Your AI Financial Advisor</h3>
							<p className='text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed'>
								Analyze spending, get budget suggestions, and manage your finances with AI — coming soon.
							</p>
						</div>
						<Badge className='bg-primary/10 text-primary border-primary/20 hover:bg-primary/10'>
							Coming Soon
						</Badge>
					</div>

					{/* Fake input bar */}
					<div className={cn(
						'shrink-0 px-4 py-3 border-t pointer-events-none transition-opacity duration-500',
						showAnnouncement ? 'opacity-0' : 'opacity-100'
					)}>
						<div className='flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-2'>
							<span className='flex-1 text-xs text-muted-foreground/60 select-none'>
								Ask your financial advisor...
							</span>
							<Send className='h-3.5 w-3.5 text-muted-foreground/40 shrink-0' />
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	);
}
