import { prisma } from "@/lib/db";
import * as tls from "tls";
import { sendIncidentAlertEmail, sendSlackAlert } from "@/lib/services/email-service";

/**
 * Perform an uptime check for a single domain data source.
 * Updates the UptimeCheck table and the DataSource config with SSL data.
 * Creates notifications for non-200 status codes.
 */
export async function performUptimeCheck(domainId: string) {
    const domain = await (prisma as any).dataSource.findUnique({
        where: { id: domainId },
        include: { monitoredPages: { where: { active: true } } }
    });

    if (!domain || domain.type !== "DOMAIN") {
        throw new Error("Invalid domain data source");
    }

    const config = domain.config as any || {};

    // ─── Main Domain Check ────────────────────────────────────────────
    let status = "DOWN";
    let statusCode = null;
    let responseTime = 0;
    const now = new Date();

    if (config.uptime) {
        const targetUrl = domain.externalId.startsWith('http') ? domain.externalId : `https://${domain.externalId}`;
        const result = await checkUrl(targetUrl);
        status = result.status;
        statusCode = result.statusCode;
        responseTime = result.responseTime;

        // Save Uptime Check
        await (prisma as any).uptimeCheck.create({
            data: {
                dataSourceId: domain.id,
                status,
                statusCode,
                responseTime,
                checkedAt: now
            }
        });

        // Create notification for non-200 status codes
        if (statusCode !== null && statusCode !== 200) {
            await createStatusNotification(
                domain.clientId,
                targetUrl,
                statusCode,
                domain.name || domain.externalId
            );
        }

        // Auto-create/resolve incidents
        if (status === "DOWN") {
            await autoCreateIncident({
                clientId: domain.clientId,
                dataSourceId: domain.id,
                title: domain.name || domain.externalId,
                checkedUrl: targetUrl,
                statusCode: statusCode,
                responseTime: responseTime,
            });
        } else {
            await autoResolveIncidents(domain.id, targetUrl);
        }
    }

    // ─── Monitored Pages Check ────────────────────────────────────────
    if (config.uptime && domain.monitoredPages && domain.monitoredPages.length > 0) {
        const baseUrl = domain.externalId.startsWith('http') ? domain.externalId : `https://${domain.externalId}`;

        for (const page of domain.monitoredPages) {
            // Build full URL: if page.url starts with http, use as-is; otherwise append to base
            const pageUrl = page.url.startsWith('http') ? page.url : `${baseUrl}${page.url.startsWith('/') ? '' : '/'}${page.url}`;
            const result = await checkUrl(pageUrl);

            // Update page status
            await (prisma as any).monitoredPage.update({
                where: { id: page.id },
                data: {
                    lastStatus: result.statusCode,
                    lastCheckedAt: now
                }
            });

            // Create notification for non-200 status codes
            if (result.statusCode !== null && result.statusCode !== 200) {
                await createStatusNotification(
                    domain.clientId,
                    pageUrl,
                    result.statusCode,
                    page.label || page.url
                );
            }

            // Auto-create/resolve incidents for monitored pages
            if (result.statusCode !== null && result.statusCode >= 400) {
                await autoCreateIncident({
                    clientId: domain.clientId,
                    dataSourceId: domain.id,
                    title: `${domain.externalId}${page.url}`,
                    checkedUrl: pageUrl,
                    statusCode: result.statusCode,
                    responseTime: result.responseTime,
                });
            } else if (result.statusCode !== null && result.statusCode < 400) {
                await autoResolveIncidents(domain.id, pageUrl);
            }
        }
    }

    // ─── SSL Monitoring ───────────────────────────────────────────────
    if (config.ssl) {
        try {
            const host = domain.externalId.replace(/^(https?:\/\/)/, '').split('/')[0];

            const sslDetails = await new Promise((resolve, reject) => {
                const socket = tls.connect({
                    host,
                    port: 443,
                    servername: host,
                    rejectUnauthorized: false,
                }, () => {
                    const cert = socket.getPeerCertificate();
                    socket.end();
                    if (!cert || !cert.valid_to) {
                        reject(new Error("No certificate found"));
                        return;
                    }

                    resolve({
                        validTo: cert.valid_to,
                        issuer: cert.issuer?.O || cert.issuer?.CN || 'Unknown',
                        subject: cert.subject?.CN || host,
                    });
                });

                socket.on('error', (err) => {
                    reject(err);
                });

                socket.setTimeout(5000, () => {
                    socket.end();
                    reject(new Error("TLS Socket timeout"));
                });
            });

            config.sslDetails = sslDetails;

        } catch (error: any) {
            console.error(`[checkDomain] SSL Check failed for ${domain.externalId}:`, error);
            config.sslDetails = { error: "Failed to read certificate" };
        }
    }

    // Update lastSyncedAt and config (to save sslDetails)
    await prisma.dataSource.update({
        where: { id: domain.id },
        data: {
            lastSyncedAt: now,
            config: config
        }
    });

    return { status, responseTime, statusCode };
}

/**
 * Check a single URL and return status, statusCode, and responseTime.
 */
async function checkUrl(url: string): Promise<{
    status: string;
    statusCode: number | null;
    responseTime: number;
}> {
    const startTime = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
            method: "GET",
            signal: controller.signal,
            redirect: "follow",
        });

        clearTimeout(timeoutId);

        return {
            status: response.ok ? "UP" : "DOWN",
            statusCode: response.status,
            responseTime: Date.now() - startTime,
        };
    } catch (error: any) {
        return {
            status: "DOWN",
            statusCode: null,
            responseTime: Date.now() - startTime,
        };
    }
}

/**
 * Create a notification for non-200 status codes.
 * Prevents spam: skips if there's already an unread notification
 * for the same URL + statusCode in the last hour.
 */
async function createStatusNotification(
    clientId: string,
    url: string,
    statusCode: number,
    label: string
) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check for existing unread notification for same URL + statusCode
    const existing = await (prisma as any).notification.findFirst({
        where: {
            clientId,
            url,
            statusCode,
            read: false,
            createdAt: { gte: oneHourAgo }
        }
    });

    if (existing) return; // Don't create duplicate

    const severity = statusCode >= 500 ? "critical" : statusCode >= 400 ? "warning" : "info";
    const statusLabel = getStatusLabel(statusCode);

    await (prisma as any).notification.create({
        data: {
            clientId,
            type: "STATUS_CODE_ERROR",
            title: `${statusLabel} op ${label}`,
            message: `${url} retourneert statuscode ${statusCode} (${statusLabel})`,
            severity,
            url,
            statusCode,
        }
    });
}

/**
 * Get a human-readable label for HTTP status codes.
 */
function getStatusLabel(code: number): string {
    const labels: Record<number, string> = {
        301: "Permanent Redirect",
        302: "Temporary Redirect",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        408: "Request Timeout",
        410: "Gone",
        429: "Too Many Requests",
        500: "Internal Server Error",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
    };
    return labels[code] || `HTTP ${code}`;
}

/**
 * Auto-create an incident if no open incident exists for the same checked URL.
 */
async function autoCreateIncident(opts: {
    clientId: string;
    dataSourceId: string;
    title: string;
    checkedUrl: string;
    statusCode: number | null;
    responseTime: number;
}) {
    // Check if there's already an open incident for this URL
    const existing = await (prisma as any).incident.findFirst({
        where: {
            clientId: opts.clientId,
            checkedUrl: opts.checkedUrl,
            status: { in: ["ONGOING", "ACKNOWLEDGED"] },
        },
    });

    if (existing) return; // Don't create duplicate

    const causeLabel = opts.statusCode ? getStatusLabel(opts.statusCode) : "Connection Timeout";
    const causeCode = opts.statusCode ? String(opts.statusCode) : "T/O";

    await (prisma as any).incident.create({
        data: {
            clientId: opts.clientId,
            dataSourceId: opts.dataSourceId,
            title: opts.title,
            cause: `Status ${causeCode}`,
            causeCode: causeCode,
            status: "ONGOING",
            checkedUrl: opts.checkedUrl,
            httpMethod: "GET",
            statusCode: opts.statusCode,
            responseTime: opts.responseTime,
            events: {
                create: {
                    type: "CREATED",
                    message: `Incident automatisch aangemaakt: ${causeLabel} (${causeCode})`,
                    userName: "Systeem",
                },
            },
        },
    });

    // Fetch the client's notification settings
    const client = await (prisma as any).client.findUnique({
        where: { id: opts.clientId },
        select: {
            name: true,
            slackWebhookUrl: true,
            notificationUsers: { select: { email: true } }
        }
    });

    if (client) {
        const payload = {
            incidentTitle: opts.title,
            incidentCause: `Status ${causeCode}`,
            clientName: client.name,
            startedAt: new Date(),
            recipients: client.notificationUsers.map((u: any) => u.email)
        };

        // Fire & Forget: Send Email Alerts
        if (payload.recipients.length > 0) {
            sendIncidentAlertEmail(payload).catch(err => console.error(err));
        }

        // Fire & Forget: Send Slack Alert
        if (client.slackWebhookUrl) {
            sendSlackAlert(client.slackWebhookUrl, payload).catch(err => console.error(err));
        }
    }
}

/**
 * Auto-resolve open incidents for a specific data source and URL when the site recovers.
 */
async function autoResolveIncidents(dataSourceId: string, checkedUrl: string) {
    const openIncidents = await (prisma as any).incident.findMany({
        where: {
            dataSourceId,
            checkedUrl,
            status: { in: ["ONGOING", "ACKNOWLEDGED"] },
        },
    });

    for (const inc of openIncidents) {
        await (prisma as any).incident.update({
            where: { id: inc.id },
            data: {
                status: "RESOLVED",
                resolvedAt: new Date(),
                resolvedBy: "Systeem",
                events: {
                    create: {
                        type: "RESOLVED",
                        message: "Incident automatisch opgelost: site is weer bereikbaar",
                        userName: "Systeem",
                    },
                },
            },
        });
    }
}

