import { describe, it, expect } from 'vitest';
import { getRequestMeta } from '@/lib/audit';

describe('getRequestMeta', () => {
    it('extracts IP from x-forwarded-for header', () => {
        const request = new Request('http://localhost', {
            headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'user-agent': 'TestBrowser/1.0' },
        });
        const meta = getRequestMeta(request);
        expect(meta.ip).toBe('1.2.3.4');
        expect(meta.userAgent).toBe('TestBrowser/1.0');
    });

    it('extracts IP from x-real-ip when no forwarded-for', () => {
        const request = new Request('http://localhost', {
            headers: { 'x-real-ip': '10.0.0.1', 'user-agent': 'Chrome/120' },
        });
        const meta = getRequestMeta(request);
        expect(meta.ip).toBe('10.0.0.1');
    });

    it('returns unknown for missing headers', () => {
        const request = new Request('http://localhost');
        const meta = getRequestMeta(request);
        expect(meta.ip).toBe('unknown');
        expect(meta.userAgent).toBe('unknown');
    });
});
