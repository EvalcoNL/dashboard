// ═══════════════════════════════════════════════════════════════════
// Currencies API — Settings persistence + ECB rate fetching
// ═══════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { prisma } from '@/lib/db';

const SETTINGS_KEYS = {
    baseCurrency: 'currency_base',
    autoConvert: 'currency_auto_convert',
    rateSource: 'currency_rate_source',
    lastRefreshed: 'currency_last_refreshed',
    rates: 'currency_rates',
};

/**
 * GET /api/data-integration/currencies
 * Get currency settings and rates.
 */
export async function GET() {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const settings = await prisma.globalSetting.findMany({
            where: { key: { in: Object.values(SETTINGS_KEYS) } },
        });

        const map = new Map(settings.map(s => [s.key, s.value]));

        return NextResponse.json({
            success: true,
            baseCurrency: map.get(SETTINGS_KEYS.baseCurrency) || 'EUR',
            autoConvert: map.get(SETTINGS_KEYS.autoConvert) !== 'false',
            rateSource: map.get(SETTINGS_KEYS.rateSource) || 'ecb',
            lastRefreshed: map.get(SETTINGS_KEYS.lastRefreshed) || null,
            rates: map.get(SETTINGS_KEYS.rates) ? JSON.parse(map.get(SETTINGS_KEYS.rates)!) : null,
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * POST /api/data-integration/currencies
 * Save currency settings.
 */
export async function POST(request: Request) {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        const { baseCurrency, autoConvert, rateSource } = await request.json();

        const upserts = [];
        if (baseCurrency) {
            upserts.push(prisma.globalSetting.upsert({
                where: { key: SETTINGS_KEYS.baseCurrency },
                update: { value: baseCurrency },
                create: { key: SETTINGS_KEYS.baseCurrency, value: baseCurrency },
            }));
        }
        if (autoConvert !== undefined) {
            upserts.push(prisma.globalSetting.upsert({
                where: { key: SETTINGS_KEYS.autoConvert },
                update: { value: String(autoConvert) },
                create: { key: SETTINGS_KEYS.autoConvert, value: String(autoConvert) },
            }));
        }
        if (rateSource) {
            upserts.push(prisma.globalSetting.upsert({
                where: { key: SETTINGS_KEYS.rateSource },
                update: { value: rateSource },
                create: { key: SETTINGS_KEYS.rateSource, value: rateSource },
            }));
        }

        await Promise.all(upserts);
        return NextResponse.json({ success: true, message: 'Settings saved' });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

/**
 * PATCH /api/data-integration/currencies
 * Refresh exchange rates from ECB.
 */
export async function PATCH() {
    try {
        const [, authError] = await requireAuth();
        if (authError) return authError;

        // Fetch from ECB daily rates (XML → parse)
        const res = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml', {
            next: { revalidate: 0 },
        });

        if (!res.ok) {
            // Fallback to hardcoded rates if ECB is unreachable
            const fallbackRates: Record<string, number> = {
                EUR: 1.0, USD: 1.08, GBP: 0.86, CAD: 1.49, AUD: 1.66,
                SEK: 11.20, NOK: 11.55, DKK: 7.46, CHF: 0.94, JPY: 162.5,
                PLN: 4.30, CZK: 25.30,
            };

            await prisma.globalSetting.upsert({
                where: { key: SETTINGS_KEYS.rates },
                update: { value: JSON.stringify(fallbackRates) },
                create: { key: SETTINGS_KEYS.rates, value: JSON.stringify(fallbackRates) },
            });
            await prisma.globalSetting.upsert({
                where: { key: SETTINGS_KEYS.lastRefreshed },
                update: { value: new Date().toISOString() },
                create: { key: SETTINGS_KEYS.lastRefreshed, value: new Date().toISOString() },
            });

            return NextResponse.json({
                success: true,
                rates: fallbackRates,
                lastRefreshed: new Date().toISOString(),
                source: 'fallback',
            });
        }

        const xml = await res.text();

        // Parse ECB XML for rates
        const rates: Record<string, number> = { EUR: 1.0 };
        const regex = /currency='([A-Z]{3})'\s+rate='([\d.]+)'/g;
        let match;
        while ((match = regex.exec(xml)) !== null) {
            rates[match[1]] = parseFloat(match[2]);
        }

        // Save to DB
        await prisma.globalSetting.upsert({
            where: { key: SETTINGS_KEYS.rates },
            update: { value: JSON.stringify(rates) },
            create: { key: SETTINGS_KEYS.rates, value: JSON.stringify(rates) },
        });
        await prisma.globalSetting.upsert({
            where: { key: SETTINGS_KEYS.lastRefreshed },
            update: { value: new Date().toISOString() },
            create: { key: SETTINGS_KEYS.lastRefreshed, value: new Date().toISOString() },
        });

        return NextResponse.json({
            success: true,
            rates,
            lastRefreshed: new Date().toISOString(),
            source: 'ecb',
            count: Object.keys(rates).length,
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
