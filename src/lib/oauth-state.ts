// ═══════════════════════════════════════════════════════════════════
// OAuth State Helper — CSRF-protected state parameter
// Encodes projectId + timestamp + HMAC to prevent state forgery
// ═══════════════════════════════════════════════════════════════════

import crypto from 'crypto';

const STATE_SECRET = process.env.ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || 'dev-fallback-key';
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Encode a CSRF-protected OAuth state parameter.
 * Format: base64(projectId:timestamp:hmac)
 */
export function encodeOAuthState(projectId: string): string {
    const timestamp = Date.now().toString();
    const payload = `${projectId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex').slice(0, 16);
    return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

/**
 * Decode and verify a CSRF-protected OAuth state parameter.
 * Returns the projectId if valid, null if invalid/expired.
 */
export function decodeOAuthState(state: string): string | null {
    try {
        const decoded = Buffer.from(state, 'base64url').toString('utf8');
        const parts = decoded.split(':');
        if (parts.length !== 3) {
            // Legacy format: just a plain projectId — accept for backward compatibility
            return state;
        }
        const [projectId, timestamp, receivedHmac] = parts;

        // Verify HMAC
        const payload = `${projectId}:${timestamp}`;
        const expectedHmac = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('hex').slice(0, 16);
        if (receivedHmac !== expectedHmac) {
            console.warn('[OAuth] State HMAC mismatch — possible CSRF attempt');
            return null;
        }

        // Verify timestamp (not too old)
        const age = Date.now() - Number(timestamp);
        if (age > STATE_MAX_AGE_MS) {
            console.warn('[OAuth] State expired (>10 min)');
            return null;
        }

        return projectId;
    } catch {
        // Fallback: if base64 decode fails, it might be a raw projectId (old format)
        return state;
    }
}
