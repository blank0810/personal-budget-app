import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Version } from './changelog.types';

const CHANGELOG_DIR = path.join(process.cwd(), 'content', 'changelog');

export class ChangelogService {
	private static formatDate(value: unknown): string {
		if (value instanceof Date) {
			return value.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
		}
		return String(value);
	}

	static getLatestDate(): Date | null {
		const files = fs.readdirSync(CHANGELOG_DIR).filter((f) => f.endsWith('.md'));
		let latest: Date | null = null;

		for (const file of files) {
			const raw = fs.readFileSync(path.join(CHANGELOG_DIR, file), 'utf-8');
			const { data } = matter(raw);
			const d = data.date instanceof Date ? data.date : new Date(String(data.date));
			if (!isNaN(d.getTime()) && (!latest || d > latest)) {
				latest = d;
			}
		}

		return latest;
	}

	static getAllVersions(): Version[] {
		const files = fs.readdirSync(CHANGELOG_DIR).filter((f) => f.endsWith('.md'));

		const versions = files.map((file) => {
			const raw = fs.readFileSync(path.join(CHANGELOG_DIR, file), 'utf-8');
			const { data } = matter(raw);

			const patches = data.patches?.map((patch: Record<string, unknown>) => ({
				...patch,
				date: this.formatDate(patch.date),
			}));

			return {
				version: data.version,
				date: this.formatDate(data.date),
				title: data.title,
				description: data.description,
				features: data.features ?? [],
				status: data.status ?? 'released',
				patches: patches ?? undefined,
			} as Version;
		});

		// Sort by version number descending (v1.9.8 before v1.9.7 before v1.9)
		versions.sort((a, b) => {
			const aParts = a.version.replace('v', '').split('.').map(Number);
			const bParts = b.version.replace('v', '').split('.').map(Number);
			for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
				const aVal = aParts[i] ?? 0;
				const bVal = bParts[i] ?? 0;
				if (bVal !== aVal) return bVal - aVal;
			}
			return 0;
		});

		return versions;
	}
}
