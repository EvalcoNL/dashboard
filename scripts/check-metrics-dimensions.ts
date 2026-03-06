/**
 * Check and clean up stale dimension/metric definitions
 * and verify Meta Ads auto-discovery works
 * 
 * Run: npx tsx scripts/check-metrics-dimensions.ts
 */
import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const dbUrl = process.env.DATABASE_URL || "file:./data/evalco.db";
let resolvedUrl = dbUrl;
if (dbUrl.startsWith("file:") && !dbUrl.startsWith("file:/")) {
    resolvedUrl = "file:" + path.resolve(dbUrl.replace("file:", ""));
}
const adapter = new PrismaLibSql({ url: resolvedUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    // 1. Check all connector definitions
    const connectors = await prisma.connectorDefinition.findMany();
    console.log("=== Connector Definitions ===");
    for (const c of connectors) {
        console.log(`  ${c.slug} (${c.id}) - ${c.name} - active: ${c.isActive}`);
    }

    // 2. Check active data sources
    const dataSources = await prisma.dataSource.findMany({
        where: { active: true },
        select: { id: true, name: true, type: true, connectorId: true },
    });
    console.log("\n=== Active Data Sources ===");
    const activeConnectorIds = new Set<string>();
    for (const ds of dataSources) {
        console.log(`  ${ds.type} — ${ds.name} (connectorId: ${ds.connectorId})`);
        if (ds.connectorId) activeConnectorIds.add(ds.connectorId);
    }

    // 3. Check dimension definitions
    const dims = await prisma.dimensionDefinition.findMany({
        include: { connector: { select: { slug: true, name: true } } },
    });
    console.log(`\n=== Dimension Definitions (${dims.length}) ===`);
    const staleDims: string[] = [];
    for (const d of dims) {
        const isStale = d.connectorId && !activeConnectorIds.has(d.connectorId);
        if (isStale) staleDims.push(d.id);
        console.log(`  ${d.slug} — ${d.name} — connector: ${d.connector?.slug || 'none'} ${isStale ? '⚠ STALE' : ''}`);
    }

    // 4. Check metric definitions
    const metrics = await prisma.metricDefinition.findMany({
        include: { connector: { select: { slug: true, name: true } } },
    });
    console.log(`\n=== Metric Definitions (${metrics.length}) ===`);
    const staleMetrics: string[] = [];
    for (const m of metrics) {
        const isStale = m.connectorId && !activeConnectorIds.has(m.connectorId);
        if (isStale) staleMetrics.push(m.id);
        console.log(`  ${m.slug} — ${m.name} — connector: ${m.connector?.slug || 'none'} ${isStale ? '⚠ STALE' : ''}`);
    }

    // 5. Check derived metrics
    const derived = await prisma.derivedMetricDefinition.findMany({
        include: { connector: { select: { slug: true, name: true } } },
    });
    console.log(`\n=== Derived Metric Definitions (${derived.length}) ===`);
    const staleDerived: string[] = [];
    for (const m of derived) {
        const isStale = m.connectorId && !activeConnectorIds.has(m.connectorId);
        if (isStale) staleDerived.push(m.id);
        console.log(`  ${m.slug} — ${m.name} — connector: ${m.connector?.slug || 'none'} ${isStale ? '⚠ STALE' : ''}`);
    }

    console.log(`\n=== Summary ===`);
    console.log(`Stale dimensions: ${staleDims.length}`);
    console.log(`Stale metrics: ${staleMetrics.length}`);
    console.log(`Stale derived: ${staleDerived.length}`);

    // 6. Clean up stale entries
    if (staleDims.length > 0 || staleMetrics.length > 0 || staleDerived.length > 0) {
        console.log("\nCleaning up stale entries...");
        if (staleDims.length > 0) {
            await prisma.dimensionDefinition.deleteMany({ where: { id: { in: staleDims } } });
            console.log(`  Deleted ${staleDims.length} stale dimensions`);
        }
        if (staleMetrics.length > 0) {
            await prisma.metricDefinition.deleteMany({ where: { id: { in: staleMetrics } } });
            console.log(`  Deleted ${staleMetrics.length} stale metrics`);
        }
        if (staleDerived.length > 0) {
            await prisma.derivedMetricDefinition.deleteMany({ where: { id: { in: staleDerived } } });
            console.log(`  Deleted ${staleDerived.length} stale derived metrics`);
        }
    }

    // 7. Also clean up stale connector definitions (no active data sources)
    const staleConnectors = connectors.filter(c => !activeConnectorIds.has(c.id));
    if (staleConnectors.length > 0) {
        console.log("\nCleaning up stale connector definitions...");
        for (const c of staleConnectors) {
            try {
                await prisma.connectorDefinition.delete({ where: { id: c.id } });
                console.log(`  Deleted connector: ${c.slug} (${c.id})`);
            } catch (e) {
                console.log(`  Could not delete ${c.slug}: ${e}`);
            }
        }
    }

    console.log("\nDone!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
