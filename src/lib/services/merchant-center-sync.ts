import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import {
    sendIncidentAlertEmail,
    sendIncidentResolvedEmail,
    sendSlackAlert,
    sendSlackResolvedAlert
} from "@/lib/services/email-service";
import { resolveNotificationConfig } from "@/lib/services/notification-resolver";
import { formatDistanceStrict } from "date-fns";
import { nl } from "date-fns/locale";

// ══════════════════════════════════════════════════════════════
// Merchant Center Sync Service
// Fetches product statuses from Google Content API v2.1,
// stores health snapshots, and creates incidents for new
// disapprovals.
// ══════════════════════════════════════════════════════════════

interface MerchantProduct {
    id: string;
    title: string;
    link?: string;
    channel?: string;
    contentLanguage?: string;
    targetCountry?: string;
    destinations?: Array<{
        destinationName: string;
        status: string;
        disapprovedCountries?: string[];
        pendingCountries?: string[];
        approvedCountries?: string[];
    }>;
    issues?: Array<{
        code: string;
        servability: string;
        resolution: string;
        description: string;
        detail?: string;
        documentation?: string;
        destination?: string;
        applicableCountries?: string[];
    }>;
}

interface SyncResult {
    dataSourceId: string;
    merchantId: string;
    totalProducts: number;
    approvedProducts: number;
    disapprovedProducts: number;
    pendingProducts: number;
    newDisapprovals: number;
    incidentCreated: boolean;
    incidentResolved: boolean;
    error?: string;
}

/**
 * Refresh the Google OAuth access token using a stored refresh token.
 */
async function refreshAccessToken(encryptedRefreshToken: string): Promise<string> {
    const refreshToken = decrypt(encryptedRefreshToken);

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
            grant_type: "refresh_token",
        }),
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
    }
    return data.access_token;
}

/**
 * Fetch all products from Google Content API v2.1 with pagination.
 */
async function fetchAllProducts(merchantId: string, accessToken: string): Promise<MerchantProduct[]> {
    const products: MerchantProduct[] = [];
    let pageToken: string | undefined;
    let page = 0;
    const maxPages = 50; // Safety limit (~12,500 products)

    do {
        const url = new URL(`https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/products`);
        url.searchParams.set("maxResults", "250");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Content API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const resources = data.resources || [];
        products.push(...resources);

        pageToken = data.nextPageToken;
        page++;
    } while (pageToken && page < maxPages);

    return products;
}

/**
 * Strategy 1: Use Merchant Reports API (v1) to get product statuses.
 * This API handles MCA permissions natively and is the recommended approach.
 */
async function fetchViaReportsApi(merchantId: string, accessToken: string): Promise<{ success: boolean; statuses: any[]; error?: string }> {
    try {
        console.log(`[MC-Sync] Trying Merchant Reports API for account ${merchantId}...`);

        const query = `
            SELECT 
                product_view.id,
                product_view.title,
                product_view.channel,
                product_view.language_code,
                product_view.feed_label,
                product_view.item_issues.resolution,
                product_view.item_issues.severity,
                product_view.item_issues.attribute,
                product_view.aggregated_reporting_context_status
            FROM ProductView
        `;

        const res = await fetch(
            `https://merchantapi.googleapis.com/reports/v1/accounts/${merchantId}/reports:search`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ query: query.trim() }),
            }
        );

        if (!res.ok) {
            const errText = await res.text();
            console.log(`[MC-Sync] Reports API failed (${res.status}): ${errText.substring(0, 200)}`);
            return { success: false, statuses: [], error: errText };
        }

        const data = await res.json();
        const results = data.results || [];
        console.log(`[MC-Sync] Reports API returned ${results.length} product rows`);

        // Convert to a format compatible with our analyzeProducts function
        const statuses = results.map((row: any) => {
            const pv = row.productView || {};
            const aggStatus = pv.aggregatedReportingContextStatus || "";

            // Map aggregated status to destination statuses format
            const isDisapproved = aggStatus === "NOT_ELIGIBLE_OR_DISAPPROVED" || aggStatus === "DISAPPROVED";
            const isPending = aggStatus === "PENDING";

            // Collect item issues  
            const itemIssues = (pv.itemIssues || []).map((issue: any) => ({
                code: issue.attribute || "unknown",
                description: issue.resolution || "",
                detail: "",
                servability: issue.severity === "DISAPPROVED" ? "disapproved" : (issue.severity || "").toLowerCase(),
            }));

            return {
                productId: pv.id || "",
                title: pv.title || "Onbekend product",
                destinationStatuses: [{
                    status: isDisapproved ? "disapproved" : isPending ? "pending" : "approved",
                }],
                itemLevelIssues: itemIssues,
            };
        });

        return { success: true, statuses };
    } catch (err: any) {
        console.error("[MC-Sync] Reports API error:", err.message);
        return { success: false, statuses: [], error: err.message };
    }
}

/**
 * Strategy 2: Use Content API v2.1 productstatuses endpoint.
 */
async function fetchViaContentApi(merchantId: string, accessToken: string): Promise<{ success: boolean; statuses: any[]; error?: string; errorCode?: number }> {
    const statuses: any[] = [];
    let pageToken: string | undefined;
    let page = 0;
    const maxPages = 50;

    do {
        const url = new URL(`https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/productstatuses`);
        url.searchParams.set("maxResults", "250");
        if (pageToken) url.searchParams.set("pageToken", pageToken);

        const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
            const errText = await res.text();
            console.log(`[MC-Sync] Content API failed for ${merchantId} (${res.status}): ${errText.substring(0, 200)}`);
            return { success: false, statuses: [], error: errText, errorCode: res.status };
        }

        const data = await res.json();
        const resources = data.resources || [];
        statuses.push(...resources);

        pageToken = data.nextPageToken;
        page++;
    } while (pageToken && page < maxPages);

    return { success: true, statuses };
}

/**
 * Strategy 3: Handle aggregator accounts.
 * If the target account is an aggregator (MCA), list sub-accounts and fetch their products.
 * Also tries other accessible accounts from authinfo if needed.
 */
async function fetchViaParentAccount(merchantId: string, accessToken: string): Promise<{ success: boolean; statuses: any[]; error?: string }> {
    try {
        console.log(`[MC-Sync] Discovering account structure via authinfo...`);
        const authRes = await fetch("https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!authRes.ok) return { success: false, statuses: [], error: "authinfo failed" };

        const authData = await authRes.json();
        const identifiers = authData.accountIdentifiers || [];
        console.log(`[MC-Sync] authinfo: ${identifiers.length} identifiers`);

        // Check if our target is listed as an aggregator (MCA)
        const isAggregator = identifiers.some((acc: any) => acc.aggregatorId === merchantId);

        if (isAggregator) {
            console.log(`[MC-Sync] Account ${merchantId} is an MCA aggregator — listing sub-accounts...`);

            // List sub-accounts under this aggregator
            const subRes = await fetch(
                `https://shoppingcontent.googleapis.com/content/v2.1/${merchantId}/accounts?maxResults=250`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (subRes.ok) {
                const subData = await subRes.json();
                const subAccounts = subData.resources || [];
                console.log(`[MC-Sync] Found ${subAccounts.length} sub-accounts under aggregator ${merchantId}`);

                // Fetch productstatuses for ALL sub-accounts via the aggregator
                const allStatuses: any[] = [];
                for (const sub of subAccounts) {
                    const subId = sub.id;
                    if (!subId) continue;

                    const result = await fetchViaContentApi(subId, accessToken);
                    if (result.success) {
                        allStatuses.push(...result.statuses);
                    }
                }

                if (allStatuses.length > 0) {
                    console.log(`[MC-Sync] ✓ Collected ${allStatuses.length} products from ${subAccounts.length} sub-accounts`);
                    return { success: true, statuses: allStatuses };
                }
            } else {
                const errText = await subRes.text();
                console.log(`[MC-Sync] Sub-account listing failed (${subRes.status}): ${errText.substring(0, 200)}`);
            }
        }

        // Fallback: find sub-accounts of our target aggregator in authinfo
        const subAccountsOfTarget = identifiers.filter((acc: any) => acc.aggregatorId === merchantId && acc.merchantId);
        if (subAccountsOfTarget.length > 0) {
            console.log(`[MC-Sync] Found ${subAccountsOfTarget.length} sub-accounts of ${merchantId} in authinfo`);
            const allStatuses: any[] = [];
            for (const acc of subAccountsOfTarget) {
                const result = await fetchViaContentApi(acc.merchantId, accessToken);
                if (result.success) {
                    allStatuses.push(...result.statuses);
                }
            }
            if (allStatuses.length > 0) return { success: true, statuses: allStatuses };
        }

        // Last resort: try parent aggregators that might contain our merchantId
        for (const acc of identifiers) {
            if (acc.aggregatorId && acc.aggregatorId !== merchantId) {
                const result = await fetchViaContentApi(acc.aggregatorId, accessToken);
                if (result.success && result.statuses.length > 0) {
                    console.log(`[MC-Sync] Success via aggregator ${acc.aggregatorId}: ${result.statuses.length} products`);
                    return result;
                }
            }
        }
    } catch (err: any) {
        console.error("[MC-Sync] Parent account discovery error:", err.message);
    }
    return { success: false, statuses: [], error: "No accessible account found" };
}

/**
 * Fetch product statuses using multiple strategies.
 * Tries: 1) Merchant Reports API, 2) Content API direct, 3) Content API via parent.
 */
async function fetchProductStatuses(merchantId: string, accessToken: string): Promise<any[]> {
    // Strategy 1: Merchant Reports API (best MCA support)
    const reportsResult = await fetchViaReportsApi(merchantId, accessToken);
    if (reportsResult.success && reportsResult.statuses.length > 0) {
        console.log(`[MC-Sync] ✓ Got ${reportsResult.statuses.length} products via Reports API`);
        return reportsResult.statuses;
    }

    // Strategy 2: Content API direct access
    const contentResult = await fetchViaContentApi(merchantId, accessToken);
    if (contentResult.success) {
        console.log(`[MC-Sync] ✓ Got ${contentResult.statuses.length} products via Content API`);
        return contentResult.statuses;
    }

    // Strategy 3: Content API via parent/aggregator
    const parentResult = await fetchViaParentAccount(merchantId, accessToken);
    if (parentResult.success) {
        console.log(`[MC-Sync] ✓ Got ${parentResult.statuses.length} products via parent account`);
        return parentResult.statuses;
    }

    // All strategies failed
    throw new Error(`Could not fetch product statuses for account ${merchantId}. Reports API: ${reportsResult.error?.substring(0, 100)}. Content API: ${contentResult.error?.substring(0, 100)}`);
}

/**
 * Analyze product statuses and categorize them.
 */
function analyzeProducts(statuses: any[]): {
    total: number;
    approved: number;
    disapproved: number;
    pending: number;
    disapprovedList: Array<{ productId: string; title: string; issues: Array<{ code: string; description: string; detail?: string; servability?: string }> }>;
    topReasons: Record<string, number>;
} {
    let approved = 0;
    let disapproved = 0;
    let pending = 0;
    const disapprovedList: Array<{ productId: string; title: string; issues: any[] }> = [];
    const reasonCounts: Record<string, number> = {};

    for (const status of statuses) {
        const destinations = status.destinationStatuses || [];
        const itemIssues = status.itemLevelIssues || [];

        // Check destination statuses for disapproval
        const isDisapproved = destinations.some((d: any) =>
            d.status === "disapproved" || d.approvalStatus === "disapproved"
        );
        const isPending = destinations.some((d: any) =>
            d.status === "pending" || d.approvalStatus === "pending"
        );

        if (isDisapproved) {
            disapproved++;

            // Collect disapproval issues
            const productIssues = itemIssues
                .filter((issue: any) => issue.servability === "disapproved")
                .map((issue: any) => ({
                    code: issue.code || "unknown",
                    description: issue.description || "",
                    detail: issue.detail || "",
                    servability: issue.servability || "",
                }));

            disapprovedList.push({
                productId: status.productId || status.id || "",
                title: status.title || "Onbekend product",
                issues: productIssues,
            });

            // Count reasons
            for (const issue of productIssues) {
                const key = issue.code || issue.description || "unknown";
                reasonCounts[key] = (reasonCounts[key] || 0) + 1;
            }
        } else if (isPending) {
            pending++;
        } else {
            approved++;
        }
    }

    return {
        total: statuses.length,
        approved,
        disapproved,
        pending,
        disapprovedList,
        topReasons: reasonCounts,
    };
}

/**
 * Create an incident for new merchant disapprovals.
 * Follows the same pattern as autoCreateIncident in domain-checker.ts
 */
async function createDisapprovalIncident(opts: {
    projectId: string;
    dataSourceId: string;
    merchantName: string;
    disapprovedCount: number;
    previousCount: number;
    newCount: number;
    topReasons: Record<string, number>;
}) {
    // Check if there's already an open MC incident for this data source
    const existing = await (prisma as any).incident.findFirst({
        where: {
            dataSourceId: opts.dataSourceId,
            causeCode: "MERCHANT_DISAPPROVAL",
            status: { in: ["ONGOING", "ACKNOWLEDGED"] },
        },
    });

    if (existing) {
        // Update the existing incident with new count
        await (prisma as any).incidentEvent.create({
            data: {
                incidentId: existing.id,
                type: "STATUS_UPDATE",
                message: `Aantal afgekeurde producten bijgewerkt: ${opts.previousCount} → ${opts.disapprovedCount} (+${opts.newCount} nieuw)`,
                userName: "Systeem",
            },
        });
        return;
    }

    // Build top reasons summary
    const topReasonsStr = Object.entries(opts.topReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, count]) => `${reason} (${count}x)`)
        .join(", ");

    const title = `${opts.disapprovedCount} producten afgekeurd — ${opts.merchantName}`;
    const cause = topReasonsStr
        ? `Merchant Center afkeuringen: ${topReasonsStr}`
        : `${opts.disapprovedCount} producten afgekeurd in Merchant Center`;

    const incident = await (prisma as any).incident.create({
        data: {
            projectId: opts.projectId,
            dataSourceId: opts.dataSourceId,
            title,
            cause,
            causeCode: "MERCHANT_DISAPPROVAL",
            status: "ONGOING",
            events: {
                create: {
                    type: "CREATED",
                    message: `Incident automatisch aangemaakt: ${opts.disapprovedCount} producten afgekeurd in Google Merchant Center (was: ${opts.previousCount})`,
                    userName: "Systeem",
                },
            },
        },
    });

    // Send notifications
    const notifConfig = await resolveNotificationConfig(opts.projectId);
    const client = await (prisma as any).project.findUnique({
        where: { id: opts.projectId },
        select: { name: true },
    });

    if (client && notifConfig.enabled) {
        const payload = {
            incidentTitle: title,
            incidentCause: cause,
            clientName: client.name,
            startedAt: new Date(),
            recipients: notifConfig.recipients,
        };

        const notifiedChannels: string[] = [];

        if (payload.recipients.length > 0) {
            sendIncidentAlertEmail(payload).catch(err => console.error("[MC] Email error:", err));
            notifiedChannels.push(`E-mail (${payload.recipients.join(", ")})`);
        }

        if (notifConfig.slackWebhookUrl) {
            sendSlackAlert(notifConfig.slackWebhookUrl, payload).catch(err => console.error("[MC] Slack error:", err));
            notifiedChannels.push("Slack");
        }

        if (notifiedChannels.length > 0) {
            await (prisma as any).incidentEvent.create({
                data: {
                    incidentId: incident.id,
                    type: "NOTIFICATION_SENT",
                    message: `Notificatie verzonden via: ${notifiedChannels.join(" en ")}`,
                    userName: "Systeem",
                },
            });
        }
    }
}

/**
 * Auto-resolve open MC incidents when disapprovals drop to 0.
 */
async function autoResolveMerchantIncidents(dataSourceId: string) {
    const openIncidents = await (prisma as any).incident.findMany({
        where: {
            dataSourceId,
            causeCode: "MERCHANT_DISAPPROVAL",
            status: { in: ["ONGOING", "ACKNOWLEDGED"] },
        },
    });

    for (const incident of openIncidents) {
        const now = new Date();
        const duration = formatDistanceStrict(new Date(incident.startedAt), now, { locale: nl });

        await (prisma as any).incident.update({
            where: { id: incident.id },
            data: {
                status: "RESOLVED",
                resolvedAt: now,
                resolvedBy: "Systeem",
            },
        });

        await (prisma as any).incidentEvent.create({
            data: {
                incidentId: incident.id,
                type: "RESOLVED",
                message: `Incident automatisch opgelost: alle producten zijn weer goedgekeurd (duur: ${duration})`,
                userName: "Systeem",
            },
        });

        // Send resolution notification
        const notifConfig = await resolveNotificationConfig(incident.projectId);
        const client = await (prisma as any).project.findUnique({
            where: { id: incident.projectId },
            select: { name: true },
        });

        if (client && notifConfig.enabled) {
            const payload = {
                incidentTitle: incident.title,
                incidentCause: incident.cause,
                clientName: client.name,
                startedAt: new Date(incident.startedAt),
                recipients: notifConfig.recipients,
                duration,
            };

            if (payload.recipients.length > 0) {
                sendIncidentResolvedEmail(payload).catch(err => console.error(err));
            }
            if (notifConfig.slackWebhookUrl) {
                sendSlackResolvedAlert(notifConfig.slackWebhookUrl, payload).catch(err => console.error(err));
            }
        }
    }
}

/**
 * Main sync function: sync a single Merchant Center DataSource.
 */
export async function syncMerchantHealth(dataSource: {
    id: string;
    projectId: string;
    externalId: string;
    token: string;
    name?: string | null;
}): Promise<SyncResult> {
    const result: SyncResult = {
        dataSourceId: dataSource.id,
        merchantId: dataSource.externalId,
        totalProducts: 0,
        approvedProducts: 0,
        disapprovedProducts: 0,
        pendingProducts: 0,
        newDisapprovals: 0,
        incidentCreated: false,
        incidentResolved: false,
    };

    try {
        console.log(`[MC-Sync] Starting sync for merchant ${dataSource.externalId} (${dataSource.name || "unnamed"})`);

        // 1. Refresh access token
        const accessToken = await refreshAccessToken(dataSource.token);

        // 2. Fetch product statuses (primary data for disapprovals)
        const statuses = await fetchProductStatuses(dataSource.externalId, accessToken);
        console.log(`[MC-Sync] Fetched ${statuses.length} product statuses`);

        // 3. Analyze products
        const analysis = analyzeProducts(statuses);
        result.totalProducts = analysis.total;
        result.approvedProducts = analysis.approved;
        result.disapprovedProducts = analysis.disapproved;
        result.pendingProducts = analysis.pending;

        // 4. Get previous snapshot for delta comparison
        const previousSnapshot = await (prisma as any).merchantCenterHealth.findFirst({
            where: { dataSourceId: dataSource.id },
            orderBy: { date: "desc" },
        });

        const previousDisapproved = previousSnapshot?.disapprovedItems || 0;
        const newDisapprovals = Math.max(0, analysis.disapproved - previousDisapproved);
        result.newDisapprovals = newDisapprovals;

        // 5. Store snapshot
        const disapprovedPct = analysis.total > 0
            ? Math.round((analysis.disapproved / analysis.total) * 10000) / 100
            : 0;

        await (prisma as any).merchantCenterHealth.create({
            data: {
                projectId: dataSource.projectId,
                dataSourceId: dataSource.id,
                date: new Date(),
                totalItems: analysis.total,
                disapprovedItems: analysis.disapproved,
                disapprovedPct: disapprovedPct,
                topReasons: analysis.topReasons,
                accountIssues: {},
                disapprovedProducts: analysis.disapprovedList.slice(0, 100), // Store top 100
            },
        });

        // 6. Delta detection: create or resolve incidents
        if (analysis.disapproved > 0 && newDisapprovals > 0) {
            await createDisapprovalIncident({
                projectId: dataSource.projectId,
                dataSourceId: dataSource.id,
                merchantName: dataSource.name || `Merchant ${dataSource.externalId}`,
                disapprovedCount: analysis.disapproved,
                previousCount: previousDisapproved,
                newCount: newDisapprovals,
                topReasons: analysis.topReasons,
            });
            result.incidentCreated = true;
        } else if (analysis.disapproved === 0 && previousDisapproved > 0) {
            // All disapprovals resolved
            await autoResolveMerchantIncidents(dataSource.id);
            result.incidentResolved = true;
        }

        // 7. Update lastSyncedAt
        await prisma.dataSource.update({
            where: { id: dataSource.id },
            data: { lastSyncedAt: new Date(), syncStatus: "ACTIVE", syncError: null },
        });

        console.log(`[MC-Sync] Done: ${analysis.total} products, ${analysis.disapproved} disapproved (${newDisapprovals} new)`);
    } catch (error: any) {
        console.error(`[MC-Sync] Error syncing ${dataSource.externalId}:`, error);
        result.error = error.message || "Unknown sync error";

        // Store error on data source
        await prisma.dataSource.update({
            where: { id: dataSource.id },
            data: { syncStatus: "ERROR", syncError: result.error },
        }).catch(() => { });
    }

    return result;
}

/**
 * Sync all active Merchant Center data sources.
 */
export async function syncAllMerchantSources(): Promise<SyncResult[]> {
    const sources = await prisma.dataSource.findMany({
        where: {
            type: "GOOGLE_MERCHANT",
            active: true,
            syncStatus: { not: "PAUSED" },
        },
        select: {
            id: true,
            projectId: true,
            externalId: true,
            token: true,
            name: true,
            lastSyncedAt: true,
            syncInterval: true,
        },
    });

    console.log(`[MC-Sync] Found ${sources.length} active Merchant Center sources`);

    const results: SyncResult[] = [];

    for (const source of sources) {
        // Check if sync is due (respect syncInterval, default 1440 = 24h)
        const intervalMs = (source.syncInterval || 1440) * 60 * 1000;
        const msSinceLastSync = source.lastSyncedAt
            ? Date.now() - source.lastSyncedAt.getTime()
            : Infinity;

        if (msSinceLastSync < intervalMs - 60000) { // 1 min buffer
            console.log(`[MC-Sync] Skipping ${source.externalId}: synced ${Math.round(msSinceLastSync / 60000)}m ago (interval: ${source.syncInterval}m)`);
            continue;
        }

        const result = await syncMerchantHealth(source);
        results.push(result);

        // Small delay between sources to avoid rate limits
        if (sources.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return results;
}
