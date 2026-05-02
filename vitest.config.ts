import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		// Native tsconfig paths resolution — picks up `@/*` from tsconfig.json
		tsconfigPaths: true,
	},
	test: {
		environment: 'node',
		include: ['server/**/*.test.ts', 'lib/**/*.test.ts'],
		globals: false,
	},
});
