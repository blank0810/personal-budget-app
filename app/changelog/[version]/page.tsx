import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Wallet } from 'lucide-react';
import { ChangelogView } from '@/components/modules/changelog/ChangelogView';
import { absoluteUrl } from '@/lib/url';
import { ChangelogService } from '@/server/modules/changelog/changelog.service';

type ChangelogVersionPageProps = {
	params: Promise<{ version: string }>;
};

function normalizeDescription(description: string): string {
	return description.replace(/\s+/g, ' ').trim();
}

export async function generateStaticParams() {
	return ChangelogService.getAllSlugs().map((version) => ({ version }));
}

export async function generateMetadata({
	params,
}: ChangelogVersionPageProps): Promise<Metadata> {
	const { version: slug } = await params;
	const version = ChangelogService.getBySlug(slug);

	if (!version) {
		return { title: 'Release not found · Budget Planner' };
	}

	const pageTitle = `${version.title} (${version.version})`;
	const description = normalizeDescription(version.description);

	return {
		title: `${pageTitle} · Budget Planner`,
		description,
		alternates: {
			canonical: absoluteUrl(`/changelog/${version.version}`),
		},
		openGraph: {
			title: pageTitle,
			description,
		},
		twitter: {
			title: pageTitle,
			description,
		},
	};
}

export default async function ChangelogVersionPage({
	params,
}: ChangelogVersionPageProps) {
	const { version: slug } = await params;
	const version = ChangelogService.getBySlug(slug);

	if (!version) {
		notFound();
	}

	const description = normalizeDescription(version.description);
	const publishedVersion = ChangelogService.getSitemapEntries().find(
		(entry) => entry.version === version.version
	);
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: `${version.title} (${version.version})`,
		description,
		datePublished: publishedVersion?.date.toISOString(),
		url: absoluteUrl(`/changelog/${version.version}`),
		author: {
			'@type': 'Organization',
			name: 'Budget Planner',
		},
		publisher: {
			'@type': 'Organization',
			name: 'Budget Planner',
		},
	};

	return (
		<div className='min-h-screen bg-background'>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
				}}
			/>

			<header className='sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
				<div className='mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6 py-3'>
					<Link href='/' className='flex items-center gap-2'>
						<div className='bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg'>
							<Wallet className='size-4' />
						</div>
						<span className='font-semibold'>Budget Planner</span>
					</Link>
					<Link
						href='/changelog'
						className='inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
					>
						<ArrowLeft className='h-4 w-4' />
						All updates
					</Link>
				</div>
			</header>

			<main className='mx-auto max-w-4xl px-4 sm:px-6 py-8 md:py-12'>
				<div className='mb-6 space-y-2'>
					<p className='text-sm font-medium text-muted-foreground'>
						{version.version} ·{' '}
						{version.status === 'current' ? 'Latest release' : 'Released'} ·{' '}
						{version.date}
					</p>
					<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
						{version.title}
					</h1>
				</div>
				<div className='rounded-lg border p-4'>
					<ChangelogView versions={[version]} />
				</div>
			</main>
		</div>
	);
}
