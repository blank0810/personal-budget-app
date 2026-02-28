import 'next-auth';

declare module 'next-auth' {
	interface Session {
		user: {
			id: string;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			currency: string;
			role: string;
			isOnboarded: boolean;
			isDisabled: boolean;
		};
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		currency?: string;
		role?: string;
		isOnboarded?: boolean;
		isDisabled?: boolean;
	}
}
