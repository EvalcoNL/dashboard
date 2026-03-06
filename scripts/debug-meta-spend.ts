/**
 * Debug: check what Meta API actually returns for spend
 */
import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { decrypt } from "../src/lib/encryption";

const dbUrl = process.env.DATABASE_URL || "file:./data/evalco.db";
let resolvedUrl = dbUrl;
if (dbUrl.startsWith("file:") && !dbUrl.startsWith("file:/")) {
    resolvedUrl = "file:" + path.resolve(dbUrl.replace("file:", ""));
}
const adapter = new PrismaLibSql({ url: resolvedUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    const ds = await prisma.dataSource.findFirst({
        where: { type: 'META', active: true },
        include: { syncAccounts: true },
    });
    if (!ds) { console.log('No META data source found'); return; }

    let accessToken: string;
    const decrypted = decrypt(ds.token);
    try {
        const parsed = JSON.parse(decrypted);
        accessToken = parsed.accessToken || decrypted;
    } catch {
        accessToken = decrypted;
    }

    const accountId = ds.syncAccounts[0]?.externalId;
    console.log('Account:', accountId);

    // Fetch one day of data at campaign level
    const url = `https://graph.facebook.com/v19.0/act_${accountId}/insights?` + new URLSearchParams({
        fields: 'campaign_id,campaign_name,impressions,clicks,spend,reach,frequency,actions,action_values',
        level: 'campaign',
        time_range: JSON.stringify({ since: '2026-03-04', until: '2026-03-04' }),
        limit: '10',
    });

    console.log('\nFetching:', url.replace(accessToken, 'TOKEN'));
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (data.error) {
        console.log('Error:', data.error);
        return;
    }

    console.log('\nRaw API response:');
    console.log(JSON.stringify(data.data, null, 2));

    // Check spend specifically
    if (data.data?.length > 0) {
        const row = data.data[0];
        console.log('\n--- Spend analysis ---');
        console.log('spend raw value:', JSON.stringify(row.spend));
        console.log('spend type:', typeof row.spend);
        console.log('spend truthy?:', !!row.spend);
        console.log('Number(spend):', Number(row.spend));

        // The bug: `if (row.spend)` with "0" or "0.00" string
        console.log('\nBug check:');
        const zero = "0", zeroDec = "0.00", zeroNum = 0;
        console.log('  if ("0") =>', zero ? 'truthy' : 'falsy');
        console.log('  if ("0.00") =>', zeroDec ? 'truthy' : 'falsy');
        console.log('  if (0) =>', zeroNum ? 'truthy' : 'falsy');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
