import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
	try {
		await prisma.$connect();
		console.log('Successfully connected to database');
		const user = await prisma.user.findUnique({
			where: { email: 'admin@budget.app' },
		});
		if (user) {
			console.log('User found:', user.email);
		} else {
			console.log('User not found');
		}
	} catch (e) {
		console.error('Error:', e);
	} finally {
		await prisma.$disconnect();
	}
}

main();
