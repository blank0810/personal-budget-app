import { AdminAnalyticsService } from '@/server/modules/admin/admin-analytics.service';
import { AdminDashboard } from '@/components/modules/admin/AdminDashboard';

export default async function AdminDashboardPage() {
	const [stats, financials, adoption, growth] = await Promise.all([
		AdminAnalyticsService.getPlatformStats(),
		AdminAnalyticsService.getPlatformFinancials(),
		AdminAnalyticsService.getFeatureAdoption(),
		AdminAnalyticsService.getGrowthTimeline(6),
	]);

	return (
		<div className='container mx-auto py-6 md:py-10 space-y-6'>
			<h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>
				Admin Dashboard
			</h1>
			<AdminDashboard
				stats={stats}
				financials={financials}
				adoption={adoption}
				growth={growth}
			/>
		</div>
	);
}
