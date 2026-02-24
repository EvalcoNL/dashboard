import { prisma } from "../src/lib/db";

async function main() {
    try {
        console.log("Checking database connection...");
        const userCount = await prisma.user.count();
        console.log(`Connection successful. Found ${userCount} users.`);

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                twoFactorEnabled: true,
            }
        });

        console.log("Users in database:");
        console.table(users);

        if (users.length === 0) {
            console.log("WARNING: No users found in database. You may need to run npx prisma db seed.");
        }
    } catch (error) {
        console.error("Error connecting to database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
