/**
 * Fix: Replace all sync accounts with only business-owned ad accounts
 * 
 * Run: npx tsx scripts/migrate-meta-connector.ts
 */

import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { decrypt } from "../src/lib/encryption";

const dbUrl = process.env.DATABASE_URL || "file:./data/evalco.db";
let resolvedUrl = dbUrl;
if (dbUrl.startsWith("file:") && !dbUrl.startsWith("file:/")) {
    const relativePath = dbUrl.replace("file:", "");
    resolvedUrl = "file:" + path.resolve(relativePath);
}
const adapter = new PrismaLibSql({ url: resolvedUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    // Find META data sources
    const metaSources = await prisma.dataSource.findMany({
        where: { type: "META", active: true },
        include: { syncAccounts: true },
    });

    for (const ds of metaSources) {
        console.log(`\nProcessing: ${ds.name} (${ds.id}), business: ${ds.externalId}`);
        console.log(`  Current sync accounts: ${ds.syncAccounts.length}`);

        // Delete all existing sync accounts
        const deleted = await prisma.dataSourceAccount.deleteMany({
            where: { dataSourceId: ds.id },
        });
        console.log(`  Deleted ${deleted.count} sync accounts`);

        // Get the access token
        let accessToken: string;
        try {
            const decrypted = decrypt(ds.token);
            try {
                const parsed = JSON.parse(decrypted);
                accessToken = parsed.accessToken || decrypted;
            } catch {
                accessToken = decrypted;
            }
        } catch {
            console.log(`  ⚠ Could not decrypt token, skipping`);
            continue;
        }

        // Fetch only ad accounts owned by this business portfolio
        const businessId = ds.externalId;
        const res = await fetch(
            `https://graph.facebook.com/v19.0/${businessId}/owned_ad_accounts?fields=account_id,name,currency,timezone_name&limit=100`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();

        if (data.error) {
            console.log(`  ⚠ API error: ${data.error.message}`);
            continue;
        }

        const adAccounts = data.data || [];
        console.log(`  Found ${adAccounts.length} ad accounts for business ${businessId}`);

        for (const acc of adAccounts) {
            await prisma.dataSourceAccount.create({
                data: {
                    dataSourceId: ds.id,
                    externalId: acc.account_id,
                    name: acc.name || acc.account_id,
                    currency: acc.currency || "EUR",
                    timezone: acc.timezone_name || "Europe/Amsterdam",
                },
            });
            console.log(`  ✓ Created: ${acc.name || acc.account_id} (${acc.account_id})`);
        }
    }

    console.log("\nDone!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
