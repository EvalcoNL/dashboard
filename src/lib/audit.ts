// ═══════════════════════════════════════════════════════════════════
// Audit Logger — Log security-relevant actions
// ═══════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/db';

export type AuditAction =
    | 'LOGIN'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | '2FA_ENABLED'
    | '2FA_DISABLED'
    | 'BACKUP_CODE_USED'
    | 'PASSWORD_CHANGED'
    | 'PASSWORD_RESET_REQUESTED'
    | 'PASSWORD_RESET_COMPLETED'
    | 'PROFILE_UPDATED'
    | 'EMAIL_CHANGE_REQUESTED'
    | 'EMAIL_VERIFIED'
    | 'USER_CREATED'
    | 'USER_UPDATED'
    | 'USER_DELETED'
    | 'USER_INVITED'
    | 'USER_ROLE_CHANGED'
    | 'PROJECT_CREATED'
    | 'PROJECT_UPDATED'
    | 'PROJECT_DELETED'
    | 'DATA_SOURCE_CREATED'
    | 'DATA_SOURCE_DELETED'
    | 'REPORT_GENERATED'
    | 'EXPORT_CSV'
    | 'SETTINGS_CHANGED'
    | 'ADMIN_ACTION';

interface AuditLogEntry {
    userId?: string | null;
    action: AuditAction;
    target?: string;
    details?: string;
    ip?: string;
    userAgent?: string;
}

/**
 * Log a security-relevant action.
 * This is fire-and-forget — errors are logged but don't affect the request.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
    try {
        await (prisma as any).auditLog.create({
            data: {
                userId: entry.userId || null,
                action: entry.action,
                target: entry.target || null,
                details: entry.details || null,
                ip: entry.ip || null,
                userAgent: entry.userAgent || null,
            },
        });
    } catch (error) {
        console.error('[AuditLog] Failed to write audit log:', error);
        // Don't throw — audit logging should never break the request
    }
}

/**
 * Extract client IP and user agent from a request for audit logging.
 */
export function getRequestMeta(request: Request): { ip: string; userAgent: string } {
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    return { ip, userAgent };
}
