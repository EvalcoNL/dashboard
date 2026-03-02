// ═══════════════════════════════════════════════════════════════════
// Built-in Dimensions — Computed at query time from existing data
// ═══════════════════════════════════════════════════════════════════

export interface BuiltinDimensionDef {
    slug: string;
    name: string;
    description: string;
    dataType: 'STRING' | 'NUMBER' | 'DATE';
    /** Source column this dimension is derived from */
    sourceColumn: string;
    /** Compute the value from a raw data row */
    compute: (row: Record<string, string | number>) => string | number;
}

const DAY_NAMES_NL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];

const MONTH_NAMES_NL = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];

export const BUILTIN_DIMENSIONS: BuiltinDimensionDef[] = [
    {
        slug: 'date',
        name: 'Datum',
        description: 'De datum van de meting',
        dataType: 'DATE',
        sourceColumn: 'date',
        compute: (row) => String(row.date || ''),
    },
    {
        slug: 'day_of_week',
        name: 'Dag van de week',
        description: 'De weekdag, bijv. "Maandag"',
        dataType: 'STRING',
        sourceColumn: 'date',
        compute: (row) => {
            const d = new Date(String(row.date));
            return isNaN(d.getTime()) ? '' : DAY_NAMES_NL[d.getDay()];
        },
    },
    {
        slug: 'month',
        name: 'Maand',
        description: 'De maandnaam, bijv. "Januari"',
        dataType: 'STRING',
        sourceColumn: 'date',
        compute: (row) => {
            const d = new Date(String(row.date));
            return isNaN(d.getTime()) ? '' : MONTH_NAMES_NL[d.getMonth()];
        },
    },
    {
        slug: 'month_number',
        name: 'Maandnummer',
        description: 'Het maandnummer, bijv. "02"',
        dataType: 'STRING',
        sourceColumn: 'date',
        compute: (row) => {
            const d = new Date(String(row.date));
            return isNaN(d.getTime()) ? '' : String(d.getMonth() + 1).padStart(2, '0');
        },
    },
    {
        slug: 'year',
        name: 'Jaar',
        description: 'Het jaar, bijv. "2026"',
        dataType: 'STRING',
        sourceColumn: 'date',
        compute: (row) => {
            const d = new Date(String(row.date));
            return isNaN(d.getTime()) ? '' : String(d.getFullYear());
        },
    },
    {
        slug: 'year_month',
        name: 'Jaar-Maand',
        description: 'Jaar en maand, bijv. "2026-02"',
        dataType: 'STRING',
        sourceColumn: 'date',
        compute: (row) => {
            const s = String(row.date);
            return s.length >= 7 ? s.substring(0, 7) : '';
        },
    },
    {
        slug: 'week_number',
        name: 'Weeknummer',
        description: 'ISO weeknummer, bijv. "09"',
        dataType: 'STRING',
        sourceColumn: 'date',
        compute: (row) => {
            const d = new Date(String(row.date));
            if (isNaN(d.getTime())) return '';
            // ISO week calculation
            const tmp = new Date(d.valueOf());
            tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
            const week1 = new Date(tmp.getFullYear(), 0, 4);
            const weekNum = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
            return String(weekNum).padStart(2, '0');
        },
    },
    {
        slug: 'quarter',
        name: 'Kwartaal',
        description: 'Het kwartaal, bijv. "Q1"',
        dataType: 'STRING',
        sourceColumn: 'date',
        compute: (row) => {
            const d = new Date(String(row.date));
            if (isNaN(d.getTime())) return '';
            return `Q${Math.ceil((d.getMonth() + 1) / 3)}`;
        },
    },
    {
        slug: 'connector_name',
        name: 'Connector',
        description: 'De naam van de connector, bijv. "Google Ads"',
        dataType: 'STRING',
        sourceColumn: 'connector_slug',
        compute: (row) => {
            const slug = String(row.connector_slug || '');
            const names: Record<string, string> = {
                'google-ads': 'Google Ads',
                'meta-ads': 'Meta Ads',
                'ga4': 'Google Analytics 4',
                'linkedin-ads': 'LinkedIn Ads',
                'tiktok-ads': 'TikTok Ads',
                'microsoft-ads': 'Microsoft Ads',
            };
            return names[slug] || slug;
        },
    },
    {
        slug: 'data_source_name',
        name: 'Databron',
        description: 'De naam van de gekoppelde databron',
        dataType: 'STRING',
        sourceColumn: 'data_source_id',
        compute: (row) => {
            // This will be resolved by the query engine with a lookup
            return String(row.data_source_id || '');
        },
    },
];

/** Map slug → definition for quick lookup */
export const BUILTIN_DIMENSION_MAP = new Map(
    BUILTIN_DIMENSIONS.map(d => [d.slug, d])
);

/** Check if a dimension slug is a built-in */
export function isBuiltinDimension(slug: string): boolean {
    return BUILTIN_DIMENSION_MAP.has(slug);
}
