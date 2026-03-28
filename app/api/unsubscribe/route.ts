import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { UserService } from '@/server/modules/user/user.service';
import { NotificationService } from '@/server/modules/notification/notification.service';

export function generateUnsubscribeToken(userId: string): string {
	const secret = process.env.NEXTAUTH_SECRET!;
	return crypto.createHmac('sha256', secret).update(userId).digest('hex');
}

function verifyUnsubscribeToken(userId: string, token: string): boolean {
	const expected = generateUnsubscribeToken(userId);
	if (expected.length !== token.length) return false;
	return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
	const userId = req.nextUrl.searchParams.get('userId');
	const token = req.nextUrl.searchParams.get('token');

	if (!userId || !token) {
		return new NextResponse(renderHtml('Invalid unsubscribe link.', true), {
			status: 400,
			headers: { 'Content-Type': 'text/html' },
		});
	}

	if (!verifyUnsubscribeToken(userId, token)) {
		return new NextResponse(
			renderHtml('Invalid or expired unsubscribe link.', true),
			{ status: 403, headers: { 'Content-Type': 'text/html' } }
		);
	}

	try {
		const user = await UserService.findById(userId);

		if (!user) {
			return new NextResponse(
				renderHtml('User not found.', true),
				{ status: 404, headers: { 'Content-Type': 'text/html' } }
			);
		}

		// Check if already unsubscribed
		const isEnabled = await NotificationService.isEnabled(userId, 'monthly_report');
		if (!isEnabled) {
			return new NextResponse(
				renderHtml('You are already unsubscribed from monthly reports.'),
				{ status: 200, headers: { 'Content-Type': 'text/html' } }
			);
		}

		await NotificationService.updatePreference(userId, 'monthly_report', false);

		return new NextResponse(
			renderHtml('Successfully unsubscribed from monthly reports. You can re-enable this anytime from the Profile page.'),
			{ status: 200, headers: { 'Content-Type': 'text/html' } }
		);
	} catch {
		return new NextResponse(
			renderHtml('Something went wrong. Please try again later.', true),
			{ status: 500, headers: { 'Content-Type': 'text/html' } }
		);
	}
}

function renderHtml(message: string, isError: boolean = false): string {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
	const color = isError ? '#DC2626' : '#0D9488';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Budget Planner - Unsubscribe</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #F9FAFB; }
    .card { background: white; padding: 48px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; max-width: 420px; }
    h1 { font-size: 20px; color: ${color}; margin: 0 0 12px; }
    p { color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
    a { color: #0D9488; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Budget Planner</h1>
    <p>${message}</p>
    <a href="${appUrl}/reports">Go to Reports &rarr;</a>
  </div>
</body>
</html>`;
}
