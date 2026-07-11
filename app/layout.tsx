import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { APP_URL } from '@/lib/url';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	metadataBase: new URL(APP_URL),
	title: 'Personal Budget App',
	description: 'Track your income, expenses, and net worth.',
	verification: {
		google: 'tk8aPfinR7x5MLciNPIEezfOOoyEV-r2Qf0qnsvi2eo',
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
				suppressHydrationWarning
			>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					{children}
					<Toaster richColors position="top-right" />
					<Analytics />
				</ThemeProvider>
			</body>
		</html>
	);
}
