import { prisma } from "@/lib/db";
import * as tls from "tls";
import {
    sendIncidentAlertEmail,
    sendIncidentResolvedEmail,
    sendSlackAlert,
    sendSlackResolvedAlert
} from "@/lib/services/email-service";
import { resolveNotificationConfig } from "@/lib/services/notification-resolver";
import { formatDistanceStrict } from "date-fns";
import { nl } from "date-fns/locale";

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

    if (!domain || !["DOMAIN", "WEBSITE"].includes(domain.type)) {
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
        const result = await checkUrl(targetUrl, config);
        status = result.status;
        statusCode = result.statusCode;
        responseTime = result.responseTime;

        // Pixel Monitoring
        if (result.html && config.pixelMonitoring) {
            const scripts = detectTrackingScripts(result.html);
            config.lastPixelAudit = {
                timestamp: now.toISOString(),
                ...scripts
            };

            const pCfg = config.pixelConfig || { gtm: true, ga4: true, meta: false };
            const missingSelected = [];

            if (pCfg.gtm && !scripts.gtm) missingSelected.push("GTM");
            if (pCfg.ga4 && !scripts.ga4) missingSelected.push("GA4");
            if (pCfg.meta && !scripts.meta) missingSelected.push("Meta");

            if (missingSelected.length > 0) {
                await (prisma as any).notification.create({
                    data: {
                        projectId: domain.projectId,
                        type: "PIXEL_MISSING",
                        title: `Tracking scripts ontbreken`,
                        message: `De volgende geselecteerde scripts zijn niet gevonden op ${domain.externalId}: ${missingSelected.join(", ")}.`,
                        severity: "warning",
                        url: targetUrl,
                    }
                });
            }
        }

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
                domain.projectId,
                targetUrl,
                statusCode,
                domain.name || domain.externalId
            );
        }

        // Auto-create/resolve incidents
        if (status === "DOWN") {
            // Confirmation logic
            const firstFailure = config.firstFailureAt ? new Date(config.firstFailureAt) : null;
            const confirmationMins = config.confirmationPeriod || 0;

            if (!firstFailure) {
                config.firstFailureAt = now.toISOString();
                delete config.firstSuccessAt;
            }

            const elapsedMins = firstFailure ? (now.getTime() - firstFailure.getTime()) / 60000 : 0;

            if (elapsedMins >= confirmationMins) {
                await autoCreateIncident({
                    projectId: domain.projectId,
                    dataSourceId: domain.id,
                    title: domain.name || domain.externalId,
                    checkedUrl: targetUrl,
                    statusCode: statusCode,
                    responseTime: responseTime,
                    config,
                });
            }
        } else {
            // Recovery logic
            const firstSuccess = config.firstSuccessAt ? new Date(config.firstSuccessAt) : null;
            const recoveryMins = config.recoveryPeriod || 0;

            if (!firstSuccess) {
                config.firstSuccessAt = now.toISOString();
                delete config.firstFailureAt;
            }

            const elapsedMins = firstSuccess ? (now.getTime() - firstSuccess.getTime()) / 60000 : 0;

            if (elapsedMins >= recoveryMins) {
                await autoResolveIncidents(domain.id, targetUrl, config);
            }
        }
    }

    // ─── Monitored Pages Check ────────────────────────────────────────
    if (config.uptime && domain.monitoredPages && domain.monitoredPages.length > 0) {
        const baseUrl = domain.externalId.startsWith('http') ? domain.externalId : `https://${domain.externalId}`;

        for (const page of domain.monitoredPages) {
            // Build full URL: if page.url starts with http, use as-is; otherwise append to base
            const pageUrl = page.url.startsWith('http') ? page.url : `${baseUrl}${page.url.startsWith('/') ? '' : '/'}${page.url}`;
            const result = await checkUrl(pageUrl, config);

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
                    domain.projectId,
                    pageUrl,
                    result.statusCode,
                    page.label || page.url
                );
            }

            // Auto-create/resolve incidents for monitored pages
            // (Simplification: we use the same config toggles but we don't track per-page transient states in the main domain config)
            // Ideally MonitoredPage would have its own config or status fields.
            // For now, let's just keep the direct behavior to avoid over-complicating the domain config JSON.
            if (result.statusCode !== null && result.statusCode >= 400) {
                await autoCreateIncident({
                    projectId: domain.projectId,
                    dataSourceId: domain.id,
                    title: `${domain.externalId}${page.url}`,
                    checkedUrl: pageUrl,
                    statusCode: result.statusCode,
                    responseTime: result.responseTime,
                    config,
                });
            } else if (result.statusCode !== null && result.statusCode < 400) {
                await autoResolveIncidents(domain.id, pageUrl, config);
            }
        }
    }

    // ─── SSL Monitoring ───────────────────────────────────────────────
    if (config.ssl) {
        try {
            const host = domain.externalId.replace(/^(https?:\/\/)/, '').split('/')[0];

            const sslDetails = await new Promise<{ validTo: string; issuer: string; subject: string }>((resolve, reject) => {
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

            // Check for expiration
            if (config.sslExpiration && sslDetails.validTo) {
                const expires = new Date(sslDetails.validTo);
                const daysLeft = Math.floor((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const threshold = config.sslExpirationDays || 30;

                if (daysLeft <= threshold) {
                    await (prisma as any).notification.create({
                        data: {
                            projectId: domain.projectId,
                            type: "SSL_EXPIRING",
                            title: `SSL Certificaat verloopt bijna`,
                            message: `Het SSL certificaat voor ${domain.externalId} verloopt over ${daysLeft} dagen (${expires.toLocaleDateString('nl-NL')}).`,
                            severity: daysLeft <= 7 ? "critical" : "warning",
                            url: domain.externalId,
                        }
                    });
                }
            }

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
async function checkUrl(url: string, config: any = {}): Promise<{
    status: string;
    statusCode: number | null;
    responseTime: number;
    html?: string;
}> {
    const startTime = Date.now();
    try {
        const controller = new AbortController();
        const timeoutSeconds = config.requestTimeout || 10;
        const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

        const headers: Record<string, string> = {};
        if (config.requestHeaders && Array.isArray(config.requestHeaders)) {
            config.requestHeaders.forEach((h: any) => {
                if (h.name && h.value) {
                    headers[h.name] = h.value;
                }
            });
        }

        const method = config.httpMethod || "GET";
        const body = (["POST", "PUT", "PATCH"].includes(method) && config.requestBody) ? config.requestBody : undefined;

        const response = await fetch(url, {
            method,
            headers,
            body,
            signal: controller.signal,
            redirect: config.followRedirects === false ? "manual" : "follow",
        });

        clearTimeout(timeoutId);

        let isUp = response.ok;
        const alertCondition = config.alertCondition || "url_unavailable";

        if (alertCondition === "status_not_2xx") {
            isUp = response.status >= 200 && response.status < 300;
        }

        return {
            status: isUp ? "UP" : "DOWN",
            statusCode: response.status,
            responseTime: Date.now() - startTime,
            html: isUp ? await response.text() : undefined,
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
 * Detect tracking scripts in page source.
 */
function detectTrackingScripts(html: string) {
    const findings = {
        gtm: /googletagmanager\.com\/gtm\.js/i.test(html) || /gtm-[a-zA-Z0-9]+/i.test(html),
        ga4: /googletagmanager\.com\/gtag\/js/i.test(html) || /gtag\(/i.test(html),
        meta: /connect\.facebook\.net\/en_US\/fbevents\.js/i.test(html),
    };
    return findings;
}

/**
 * Create a notification for non-200 status codes.
 * Prevents spam: skips if there's already an unread notification
 * for the same URL + statusCode in the last hour.
 */
async function createStatusNotification(
    projectId: string,
    url: string,
    statusCode: number,
    label: string
) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check for existing unread notification for same URL + statusCode
    const existing = await (prisma as any).notification.findFirst({
        where: {
            projectId,
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
            projectId,
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
    projectId: string;
    dataSourceId: string;
    title: string;
    checkedUrl: string;
    statusCode: number | null;
    responseTime: number;
    config?: any;
}) {
    // Check if there's already an open incident for this URL
    const existing = await (prisma as any).incident.findFirst({
        where: {
            projectId: opts.projectId,
            checkedUrl: opts.checkedUrl,
            status: { in: ["ONGOING", "ACKNOWLEDGED"] },
        },
    });

    if (existing) return; // Don't create duplicate

    const causeLabel = opts.statusCode ? getStatusLabel(opts.statusCode) : "Connection Timeout";
    const causeCode = opts.statusCode ? String(opts.statusCode) : "T/O";

    const incident = await (prisma as any).incident.create({
        data: {
            projectId: opts.projectId,
            dataSourceId: opts.dataSourceId,
            title: opts.title,
            cause: `Status ${causeCode}`,
            causeCode: causeCode,
            status: "ONGOING",
            checkedUrl: opts.checkedUrl,
            httpMethod: opts.config?.httpMethod || "GET",
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

    // Resolve notification config (respects global/custom/disabled mode)
    const notifConfig = await resolveNotificationConfig(opts.projectId);
    const client = await (prisma as any).project.findUnique({
        where: { id: opts.projectId },
        select: { name: true }
    });

    if (client && notifConfig.enabled) {
        const payload = {
            incidentTitle: opts.title,
            incidentCause: `Status ${causeCode}`,
            clientName: client.name,
            startedAt: new Date(),
            recipients: notifConfig.recipients,
            incidentId: incident.id,
            projectId: opts.projectId,
        };

        const notifiedChannels = [];

        // Fire & Forget: Send Email Alerts
        if (payload.recipients.length > 0 && opts.config?.notifyEmail !== false) {
            sendIncidentAlertEmail(payload).catch(err => console.error(err));
            notifiedChannels.push(`E-mail (${payload.recipients.join(', ')})`);
        }

        // Fire & Forget: Send Slack Alert
        if (notifConfig.slackWebhookUrl && opts.config?.notifySlack) {
            sendSlackAlert(notifConfig.slackWebhookUrl, payload).catch(err => console.error(err));
            notifiedChannels.push("Slack");
        }

        if (notifiedChannels.length > 0) {
            await (prisma as any).incidentEvent.create({
                data: {
                    incidentId: incident.id,
                    type: "NOTIFICATION_SENT",
                    message: `Notificatie verzonden via: ${notifiedChannels.join(' en ')}`,
                    userName: "Systeem",
                }
            });
        }
    }
}

/**
 * Auto-resolve open incidents for a specific data source and URL when the site recovers.
 */
export async function autoResolveIncidents(dataSourceId: string, checkedUrl: string, config: any = {}) {
    const now = new Date();
    const dataSource = await (prisma as any).dataSource.findUnique({
        where: { id: dataSourceId },
        select: { projectId: true, name: true, externalId: true }
    });

    if (!dataSource) return;

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
                resolvedAt: now,
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

        const duration = formatDistanceStrict(inc.startedAt, now, { locale: nl });

        // Trigger Resolution Notifications (respects global/custom/disabled mode)
        const notifConfig = await resolveNotificationConfig(dataSource.projectId);
        const client = await (prisma as any).project.findUnique({
            where: { id: dataSource.projectId },
            select: { name: true }
        });

        if (client && notifConfig.enabled) {
            const payload = {
                incidentTitle: dataSource.name || dataSource.externalId,
                incidentCause: inc.cause,
                clientName: client.name,
                startedAt: inc.startedAt,
                duration: duration,
                recipients: notifConfig.recipients,
                incidentId: inc.id,
                projectId: dataSource.projectId,
            };

            const notifiedChannels = [];

            if (payload.recipients.length > 0 && config.notifyEmail !== false) {
                sendIncidentResolvedEmail(payload).catch(err => console.error(err));
                notifiedChannels.push(`E-mail (${payload.recipients.join(', ')})`);
            }

            if (notifConfig.slackWebhookUrl && config.notifySlack) {
                sendSlackResolvedAlert(notifConfig.slackWebhookUrl, payload).catch(err => console.error(err));
                notifiedChannels.push("Slack");
            }

            if (notifiedChannels.length > 0) {
                await (prisma as any).incidentEvent.create({
                    data: {
                        incidentId: inc.id,
                        type: "NOTIFICATION_SENT",
                        message: `Resolutie-notificatie verzonden via: ${notifiedChannels.join(' en ')} (duur: ${duration})`,
                        userName: "Systeem",
                    }
                });
            }
        }
    }
}
