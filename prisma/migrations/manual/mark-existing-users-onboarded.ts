import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	// Mark all existing users as onboarded so they skip the onboarding flow
	const result = await prisma.user.updateMany({
		where: { isOnboarded: false },
		data: { isOnboarded: true },
	});
	console.log(`Marked ${result.count} existing users as onboarded`);
}

main()
	.then(() => prisma.$disconnect())
	.catch((e) => {
		console.error(e);
		prisma.$disconnect();
		process.exit(1);
	});
