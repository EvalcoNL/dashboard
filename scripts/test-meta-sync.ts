import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';
import { decrypt } from '../src/lib/encryption';

const dbUrl = process.env.DATABASE_URL || 'file:./data/evalco.db';
let resolvedUrl = dbUrl;
if (dbUrl.startsWith('file:') && !dbUrl.startsWith('file:/')) {
    resolvedUrl = 'file:' + path.resolve(dbUrl.replace('file:', ''));
}
const adapter = new PrismaLibSql({ url: resolvedUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    // Check data source status
    const ds = await prisma.dataSource.findFirst({
        where: { type: 'META', active: true },
        include: { connector: true, syncAccounts: true },
    });
    if (!ds) { console.log('No META data source found'); return; }

    console.log('DataSource:', ds.id, ds.name);
    console.log('Connector:', ds.connector?.slug);
    console.log('SyncAccounts:', ds.syncAccounts.length);
    ds.syncAccounts.forEach(a => console.log('  -', a.name, a.externalId, 'active:', a.isActive));
    console.log('SyncStatus:', ds.syncStatus);

    // Reset sync status if ERROR
    if (ds.syncStatus === 'ERROR') {
        await prisma.dataSource.update({
            where: { id: ds.id },
            data: { syncStatus: 'ACTIVE', syncError: null },
        });
        console.log('Reset syncStatus to ACTIVE');
    }

    // Try to sync using the sync engine directly
    console.log('\nTriggering sync...');
    const { syncEngine } = await import('../src/lib/data-integration/sync-engine');
    const result = await syncEngine.syncDataSource({
        dataSourceId: ds.id,
        mode: 'INCREMENTAL',
    });

    console.log('\nSync result:');
    console.log('  Job ID:', result.jobId);
    console.log('  Mode:', result.mode);
    console.log('  Fetched:', result.fetched);
    console.log('  Stored:', result.stored);
    console.log('  New:', result.newRows);
    console.log('  Updated:', result.updatedRows);
    console.log('  Errors:', result.errors);
}

main()
    .catch(e => console.error('FAILED:', e))
    .finally(() => prisma.$disconnect());
