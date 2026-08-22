import { additionalFiles } from '@trigger.dev/build/extensions/core';
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
