'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	CheckCircle2,
	Zap,
	Wrench,
	ChevronRight,
	ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Patch {
	version: string;
	date: string;
	title: string;
	description: string;
	features: {
		title: string;
		items: string[];
	}[];
}

interface Version {
	version: string;
	date: string;
	title: string;
	description: string;
	features: {
		title: string;
		items: string[];
	}[];
	status: 'current' | 'released';
	patches?: Patch[];
}

interface ChangelogViewProps {
	versions: Version[];
}

export function ChangelogView({ versions }: ChangelogViewProps) {
	return (
		<div className='relative border-l-2 border-muted ml-4 md:ml-6 space-y-6'>
			{versions.map((version, index) => (
				<details
					key={version.version}
					open={index === 0}
					className='group relative'
				>
					{/* Timeline Dot */}
					<div
						className={cn(
							'absolute -left-[9px] top-4 h-4 w-4 rounded-full border-2 transition-colors',
							version.status === 'current'
								? 'bg-primary border-primary ring-4 ring-primary/20'
								: 'bg-background border-muted-foreground group-open:border-primary group-open:bg-primary/20'
						)}
					/>

					{/* Collapsed Header (Summary) */}
					<summary className='cursor-pointer list-none pl-8 md:pl-12 py-3 pr-4 rounded-r-lg hover:bg-muted/50 transition-colors'>
						<div className='flex items-center justify-between gap-4'>
							<div className='flex items-center gap-3 flex-wrap'>
								<h2 className='text-xl font-bold text-foreground'>
									{version.version}
								</h2>
								{version.status === 'current' && (
									<Badge
										variant='default'
										className='bg-emerald-600 hover:bg-emerald-700'
									>
										Latest
									</Badge>
								)}
								<span className='text-muted-foreground font-medium'>
									·
								</span>
								<h3 className='text-base font-medium text-primary'>
									{version.title}
								</h3>
								{version.patches && version.patches.length > 0 && (
									<Badge
										variant='outline'
										className='border-amber-500 text-amber-700 dark:text-amber-400 text-xs'
									>
										<Wrench className='h-3 w-3 mr-1' />
										{version.patches.length} patch
										{version.patches.length > 1 ? 'es' : ''}
									</Badge>
								)}
							</div>
							<div className='flex items-center gap-3 shrink-0'>
								<span className='text-sm text-muted-foreground hidden sm:inline'>
									{version.date}
								</span>
								<ChevronRight className='h-5 w-5 text-muted-foreground transition-transform duration-200 group-open:rotate-90' />
							</div>
						</div>
					</summary>

					{/* Expanded Content */}
					<div className='pl-8 md:pl-12 pr-4 pb-6 pt-2 space-y-6 animate-in slide-in-from-top-2 duration-200'>
						{/* Description */}
						<p className='text-muted-foreground leading-relaxed'>
							{version.description}
						</p>

						{/* Patches */}
						{version.patches && version.patches.length > 0 && (
							<div className='space-y-3'>
								{version.patches.map((patch) => (
									<details
										key={patch.version}
										className='group/patch border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20 rounded-r-lg overflow-hidden'
									>
										<summary className='cursor-pointer list-none p-4 flex items-center justify-between gap-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors'>
											<div className='flex items-center gap-2 flex-wrap'>
												<Wrench className='h-4 w-4 text-amber-600' />
												<span className='font-bold text-base'>
													{patch.version}
												</span>
												<Badge
													variant='outline'
													className='border-amber-500 text-amber-700 dark:text-amber-400'
												>
													Patch
												</Badge>
												<span className='text-sm text-amber-800 dark:text-amber-300'>
													· {patch.title}
												</span>
											</div>
											<div className='flex items-center gap-2 shrink-0'>
												<span className='text-xs text-muted-foreground hidden sm:inline'>
													{patch.date}
												</span>
												<ChevronDown className='h-4 w-4 text-muted-foreground transition-transform duration-200 group-open/patch:rotate-180' />
											</div>
										</summary>
										<div className='p-4 pt-0 space-y-4'>
											<p className='text-sm text-muted-foreground'>
												{patch.description}
											</p>
											<div className='grid gap-4 md:grid-cols-2'>
												{patch.features.map((feature) => (
													<Card
														key={feature.title}
														className='bg-background/80 border-amber-200 dark:border-amber-800 shadow-sm'
													>
														<CardHeader className='pb-2'>
															<CardTitle className='text-sm font-semibold flex items-center gap-2'>
																<Wrench className='h-3 w-3 text-amber-500' />
																{feature.title}
															</CardTitle>
														</CardHeader>
														<CardContent>
															<ul className='space-y-1.5'>
																{feature.items.map(
																	(item, i) => (
																		<li
																			key={i}
																			className='text-xs text-muted-foreground flex items-start gap-2'
																		>
																			<span className='mt-1 h-1 w-1 rounded-full bg-amber-500 shrink-0' />
																			{item}
																		</li>
																	)
																)}
															</ul>
														</CardContent>
													</Card>
												))}
											</div>
										</div>
									</details>
								))}
							</div>
						)}

						{/* Main Version Features */}
						<div className='grid gap-4 md:grid-cols-2'>
							{version.features.map((feature) => (
								<Card
									key={feature.title}
									className='bg-card/50 border-muted shadow-sm'
								>
									<CardHeader className='pb-2 pt-4'>
										<CardTitle className='text-sm font-semibold flex items-center gap-2'>
											{version.status === 'current' ? (
												<Zap className='h-4 w-4 text-amber-500' />
											) : (
												<CheckCircle2 className='h-4 w-4 text-emerald-500' />
											)}
											{feature.title}
										</CardTitle>
									</CardHeader>
									<CardContent className='pb-4'>
										<ul className='space-y-2'>
											{feature.items.map((item, i) => (
												<li
													key={i}
													className='text-sm text-muted-foreground flex items-start gap-2'
												>
													<span className='mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0' />
													{item}
												</li>
											))}
										</ul>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</details>
			))}
		</div>
	);
}
