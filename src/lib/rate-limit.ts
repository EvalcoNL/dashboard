// ═══════════════════════════════════════════════════════════════════
// Rate Limiter — In-memory sliding window rate limiter for API routes
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.resetAt < now) {
            store.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given identifier (e.g., IP + endpoint).
 * Returns null if within limit, or a 429 response if exceeded.
 * 
 * @param identifier - Unique key (e.g., IP address or user ID)
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 */
export function checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowMs: number = 60_000
): NextResponse | null {
    const now = Date.now();
    const entry = store.get(identifier);

    if (!entry || entry.resetAt < now) {
        // First request or window expired — start new window
        store.set(identifier, { count: 1, resetAt: now + windowMs });
        return null;
    }

    entry.count++;

    if (entry.count > maxRequests) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return NextResponse.json(
            { success: false, error: 'Too many requests. Please try again later.' },
            {
                status: 429,
                headers: {
                    'Retry-After': String(retryAfter),
                    'X-RateLimit-Limit': String(maxRequests),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
                },
            }
        );
    }

    return null;
}

/**
 * Get client IP from request headers (works behind proxies).
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}

// ─── Preset rate limiters ───

/** Rate limit for login attempts: 5 per minute per IP */
export function rateLimitLogin(request: Request): NextResponse | null {
    const ip = getClientIp(request);
    return checkRateLimit(`login:${ip}`, 5, 60_000);
}

/** Rate limit for general API calls: 120 per minute per IP */
export function rateLimitApi(request: Request): NextResponse | null {
    const ip = getClientIp(request);
    return checkRateLimit(`api:${ip}`, 120, 60_000);
}

/** Rate limit for cron endpoints: 2 per minute */
export function rateLimitCron(request: Request): NextResponse | null {
    return checkRateLimit('cron:global', 2, 60_000);
}
