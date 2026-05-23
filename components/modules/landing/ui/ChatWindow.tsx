'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, ArrowUp } from 'lucide-react';
import { m, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * ChatWindow — the AI Advisor INTERACTIVE labelled-preview chat
 * (design-system §5A, master IA §6).
 *
 * HONESTY (PRODUCT.md — hard gate): this is NOT a live feature.
 *  - A persistent "Preview · the AI advisor is in development" label and a
 *    "Coming soon" pill sit in the header at all times.
 *  - A visible honesty line states the replies are scripted.
 *  - The bottom input row is visibly INERT (a non-interactive mock). The ONLY
 *    way to "talk" to it is the scripted prompt chips — there is no free-text
 *    field that could imply a live model.
 *  - No copy here is present-tense about live AI ("our AI analyzes…"). Every
 *    framing is preview / coming-soon / scripted.
 *
 * Interaction:
 *  - Three suggested prompt chips are shown.
 *  - Clicking a chip pushes it as a user bubble, shows a brief thinking
 *    indicator, then types the matching scripted advisor reply char-by-char
 *    with a blinking caret. The chips stay so the visitor can try another.
 *
 * Coherence: every number references the page's single freelancer story, PHP (₱):
 *   Software & tools 81% · ₱25,290 ahead this month · ₱64,200 income /
 *   ₱38,910 spending. These match the Hero mock + AI section copy.
 *
 * Art direction: this lives inside the section's DARK glowing panel, so the
 * chat surface is dark with light text (WCAG-AA on the dark panel).
 *
 * Motion: bubbles enter with a subtle spring; thinking dots animate; the
 * typed reply has a blinking caret. A single useReducedMotion() gate makes a
 * clicked chip render its full reply instantly (no typewriter), with no loop.
 */

type ChatRole = 'user' | 'ai';

interface ChatTurn {
	id: string;
	role: ChatRole;
	text: string;
}

/** Scripted question → answer map (3 pairs). */
interface ScriptedPrompt {
	id: string;
	/** Chip label + the user message that gets pushed. */
	question: string;
	/** The scripted advisor reply. */
	answer: string;
}

const PROMPTS: ScriptedPrompt[] = [
	{
		id: 'safe-to-spend',
		question: 'What is safe to spend this week?',
		answer: 'Around ₱3,800 this week keeps you on track. You are ₱25,290 ahead this month, but Software & tools is at 81%, so I am holding a little back for it.',
	},
	{
		id: 'overspending',
		question: 'Where am I overspending?',
		answer: 'Software & tools is the one to watch, at 81% of its budget with the month not over. Everything else has room. Spending sits at ₱38,910 against ₱64,200 of income.',
	},
	{
		id: 'can-i-afford',
		question: 'Can I afford a ₱15,000 purchase?',
		answer: 'Yes, with room to spare. You are ₱25,290 ahead this month, so ₱15,000 still leaves ₱10,290 of cushion. Just keep Software & tools from tipping over 100%.',
	},
];

/** The advisor greeting shown before any chip is clicked. */
const GREETING: ChatTurn = {
	id: 'greeting',
	role: 'ai',
	text: 'Hi there. Ask me anything about this month and I will answer from your numbers.',
};

// Timing (ms)
const THINK_DURATION = 900; // thinking indicator before a reply
const TYPE_SPEED = 22; // per character

export function ChatWindow() {
	const prefersReduced = useReducedMotion();

	const [turns, setTurns] = useState<ChatTurn[]>([GREETING]);
	const [thinking, setThinking] = useState(false);
	// Id + char count of the reply currently typing out (null when idle).
	const [typing, setTyping] = useState<{ id: string; chars: number } | null>(
		null,
	);
	const [busy, setBusy] = useState(false);
	const [askedIds, setAskedIds] = useState<string[]>([]);

	const scrollRef = useRef<HTMLDivElement>(null);
	const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
	const cancelledRef = useRef(false);

	// Clean up any in-flight timers on unmount.
	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			cancelledRef.current = true;
			timers.forEach(clearTimeout);
		};
	}, []);

	// Keep the latest turn in view inside the scroll container.
	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [turns, thinking, typing]);

	const wait = (ms: number) =>
		new Promise<void>((resolve) => {
			const t = setTimeout(resolve, ms);
			timersRef.current.push(t);
		});

	async function handleAsk(prompt: ScriptedPrompt) {
		if (busy) return;
		setBusy(true);
		setAskedIds((prev) =>
			prev.includes(prompt.id) ? prev : [...prev, prompt.id],
		);

		// 1) Push the user's question immediately.
		const userTurn: ChatTurn = {
			id: `${prompt.id}-q`,
			role: 'user',
			text: prompt.question,
		};
		setTurns((prev) => [...prev, userTurn]);

		const replyTurn: ChatTurn = {
			id: `${prompt.id}-a`,
			role: 'ai',
			text: prompt.answer,
		};

		// Reduced motion: no thinking delay, no typewriter — show it at once.
		if (prefersReduced) {
			setTurns((prev) => [...prev, replyTurn]);
			setBusy(false);
			return;
		}

		// 2) Thinking indicator.
		setThinking(true);
		await wait(THINK_DURATION);
		if (cancelledRef.current) return;
		setThinking(false);

		// 3) Reveal the reply bubble and type it out char-by-char.
		setTurns((prev) => [...prev, replyTurn]);
		setTyping({ id: replyTurn.id, chars: 0 });
		for (let i = 1; i <= prompt.answer.length; i++) {
			if (cancelledRef.current) return;
			setTyping({ id: replyTurn.id, chars: i });
			await wait(TYPE_SPEED);
		}
		if (cancelledRef.current) return;
		setTyping(null);
		setBusy(false);
	}

	return (
		<div className='flex h-full min-h-[440px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-sm'>
			{/* Header — persistent preview labelling, never implies live. */}
			<div className='flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3'>
				<div className='flex items-center gap-2.5'>
					<span className='flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/25'>
						<Bot className='h-4 w-4' aria-hidden='true' />
					</span>
					<div className='leading-tight'>
						<p className='text-sm font-semibold text-white'>
							AI Advisor
						</p>
						<p className='text-[11px] font-medium uppercase tracking-[0.06em] text-emerald-200/80'>
							Preview · the AI advisor is in development
						</p>
					</div>
				</div>
				<span className='shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-emerald-200'>
					Coming soon
				</span>
			</div>

			{/* Honesty line — scripted preview, stated plainly. */}
			<p className='border-b border-white/[0.06] px-4 py-2 text-[11px] leading-snug text-slate-400'>
				Responses are a scripted preview of what is coming. Pick a
				question to see how it will feel.
			</p>

			{/* Message viewport — fixed flex area, never grows the card. */}
			<div
				ref={scrollRef}
				className='flex-1 space-y-3 overflow-hidden px-4 py-4'
			>
				{turns.map((turn) => {
					const isTyping =
						!prefersReduced && typing?.id === turn.id;
					const shown = isTyping
						? turn.text.slice(0, typing.chars)
						: turn.text;
					const showCaret =
						isTyping && typing.chars < turn.text.length;
					return (
						<ChatBubble
							key={turn.id}
							role={turn.role}
							text={shown}
							showCaret={showCaret}
							prefersReduced={!!prefersReduced}
						/>
					);
				})}
				{thinking && <ThinkingIndicator />}
			</div>

			{/* Prompt chips — the ONLY interaction surface (honesty gate). */}
			<div className='border-t border-white/10 px-4 pt-3'>
				<div className='flex flex-wrap gap-2'>
					{PROMPTS.map((prompt) => {
						const asked = askedIds.includes(prompt.id);
						return (
							<button
								key={prompt.id}
								type='button'
								onClick={() => handleAsk(prompt)}
								disabled={busy}
								aria-label={`Try the scripted question: ${prompt.question}`}
								className={cn(
									'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60',
									'disabled:cursor-not-allowed disabled:opacity-50',
									asked
										? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15'
										: 'border-white/15 bg-white/[0.04] text-slate-200 hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white',
								)}
							>
								{prompt.question}
							</button>
						);
					})}
				</div>
			</div>

			{/* Inert input row — visibly NOT a usable field (honesty gate). */}
			<div className='px-4 pb-3 pt-3'>
				<div
					className='flex select-none items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2.5'
					aria-hidden='true'
				>
					<span className='flex-1 text-[13px] text-slate-500'>
						Free-text chat will open when the AI advisor ships
					</span>
					<span className='flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-slate-500'>
						<ArrowUp className='h-3.5 w-3.5' aria-hidden='true' />
					</span>
				</div>
			</div>
		</div>
	);
}

function ChatBubble({
	role,
	text,
	showCaret,
	prefersReduced,
}: {
	role: ChatRole;
	text: string;
	showCaret?: boolean;
	prefersReduced: boolean;
}) {
	const isUser = role === 'user';

	const initial = prefersReduced
		? { opacity: 0 }
		: { opacity: 0, y: 8, scale: 0.96 };
	const animate = prefersReduced
		? { opacity: 1 }
		: { opacity: 1, y: 0, scale: 1 };
	const transition = prefersReduced
		? { duration: 0.2 }
		: { type: 'spring' as const, stiffness: 420, damping: 30 };

	return (
		<m.div
			initial={initial}
			animate={animate}
			transition={transition}
			className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
		>
			<div
				className={cn(
					'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
					isUser
						? 'rounded-br-sm bg-emerald-500 text-white'
						: 'rounded-bl-sm border border-white/10 bg-white/[0.06] text-slate-100',
				)}
			>
				{text}
				{showCaret && (
					<span className='ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-emerald-300' />
				)}
			</div>
		</m.div>
	);
}

function ThinkingIndicator() {
	return (
		<div className='flex justify-start'>
			<div className='flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.06] px-3.5 py-3'>
				<span className='h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300/70 [animation-delay:0ms]' />
				<span className='h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300/70 [animation-delay:150ms]' />
				<span className='h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-300/70 [animation-delay:300ms]' />
			</div>
		</div>
	);
}
