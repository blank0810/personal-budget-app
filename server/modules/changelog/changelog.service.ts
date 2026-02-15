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

		// Sort by version number descending (v1.8 before v1.7)
		versions.sort((a, b) => {
			const aNum = parseFloat(a.version.replace('v', ''));
			const bNum = parseFloat(b.version.replace('v', ''));
			return bNum - aNum;
		});

		return versions;
	}
}
