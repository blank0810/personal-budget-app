import {
	additionalFiles,
	syncVercelEnvVars,
} from '@trigger.dev/build/extensions/core';
import { prismaExtension } from '@trigger.dev/build/extensions/prisma';
import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
	project: 'proj_svvnpcaqwzzufzlkeecv',
	dirs: ['./trigger'],
	// Keep deployed and local task cwd behavior aligned. The PDF template loads
	// fonts from path.join(process.cwd(), 'public', 'fonts').
	legacyDevProcessCwdBehaviour: false,
	build: {
		// CurrencyFallback.ttf fixes currency glyphs that DM Sans does not carry.
		// Copy every registered font into the deployed task bundle.
		extensions: [
			additionalFiles({ files: ['./public/fonts/**'] }),
			// Tasks run on Trigger.dev's own infrastructure and see none of
			// Vercel's environment. Rather than maintaining DATABASE_URL and
			// BLOB_READ_WRITE_TOKEN in two places — where rotating one and
			// forgetting the other silently breaks exports — pull them from Vercel
			// at deploy time. Set VERCEL_ACCESS_TOKEN and VERCEL_PROJECT_ID in the
			// Trigger.dev dashboard to switch this on; until then it stays off so
			// the deploy still succeeds with manually-set variables.
			...(process.env.VERCEL_ACCESS_TOKEN && process.env.VERCEL_PROJECT_ID
				? [syncVercelEnvVars()]
				: []),
			// The task queries Prisma directly, and the deployed bundle ships no
			// query engine unless this runs `prisma generate` during the build.
			// migrate stays false: Vercel's build:prod already runs
			// `prisma migrate deploy`, and two deployers racing to migrate the same
			// database is a good way to lose one.
			prismaExtension({
				mode: 'legacy',
				schema: 'prisma/schema.prisma',
				migrate: false,
			}),
		],
	},
	maxDuration: 900,
});
