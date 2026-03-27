import prisma from '@/lib/prisma';
import { getRedisConnection } from '@/lib/redis';
import { RequestCategory } from '@prisma/client';
import { EmailService } from '@/server/modules/email/email.service';
import { CATEGORY_LABELS } from './feature-request.types';

const ADMIN_EMAIL = process.env.SMTP_USER || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

export const FeatureRequestService = {
	/**
	 * Get all feature requests (public fields only, newest first)
	 * Excludes DECLINED requests from public view
	 */
	async getAll() {
		return prisma.featureRequest.findMany({
			where: { status: { not: 'DECLINED' } },
			select: {
				id: true,
				title: true,
				description: true,
				category: true,
				status: true,
				updatedAt: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
		});
	},

	/**
	 * Get completed feature requests (for changelog/completed section)
	 */
	async getCompleted() {
		return prisma.featureRequest.findMany({
			where: { status: 'COMPLETED' },
			select: {
				id: true,
				title: true,
				description: true,
				category: true,
				status: true,
				adminNotes: true,
				updatedAt: true,
				createdAt: true,
			},
			orderBy: { updatedAt: 'desc' },
		});
	},

	async isRateLimited(ip: string): Promise<boolean> {
		const redis = getRedisConnection();
		const key = `feature-request:rate:${ip}`;
		const count = await redis.get(key);
		return count !== null && parseInt(count, 10) >= RATE_LIMIT_MAX;
	},

	async incrementRateLimit(ip: string): Promise<void> {
		const redis = getRedisConnection();
		const key = `feature-request:rate:${ip}`;
		const count = await redis.incr(key);
		if (count === 1) {
			await redis.expire(key, RATE_LIMIT_WINDOW);
		}
	},

	async create(data: {
		title: string;
		description: string;
		category: RequestCategory;
		email: string;
		userId?: string;
		ip?: string;
	}) {
		const request = await prisma.featureRequest.create({
			data: {
				title: data.title,
				description: data.description,
				category: data.category,
				email: data.email,
				userId: data.userId ?? null,
				ip: data.ip ?? null,
			},
		});

		// Fire-and-forget email notification to admin
		this.notifyAdmin(request).catch((err) =>
			console.error('Failed to send feature request notification:', err)
		);

		// Increment rate limit counter
		if (data.ip) {
			this.incrementRateLimit(data.ip).catch(() => {});
		}

		return request;
	},

	async notifyAdmin(request: {
		id: string;
		title: string;
		description: string;
		category: RequestCategory;
		email: string;
		userId: string | null;
		createdAt: Date;
	}) {
		if (!ADMIN_EMAIL) return;

		const categoryLabel = CATEGORY_LABELS[request.category] || request.category;
		const submitterType = request.userId ? 'Registered User' : 'Public Visitor';
		const date = request.createdAt.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});

		const categoryColors: Record<string, string> = {
			BUG: '#DC2626',
			ENHANCEMENT: '#D97706',
			NEW_FEATURE: '#059669',
			UI_UX: '#7C3AED',
		};
		const color = categoryColors[request.category] || '#6B7280';

		const subject = `[Feature Request] ${categoryLabel}: ${request.title}`;

		const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="padding: 32px 24px; border-bottom: 3px solid #0D9488;">
          <h1 style="margin: 0; font-size: 20px; color: #0D9488;">Budget Planner</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">New Feature Request</h2>
          <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: ${color}; margin-bottom: 20px;">
            ${categoryLabel}
          </div>
          <div style="background: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top; width: 100px;">Title</td>
                <td style="padding: 8px 0; font-weight: 600; color: #111827;">${request.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Category</td>
                <td style="padding: 8px 0; font-weight: 600; color: ${color};">${categoryLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Submitted by</td>
                <td style="padding: 8px 0; font-weight: 600; color: #111827;">${request.email} (${submitterType})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280; vertical-align: top;">Date</td>
                <td style="padding: 8px 0; font-weight: 600; color: #111827;">${date}</td>
              </tr>
            </table>
          </div>
          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">Description</p>
            <div style="padding: 16px; background: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${request.description}</div>
          </div>
          <p style="margin: 0; font-size: 12px; color: #9CA3AF;">Request ID: ${request.id}</p>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF;">
          Sent from <a href="${APP_URL}/changelog" style="color: #0D9488;">Budget Planner</a> feature request form.
        </div>
      </div>
    `;

		await EmailService.send({ to: ADMIN_EMAIL, subject, html });
	},
};
