// ═══════════════════════════════════════════════════════════════════
// Field Registry — Single Source of Truth
// All dimensions, metrics, and built-in dimensions in one place
// ═══════════════════════════════════════════════════════════════════

// ─── Types ───

export type AggregationType = 'SUM' | 'AVG' | 'WEIGHTED_AVG' | 'NONE';
export type FieldDataType = 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'PERCENTAGE' | 'DURATION' | 'BOOLEAN';
export type FieldType = 'dimension' | 'metric' | 'derived_metric' | 'builtin_dimension';

/**
 * The level in the advertising hierarchy that a dimension belongs to.
 * Used for automatic level detection in queries.
 */
export type HierarchyLevel = 'campaign' | 'ad_group' | 'ad' | 'keyword' | 'segment' | 'analytics' | 'none';

export interface FieldDefinition {
    slug: string;
    type: FieldType;
    nameNl: string;
    nameEn: string;
    category: string;
    dataType: FieldDataType;
    description?: string;

    // Metric-specific
    aggregation?: AggregationType;
    formula?: string;
    /** For weighted averages: the weight field slug */
    weightField?: string;

    // Dimension-specific
    hierarchyLevel?: HierarchyLevel;

    // Built-in dimension specific
    sourceColumn?: string;
    compute?: (row: Record<string, string | number>) => string | number;
}

// ─── Helper constants for computed built-ins ───

const DAY_NAMES_NL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
const MONTH_NAMES_NL = [
    'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
    'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];

// ═══════════════════════════════════════════════════════════════════
// DIMENSIONS
// ═══════════════════════════════════════════════════════════════════

const DIMENSIONS: FieldDefinition[] = [
    // --- Tijd ---
    { slug: 'date', type: 'dimension', nameNl: 'Datum', nameEn: 'Date', category: 'Tijd', dataType: 'DATE', hierarchyLevel: 'none', description: 'De datum waarop de prestaties zijn gemeten' },
    { slug: 'hour', type: 'dimension', nameNl: 'Uur', nameEn: 'Hour', category: 'Tijd', dataType: 'STRING', hierarchyLevel: 'none', description: 'Het uur van de dag waarop de data is verzameld' },
    { slug: 'hour_of_day', type: 'dimension', nameNl: 'Uur van de dag', nameEn: 'Hour of Day', category: 'Tijd', dataType: 'NUMBER', hierarchyLevel: 'none', description: 'Het uur van de dag waarop de advertentie is vertoond (0-23)' },

    // --- Campaign ---
    { slug: 'campaign_id', type: 'dimension', nameNl: 'Campaign ID', nameEn: 'Campaign ID', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'Unieke identificatie van de campagne' },
    { slug: 'campaign_name', type: 'dimension', nameNl: 'Campaign Naam', nameEn: 'Campaign Name', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'De naam van de campagne' },
    { slug: 'campaign_type', type: 'dimension', nameNl: 'Campaign Type', nameEn: 'Campaign Type', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'Het type campagne (bijv. Search, Display, Shopping)' },
    { slug: 'campaign_status', type: 'dimension', nameNl: 'Campaign Status', nameEn: 'Campaign Status', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'De huidige status van de campagne' },
    { slug: 'bidding_strategy_type', type: 'dimension', nameNl: 'Biedstrategie Type', nameEn: 'Bidding Strategy Type', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'Het type biedstrategie' },
    { slug: 'campaign_budget', type: 'dimension', nameNl: 'Campaign Budget', nameEn: 'Campaign Budget', category: 'Campaign', dataType: 'NUMBER', hierarchyLevel: 'campaign', description: 'Het dagelijks budget voor de campagne' },
    { slug: 'campaign_labels', type: 'dimension', nameNl: 'Campaign Labels', nameEn: 'Campaign Labels', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'Labels toegewezen aan de campagne' },
    { slug: 'campaign_start_date', type: 'dimension', nameNl: 'Startdatum (Campaign)', nameEn: 'Start Date (Campaign)', category: 'Campaign', dataType: 'DATE', hierarchyLevel: 'campaign', description: 'De geplande startdatum van de campagne' },
    { slug: 'campaign_end_date', type: 'dimension', nameNl: 'Einddatum (Campaign)', nameEn: 'End Date (Campaign)', category: 'Campaign', dataType: 'DATE', hierarchyLevel: 'campaign', description: 'De geplande einddatum van de campagne' },
    { slug: 'campaign_objective', type: 'dimension', nameNl: 'Campagne Doelstelling', nameEn: 'Campaign Objective', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'Het doel van de campagne' },
    { slug: 'status', type: 'dimension', nameNl: 'Campaign Status', nameEn: 'Campaign Status', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'De operationele status van de campagne' },
    { slug: 'serving_status', type: 'dimension', nameNl: 'Serving Status', nameEn: 'Serving Status', category: 'Campaign', dataType: 'STRING', hierarchyLevel: 'campaign', description: 'Of de campagne momenteel advertenties vertoont' },

    // --- Ad Group ---
    { slug: 'ad_group_id', type: 'dimension', nameNl: 'Ad Group ID', nameEn: 'Ad Group ID', category: 'Ad Group', dataType: 'STRING', hierarchyLevel: 'ad_group', description: 'Unieke identificatie van de ad group' },
    { slug: 'ad_group_name', type: 'dimension', nameNl: 'Ad Group Naam', nameEn: 'Ad Group Name', category: 'Ad Group', dataType: 'STRING', hierarchyLevel: 'ad_group', description: 'De naam van de ad group' },
    { slug: 'ad_group_status', type: 'dimension', nameNl: 'Ad Group Status', nameEn: 'Ad Group Status', category: 'Ad Group', dataType: 'STRING', hierarchyLevel: 'ad_group', description: 'De huidige status van de ad group' },
    { slug: 'ad_group_type', type: 'dimension', nameNl: 'Ad Group Type', nameEn: 'Ad Group Type', category: 'Ad Group', dataType: 'STRING', hierarchyLevel: 'ad_group', description: 'Het type ad group' },
    { slug: 'ad_group_cpc_bid', type: 'dimension', nameNl: 'Ad Group CPC Bod', nameEn: 'Ad Group CPC Bid', category: 'Ad Group', dataType: 'NUMBER', hierarchyLevel: 'ad_group', description: 'Het standaard CPC bod op ad group niveau' },

    // --- Ad ---
    { slug: 'ad_id', type: 'dimension', nameNl: 'Ad ID', nameEn: 'Ad ID', category: 'Ad', dataType: 'STRING', hierarchyLevel: 'ad', description: 'Unieke identificatie van de advertentie' },
    { slug: 'ad_name', type: 'dimension', nameNl: 'Ad Naam', nameEn: 'Ad Name', category: 'Ad', dataType: 'STRING', hierarchyLevel: 'ad', description: 'De naam of kop van de advertentie' },
    { slug: 'ad_type', type: 'dimension', nameNl: 'Ad Type', nameEn: 'Ad Type', category: 'Ad', dataType: 'STRING', hierarchyLevel: 'ad', description: 'Het formaat van de advertentie' },

    // --- Keyword ---
    { slug: 'keyword_text', type: 'dimension', nameNl: 'Keyword', nameEn: 'Keyword', category: 'Keyword', dataType: 'STRING', hierarchyLevel: 'keyword', description: 'Het zoekwoord waarop wordt geboden' },
    { slug: 'keyword_match_type', type: 'dimension', nameNl: 'Match Type', nameEn: 'Match Type', category: 'Keyword', dataType: 'STRING', hierarchyLevel: 'keyword', description: 'Het matchtype van het keyword' },

    // --- Targeting / Demografie ---
    { slug: 'device', type: 'dimension', nameNl: 'Apparaat', nameEn: 'Device', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Het type apparaat (Desktop, Mobiel, Tablet)' },
    { slug: 'device_category', type: 'dimension', nameNl: 'Apparaat Categorie', nameEn: 'Device Category', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Categorisering van het apparaat' },
    { slug: 'browser', type: 'dimension', nameNl: 'Browser', nameEn: 'Browser', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'De browser van de gebruiker' },
    { slug: 'country', type: 'dimension', nameNl: 'Land', nameEn: 'Country', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Het land van de gebruiker' },
    { slug: 'region', type: 'dimension', nameNl: 'Regio', nameEn: 'Region', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'De regio of provincie' },
    { slug: 'city', type: 'dimension', nameNl: 'Stad', nameEn: 'City', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'De stad van de gebruiker' },
    { slug: 'age', type: 'dimension', nameNl: 'Leeftijd', nameEn: 'Age Range', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'De leeftijdsgroep van de gebruiker' },
    { slug: 'gender', type: 'dimension', nameNl: 'Geslacht', nameEn: 'Gender', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Het geslacht van de gebruiker' },

    // --- Kanaal / Netwerk ---
    { slug: 'network', type: 'dimension', nameNl: 'Netwerk', nameEn: 'Network', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Het advertentienetwerk' },
    { slug: 'channel', type: 'dimension', nameNl: 'Kanaal', nameEn: 'Channel', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Het marketingkanaal' },
    { slug: 'placement', type: 'dimension', nameNl: 'Plaatsing', nameEn: 'Placement', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'De specifieke website/app waar de advertentie wordt getoond' },
    { slug: 'slot', type: 'dimension', nameNl: 'Positie', nameEn: 'Slot', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'De positie van de advertentie op de pagina' },
    { slug: 'publisher_platform', type: 'dimension', nameNl: 'Publicatieplatform', nameEn: 'Publisher Platform', category: 'Segment', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Het platform waarop is gepubliceerd' },

    // --- Conversie ---
    { slug: 'conversion_action_name', type: 'dimension', nameNl: 'Conversie Naam', nameEn: 'Conversion Name', category: 'Conversie', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Naam van de conversieactie' },
    { slug: 'conversion_action_category', type: 'dimension', nameNl: 'Conversie Categorie', nameEn: 'Conversion Category', category: 'Conversie', dataType: 'STRING', hierarchyLevel: 'segment', description: 'Categorie van de conversie' },

    // --- Website / Analytics (GA4) ---
    { slug: 'page_path', type: 'dimension', nameNl: 'Pagina Pad', nameEn: 'Page Path', category: 'Website / Analytics', dataType: 'STRING', hierarchyLevel: 'analytics', description: 'URL-pad van de pagina' },
    { slug: 'page_title', type: 'dimension', nameNl: 'Pagina Titel', nameEn: 'Page Title', category: 'Website / Analytics', dataType: 'STRING', hierarchyLevel: 'analytics', description: 'Titel van de bezochte pagina' },
    { slug: 'landing_page', type: 'dimension', nameNl: 'Landingspagina', nameEn: 'Landing Page', category: 'Website / Analytics', dataType: 'STRING', hierarchyLevel: 'analytics', description: 'De eerste pagina bij sessiestart' },
    { slug: 'session_source', type: 'dimension', nameNl: 'Sessie Bron', nameEn: 'Session Source', category: 'Website / Analytics', dataType: 'STRING', hierarchyLevel: 'analytics', description: 'De verkeersbron van de sessie' },
    { slug: 'session_medium', type: 'dimension', nameNl: 'Sessie Medium', nameEn: 'Session Medium', category: 'Website / Analytics', dataType: 'STRING', hierarchyLevel: 'analytics', description: 'Het medium van de sessie' },
    { slug: 'session_campaign_name', type: 'dimension', nameNl: 'Sessie Campagne', nameEn: 'Session Campaign', category: 'Website / Analytics', dataType: 'STRING', hierarchyLevel: 'analytics', description: 'Campagnenaam via UTM-parameters' },
];

// ═══════════════════════════════════════════════════════════════════
// BUILT-IN DIMENSIONS (computed at query time)
// ═══════════════════════════════════════════════════════════════════

const BUILTIN_DIMS: FieldDefinition[] = [
    {
        slug: 'day_of_week', type: 'builtin_dimension', nameNl: 'Dag van de week', nameEn: 'Day of Week',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'date',
        compute: (row) => { const d = new Date(String(row.date)); return isNaN(d.getTime()) ? '' : DAY_NAMES_NL[d.getDay()]; },
        description: 'De weekdag, bijv. "Maandag"',
    },
    {
        slug: 'month', type: 'builtin_dimension', nameNl: 'Maand', nameEn: 'Month',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'date',
        compute: (row) => { const d = new Date(String(row.date)); return isNaN(d.getTime()) ? '' : MONTH_NAMES_NL[d.getMonth()]; },
        description: 'De maandnaam, bijv. "Januari"',
    },
    {
        slug: 'month_number', type: 'builtin_dimension', nameNl: 'Maandnummer', nameEn: 'Month Number',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'date',
        compute: (row) => { const d = new Date(String(row.date)); return isNaN(d.getTime()) ? '' : String(d.getMonth() + 1).padStart(2, '0'); },
        description: 'Het maandnummer, bijv. "02"',
    },
    {
        slug: 'year', type: 'builtin_dimension', nameNl: 'Jaar', nameEn: 'Year',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'date',
        compute: (row) => { const d = new Date(String(row.date)); return isNaN(d.getTime()) ? '' : String(d.getFullYear()); },
        description: 'Het jaar, bijv. "2026"',
    },
    {
        slug: 'year_month', type: 'builtin_dimension', nameNl: 'Jaar-Maand', nameEn: 'Year-Month',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'date',
        compute: (row) => { const s = String(row.date); return s.length >= 7 ? s.substring(0, 7) : ''; },
        description: 'Jaar en maand, bijv. "2026-02"',
    },
    {
        slug: 'week_number', type: 'builtin_dimension', nameNl: 'Weeknummer', nameEn: 'Week Number',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'date',
        compute: (row) => {
            const d = new Date(String(row.date));
            if (isNaN(d.getTime())) return '';
            const tmp = new Date(d.valueOf());
            tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
            const week1 = new Date(tmp.getFullYear(), 0, 4);
            const weekNum = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
            return String(weekNum).padStart(2, '0');
        },
        description: 'ISO weeknummer, bijv. "09"',
    },
    {
        slug: 'quarter', type: 'builtin_dimension', nameNl: 'Kwartaal', nameEn: 'Quarter',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'date',
        compute: (row) => { const d = new Date(String(row.date)); return isNaN(d.getTime()) ? '' : `Q${Math.ceil((d.getMonth() + 1) / 3)}`; },
        description: 'Het kwartaal, bijv. "Q1"',
    },
    {
        slug: 'connector_name', type: 'builtin_dimension', nameNl: 'Connector', nameEn: 'Connector',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'connector_slug',
        compute: (row) => {
            const slug = String(row.connector_slug || '');
            const names: Record<string, string> = {
                'google-ads': 'Google Ads', 'meta-ads': 'Meta Ads', 'ga4': 'Google Analytics 4',
                'linkedin-ads': 'LinkedIn Ads', 'tiktok-ads': 'TikTok Ads', 'microsoft-ads': 'Microsoft Ads',
            };
            return names[slug] || slug;
        },
        description: 'De naam van de connector',
    },
    {
        slug: 'data_source_name', type: 'builtin_dimension', nameNl: 'Databron', nameEn: 'Data Source',
        category: 'Systeem', dataType: 'STRING', sourceColumn: 'data_source_id',
        compute: (row) => String(row.data_source_id || ''),
        description: 'De naam van de gekoppelde databron',
    },
];

// ═══════════════════════════════════════════════════════════════════
// METRICS (base — stored in ClickHouse)
// ═══════════════════════════════════════════════════════════════════

const BASE_METRICS: FieldDefinition[] = [
    // ─── Prestatie ───
    { slug: 'impressions', type: 'metric', nameNl: 'Impressies', nameEn: 'Impressions', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal keren dat de advertentie is vertoond' },
    { slug: 'clicks', type: 'metric', nameNl: 'Klikken', nameEn: 'Clicks', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal klikken op de advertentie' },
    { slug: 'reach', type: 'metric', nameNl: 'Bereik', nameEn: 'Reach', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal unieke gebruikers dat de advertentie heeft gezien' },
    { slug: 'frequency', type: 'metric', nameNl: 'Frequentie', nameEn: 'Frequency', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'WEIGHTED_AVG', weightField: 'impressions', description: 'Gemiddeld aantal vertoningen per gebruiker' },
    { slug: 'unique_clicks', type: 'metric', nameNl: 'Unieke Klikken', nameEn: 'Unique Clicks', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal unieke gebruikers dat heeft geklikt' },
    { slug: 'link_clicks', type: 'metric', nameNl: 'Link Klikken', nameEn: 'Link Clicks', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal klikken op links in de advertentie' },
    { slug: 'interactions', type: 'metric', nameNl: 'Interacties', nameEn: 'Interactions', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Klikken, views en andere interacties' },
    { slug: 'invalid_clicks', type: 'metric', nameNl: 'Ongeldige Klikken', nameEn: 'Invalid Clicks', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Klikken die als ongeldig worden beschouwd' },
    { slug: 'search_impressions', type: 'metric', nameNl: 'Zoek Impressies', nameEn: 'Search Impressions', category: 'Prestatie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Impressies op zoekresultatenpaginas' },

    // ─── Kosten ───
    { slug: 'cost', type: 'metric', nameNl: 'Kosten', nameEn: 'Cost', category: 'Kosten', dataType: 'CURRENCY', aggregation: 'SUM', description: 'Totale kosten' },

    // ─── Conversie ───
    { slug: 'conversions', type: 'metric', nameNl: 'Conversies', nameEn: 'Conversions', category: 'Conversie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal conversies' },
    { slug: 'conversion_value', type: 'metric', nameNl: 'Conversiewaarde', nameEn: 'Conversion Value', category: 'Conversie', dataType: 'CURRENCY', aggregation: 'SUM', description: 'Totale waarde van de conversies' },
    { slug: 'all_conversions', type: 'metric', nameNl: 'Alle Conversies', nameEn: 'All Conversions', category: 'Conversie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Alle conversies incl. cross-device' },
    { slug: 'all_conv_value', type: 'metric', nameNl: 'Alle Conv. Waarde', nameEn: 'All Conv. Value', category: 'Conversie', dataType: 'CURRENCY', aggregation: 'SUM', description: 'Totale waarde incl. view-through' },
    { slug: 'view_through_conversions', type: 'metric', nameNl: 'View-Through Conversies', nameEn: 'View-Through Conversions', category: 'Conversie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Conversies na impressie zonder klik' },
    { slug: 'conv_platform_comparable', type: 'metric', nameNl: 'Conv. (Platform Vergelijkbaar)', nameEn: 'Conv. (Platform Comparable)', category: 'Conversie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Platform-vergelijkbare conversies' },
    { slug: 'phone_calls', type: 'metric', nameNl: 'Telefoonoproepen', nameEn: 'Phone Calls', category: 'Conversie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Telefoonoproepen via advertenties' },
    { slug: 'phone_impressions', type: 'metric', nameNl: 'Telefoon Impressies', nameEn: 'Phone Impressions', category: 'Conversie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Telefoon-impressies in advertenties' },

    // ─── Video ───
    { slug: 'video_views', type: 'metric', nameNl: 'Video Views', nameEn: 'Video Views', category: 'Video', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal video weergaven' },
    { slug: 'video_impressions', type: 'metric', nameNl: 'Video Impressies', nameEn: 'Video Impressions', category: 'Video', dataType: 'NUMBER', aggregation: 'SUM', description: 'Impressies op video-advertenties' },
    { slug: 'views_25', type: 'metric', nameNl: 'Views (25%)', nameEn: 'Views (25%)', category: 'Video', dataType: 'NUMBER', aggregation: 'SUM', description: 'Video afgespeeld tot 25%' },
    { slug: 'views_50', type: 'metric', nameNl: 'Views (50%)', nameEn: 'Views (50%)', category: 'Video', dataType: 'NUMBER', aggregation: 'SUM', description: 'Video afgespeeld tot 50%' },
    { slug: 'views_75', type: 'metric', nameNl: 'Views (75%)', nameEn: 'Views (75%)', category: 'Video', dataType: 'NUMBER', aggregation: 'SUM', description: 'Video afgespeeld tot 75%' },
    { slug: 'views_100', type: 'metric', nameNl: 'Views (100%)', nameEn: 'Views (100%)', category: 'Video', dataType: 'NUMBER', aggregation: 'SUM', description: 'Video volledig afgespeeld' },

    // ─── Engagement ───
    { slug: 'post_engagement', type: 'metric', nameNl: 'Post Engagement', nameEn: 'Post Engagement', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Totale betrokkenheid bij een post' },
    { slug: 'engagements', type: 'metric', nameNl: 'Engagements', nameEn: 'Engagements', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Totaal engagement-acties' },
    { slug: 'likes', type: 'metric', nameNl: 'Likes', nameEn: 'Likes', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal likes' },
    { slug: 'comments', type: 'metric', nameNl: 'Reacties', nameEn: 'Comments', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal reacties' },
    { slug: 'shares', type: 'metric', nameNl: 'Shares', nameEn: 'Shares', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal shares' },
    { slug: 'follows', type: 'metric', nameNl: 'Follows', nameEn: 'Follows', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal nieuwe volgers' },
    { slug: 'gmail_clicks', type: 'metric', nameNl: 'Gmail Klikken', nameEn: 'Gmail Clicks', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Klikken vanuit Gmail-advertenties' },
    { slug: 'gmail_forwards', type: 'metric', nameNl: 'Gmail Doorsturen', nameEn: 'Gmail Forwards', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Gmail-advertentie doorgestuurd' },
    { slug: 'gmail_saves', type: 'metric', nameNl: 'Gmail Opgeslagen', nameEn: 'Gmail Saves', category: 'Engagement', dataType: 'NUMBER', aggregation: 'SUM', description: 'Gmail-advertentie opgeslagen' },

    // ─── Concurrentie ───
    { slug: 'impression_share', type: 'metric', nameNl: 'Impressie Aandeel', nameEn: 'Impression Share', category: 'Concurrentie', dataType: 'PERCENTAGE', aggregation: 'WEIGHTED_AVG', weightField: 'impressions', description: 'Percentage impressies t.o.v. beschikbaar' },
    { slug: 'quality_score', type: 'metric', nameNl: 'Kwaliteitsscore', nameEn: 'Quality Score', category: 'Concurrentie', dataType: 'NUMBER', aggregation: 'AVG', description: 'Kwaliteitsscore (1-10)' },
    { slug: 'engagement_rate', type: 'metric', nameNl: 'Betrokkenheidspercentage', nameEn: 'Engagement Rate', category: 'Concurrentie', dataType: 'PERCENTAGE', aggregation: 'WEIGHTED_AVG', weightField: 'impressions', description: 'Engagement t.o.v. totaal' },
    { slug: 'total_top_impressions', type: 'metric', nameNl: 'Totaal Top Impressies', nameEn: 'Total Top Impressions', category: 'Concurrentie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Impressies boven organische resultaten' },
    { slug: 'abs_top_impressions', type: 'metric', nameNl: 'Absolute Top Impressies', nameEn: 'Abs. Top Impressions', category: 'Concurrentie', dataType: 'NUMBER', aggregation: 'SUM', description: 'Impressies op absolute toppositie' },

    // ─── Bieden ───
    { slug: 'campaign_daily_budget', type: 'metric', nameNl: 'Dagbudget (Campaign)', nameEn: 'Daily Budget (Campaign)', category: 'Bieden', dataType: 'CURRENCY', aggregation: 'AVG', description: 'Dagelijks budget' },
    { slug: 'campaign_total_budget', type: 'metric', nameNl: 'Totaalbudget (Campaign)', nameEn: 'Total Budget (Campaign)', category: 'Bieden', dataType: 'CURRENCY', aggregation: 'AVG', description: 'Totaal budget' },
    { slug: 'target_cpa_campaign', type: 'metric', nameNl: 'Doel CPA (Campaign)', nameEn: 'Target CPA (Campaign)', category: 'Bieden', dataType: 'CURRENCY', aggregation: 'AVG', description: 'Doel CPA op campagneniveau' },
    { slug: 'target_cpa_adgroup', type: 'metric', nameNl: 'Doel CPA (Ad Group)', nameEn: 'Target CPA (Ad Group)', category: 'Bieden', dataType: 'CURRENCY', aggregation: 'AVG', description: 'Doel CPA op ad group niveau' },
    { slug: 'target_roas', type: 'metric', nameNl: 'Doel ROAS', nameEn: 'Target ROAS', category: 'Bieden', dataType: 'PERCENTAGE', aggregation: 'AVG', description: 'Doel ROAS-percentage' },

    // ─── E-commerce ───
    { slug: 'purchase_revenue', type: 'metric', nameNl: 'Aankoopomzet', nameEn: 'Purchase Revenue', category: 'E-commerce', dataType: 'CURRENCY', aggregation: 'SUM', description: 'Totale omzet uit aankopen' },
    { slug: 'revenue', type: 'metric', nameNl: 'Omzet', nameEn: 'Revenue', category: 'E-commerce', dataType: 'CURRENCY', aggregation: 'SUM', description: 'Totale omzet uit advertentie-attributie' },
    { slug: 'gross_profit', type: 'metric', nameNl: 'Bruto Winst', nameEn: 'Gross Profit', category: 'E-commerce', dataType: 'CURRENCY', aggregation: 'SUM', description: 'Omzet minus COGS' },
    { slug: 'transactions', type: 'metric', nameNl: 'Transacties', nameEn: 'Transactions', category: 'E-commerce', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal e-commerce transacties' },
    { slug: 'adds_to_cart', type: 'metric', nameNl: 'Toevoegingen aan Winkelwagen', nameEn: 'Add to Cart', category: 'E-commerce', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal toevoegingen aan winkelwagen' },
    { slug: 'new_customer_ltv', type: 'metric', nameNl: 'Nieuwe Klant LTV', nameEn: 'New Customer LTV', category: 'E-commerce', dataType: 'CURRENCY', aggregation: 'SUM', description: 'Lifetime value nieuwe klanten' },

    // ─── Website / Analytics (GA4) ───
    // NOTE: ClickHouse columns use page_views and avg_session_duration
    // The registry uses the canonical names; normalization aliases are handled in COLUMN_ALIASES
    { slug: 'sessions', type: 'metric', nameNl: 'Sessies', nameEn: 'Sessions', category: 'Website / Analytics', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal website sessies' },
    { slug: 'total_users', type: 'metric', nameNl: 'Totaal Gebruikers', nameEn: 'Total Users', category: 'Website / Analytics', dataType: 'NUMBER', aggregation: 'SUM', description: 'Totaal unieke gebruikers' },
    { slug: 'active_users', type: 'metric', nameNl: 'Actieve Gebruikers', nameEn: 'Active Users', category: 'Website / Analytics', dataType: 'NUMBER', aggregation: 'SUM', description: 'Actieve gebruikers in de periode' },
    { slug: 'new_users', type: 'metric', nameNl: 'Nieuwe Gebruikers', nameEn: 'New Users', category: 'Website / Analytics', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal nieuwe gebruikers' },
    { slug: 'screen_page_views', type: 'metric', nameNl: 'Paginaweergaven', nameEn: 'Page Views', category: 'Website / Analytics', dataType: 'NUMBER', aggregation: 'SUM', description: 'Aantal paginaweergaven' },
    { slug: 'bounce_rate', type: 'metric', nameNl: 'Bouncepercentage', nameEn: 'Bounce Rate', category: 'Website / Analytics', dataType: 'PERCENTAGE', aggregation: 'WEIGHTED_AVG', weightField: 'sessions', description: 'Percentage sessies met slechts één paginaweergave' },
    { slug: 'average_session_duration', type: 'metric', nameNl: 'Gem. Sessieduur', nameEn: 'Avg. Session Duration', category: 'Website / Analytics', dataType: 'DURATION', aggregation: 'WEIGHTED_AVG', weightField: 'sessions', description: 'Gemiddelde duur van een sessie' },
    { slug: 'event_count', type: 'metric', nameNl: 'Aantal Events', nameEn: 'Event Count', category: 'Website / Analytics', dataType: 'NUMBER', aggregation: 'SUM', description: 'Totaal aantal events' },
];

// ═══════════════════════════════════════════════════════════════════
// DERIVED METRICS (calculated at query-time, not stored)
// ═══════════════════════════════════════════════════════════════════

const DERIVED_METRICS: FieldDefinition[] = [
    { slug: 'ctr', type: 'derived_metric', nameNl: 'CTR (%)', nameEn: 'CTR (%)', category: 'Berekend', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'clicks / impressions * 100', description: 'Click-Through Rate' },
    { slug: 'cpc', type: 'derived_metric', nameNl: 'CPC', nameEn: 'CPC', category: 'Berekend', dataType: 'CURRENCY', aggregation: 'NONE', formula: 'cost / clicks', description: 'Cost Per Click' },
    { slug: 'cpm', type: 'derived_metric', nameNl: 'CPM', nameEn: 'CPM', category: 'Berekend', dataType: 'CURRENCY', aggregation: 'NONE', formula: 'cost / impressions * 1000', description: 'Cost Per Mille' },
    { slug: 'roas', type: 'derived_metric', nameNl: 'ROAS', nameEn: 'ROAS', category: 'Berekend', dataType: 'NUMBER', aggregation: 'NONE', formula: 'conversion_value / cost', description: 'Return On Ad Spend' },
    { slug: 'conversion_rate', type: 'derived_metric', nameNl: 'Conversiepercentage (%)', nameEn: 'Conversion Rate (%)', category: 'Berekend', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'conversions / clicks * 100', description: 'Conversiepercentage' },
    { slug: 'cost_per_conversion', type: 'derived_metric', nameNl: 'Kosten per Conversie', nameEn: 'Cost per Conversion', category: 'Berekend', dataType: 'CURRENCY', aggregation: 'NONE', formula: 'cost / conversions', description: 'Kosten per conversie' },
    { slug: 'conv_value_per_cost', type: 'derived_metric', nameNl: 'Conv. Waarde / Kosten', nameEn: 'Conv. Value / Cost', category: 'Berekend', dataType: 'NUMBER', aggregation: 'NONE', formula: 'conversion_value / cost', description: 'Conversiewaarde gedeeld door kosten' },
    { slug: 'video_view_rate', type: 'derived_metric', nameNl: 'Video View Rate (%)', nameEn: 'Video View Rate (%)', category: 'Berekend', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'video_views / impressions * 100', description: 'Percentage video views' },
    { slug: 'aov', type: 'derived_metric', nameNl: 'Gem. Orderwaarde', nameEn: 'Avg. Order Value', category: 'Berekend', dataType: 'CURRENCY', aggregation: 'NONE', formula: 'revenue / transactions', description: 'Average Order Value' },
    { slug: 'open_rate', type: 'derived_metric', nameNl: 'Open Rate (%)', nameEn: 'Open Rate (%)', category: 'Berekend', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'email_opens / emails_delivered * 100', description: 'Email open rate' },
    { slug: 'click_rate', type: 'derived_metric', nameNl: 'Click Rate (%)', nameEn: 'Click Rate (%)', category: 'Berekend', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'email_clicks / emails_delivered * 100', description: 'Email click rate' },
    { slug: 'organic_ctr', type: 'derived_metric', nameNl: 'Organische CTR (%)', nameEn: 'Organic CTR (%)', category: 'Berekend', dataType: 'PERCENTAGE', aggregation: 'NONE', formula: 'organic_clicks / organic_impressions * 100', description: 'Organic click-through rate' },
];

// ═══════════════════════════════════════════════════════════════════
// COLUMN ALIASES — maps ClickHouse column names to registry slugs
// when they differ (fixes Audit #2)
// ═══════════════════════════════════════════════════════════════════

export const COLUMN_ALIASES: Record<string, string> = {
    'page_views': 'screen_page_views',
    'avg_session_duration': 'average_session_duration',
    'engagement': 'engagements',
    'followers': 'follows',
};

/** Reverse lookup: registry slug → ClickHouse column name */
export const SLUG_TO_COLUMN: Record<string, string> = {};
for (const [col, slug] of Object.entries(COLUMN_ALIASES)) {
    SLUG_TO_COLUMN[slug] = col;
}

// ═══════════════════════════════════════════════════════════════════
// REGISTRY — Combined lookup and helper functions
// ═══════════════════════════════════════════════════════════════════

/** All fields combined */
const ALL_FIELDS: FieldDefinition[] = [...DIMENSIONS, ...BUILTIN_DIMS, ...BASE_METRICS, ...DERIVED_METRICS];

/** Slug → FieldDefinition lookup map */
const FIELD_MAP = new Map<string, FieldDefinition>();
for (const f of ALL_FIELDS) {
    FIELD_MAP.set(f.slug, f);
}

// ─── Public API ───

/** Get a field definition by slug */
export function getField(slug: string): FieldDefinition | undefined {
    return FIELD_MAP.get(slug);
}

/** Get field meta in the legacy FieldMeta format (backward compatible) */
export function getFieldMeta(slug: string): { name: string; category: string; dataType: string; description?: string; aggregationType?: string } | undefined {
    const f = FIELD_MAP.get(slug);
    if (!f) return undefined;
    return {
        name: f.nameNl,
        category: f.category,
        dataType: f.dataType,
        description: f.description,
        aggregationType: f.aggregation,
    };
}

/** Get all storage dimension slugs (excludes built-in) */
export function getAllDimensionSlugs(): string[] {
    return DIMENSIONS.map(d => d.slug);
}

/** Get all base metric slugs (excludes derived) */
export function getAllMetricSlugs(): string[] {
    return BASE_METRICS.map(m => m.slug);
}

/** Get all derived metric slugs */
export function getDerivedMetricSlugs(): string[] {
    return DERIVED_METRICS.map(m => m.slug);
}

/** Get all built-in dimension definitions */
export function getBuiltinDimensions(): FieldDefinition[] {
    return BUILTIN_DIMS;
}

/** Check if a slug is a built-in dimension */
export function isBuiltinDimension(slug: string): boolean {
    const f = FIELD_MAP.get(slug);
    return f?.type === 'builtin_dimension';
}

/** Check if a slug is a derived metric */
export function isDerivedMetric(slug: string): boolean {
    const f = FIELD_MAP.get(slug);
    return f?.type === 'derived_metric';
}

/** Get the aggregation type for a metric */
export function getAggregationType(slug: string): AggregationType {
    const f = FIELD_MAP.get(slug);
    return f?.aggregation || 'SUM';
}

/** Get the weight field for a weighted average metric */
export function getWeightField(slug: string): string | undefined {
    const f = FIELD_MAP.get(slug);
    return f?.weightField;
}

/** Get the set of all known dimension columns for normalization */
export function getKnownDimensionColumns(): Set<string> {
    return new Set(DIMENSIONS.map(d => d.slug));
}

/** Get the set of all known metric columns for normalization */
export function getKnownMetricColumns(): Set<string> {
    const cols = new Set(BASE_METRICS.map(m => m.slug));
    // Also add ClickHouse alias columns
    for (const col of Object.keys(COLUMN_ALIASES)) {
        cols.add(col);
    }
    return cols;
}

/**
 * Resolve a ClickHouse column name to its canonical slug.
 * Handles aliases (e.g., page_views → screen_page_views).
 */
export function resolveColumnSlug(columnName: string): string {
    return COLUMN_ALIASES[columnName] || columnName;
}

/**
 * Get the ClickHouse column name for a given slug.
 * Returns the alias column if one exists, otherwise the slug itself.
 */
export function getColumnName(slug: string): string {
    return SLUG_TO_COLUMN[slug] || slug;
}

/**
 * Page-level GA4 dimension slugs (these map to level='page' in ClickHouse)
 */
const GA4_PAGE_DIMS = new Set(['page_path', 'page_title']);

/**
 * Traffic-source GA4 dimension slugs (these map to level='traffic_source')
 */
const GA4_TRAFFIC_DIMS = new Set(['session_source', 'session_medium', 'session_campaign_name', 'landing_page']);

/**
 * Determine the most granular hierarchy level needed based on selected dimensions.
 * Used to add the correct `level` filter to ClickHouse queries.
 * 
 * Returns a single level for backward compatibility. Use determineQueryLevels()
 * when you need to support mixed ad + analytics queries.
 */
export function determineQueryLevel(selectedDimensions: string[]): string {
    const levels = determineQueryLevels(selectedDimensions);
    return levels[0];
}

/**
 * Determine ALL applicable hierarchy levels for the selected dimensions.
 * Returns an array of level strings to query (supports mixed ad + analytics).
 * 
 * For ads: keyword > ad > ad_group > campaign (picks most granular)
 * For analytics: page | traffic_source | overview (based on selected dims)
 */
export function determineQueryLevels(selectedDimensions: string[]): string[] {
    const levels: string[] = [];

    // Check for ads hierarchy dimensions
    const adsLevelPriority: HierarchyLevel[] = ['keyword', 'ad', 'ad_group', 'campaign'];
    let hasAdsDimension = false;

    for (const level of adsLevelPriority) {
        if (selectedDimensions.some(slug => {
            const f = FIELD_MAP.get(slug);
            return f?.hierarchyLevel === level;
        })) {
            levels.push(level);
            hasAdsDimension = true;
            break; // Only the most granular ads level
        }
    }

    // Check for analytics (GA4) hierarchy dimensions
    const hasPageDim = selectedDimensions.some(s => GA4_PAGE_DIMS.has(s));
    const hasTrafficDim = selectedDimensions.some(s => GA4_TRAFFIC_DIMS.has(s));
    const hasAnalyticsDim = selectedDimensions.some(slug => {
        const f = FIELD_MAP.get(slug);
        return f?.hierarchyLevel === 'analytics';
    });

    if (hasPageDim) {
        levels.push('page');
    } else if (hasTrafficDim) {
        levels.push('traffic_source');
    } else if (hasAnalyticsDim) {
        levels.push('overview');
    }

    // If no specific dimensions selected, include both campaign and overview
    // so both ads and analytics data are returned
    if (levels.length === 0) {
        // Check if only segment/none dims are selected — query all high-level aggregates
        levels.push('campaign', 'overview');
    }

    return levels;
}

/** Get all fields of a specific type */
export function getFieldsByType(type: FieldType): FieldDefinition[] {
    return ALL_FIELDS.filter(f => f.type === type);
}

/** Get all fields in a specific category */
export function getFieldsByCategory(category: string): FieldDefinition[] {
    return ALL_FIELDS.filter(f => f.category === category);
}

// ─── Legacy re-exports for backward compatibility ───
// TODO: Remove these after all consumers are migrated

export const DIMENSION_METADATA: Record<string, { name: string; category: string; dataType: string; description?: string }> = {};
for (const d of [...DIMENSIONS, ...BUILTIN_DIMS]) {
    DIMENSION_METADATA[d.slug] = { name: d.nameNl, category: d.category, dataType: d.dataType, description: d.description };
}

export const METRIC_METADATA: Record<string, { name: string; category: string; dataType: string; description?: string; aggregationType?: string }> = {};
for (const m of [...BASE_METRICS, ...DERIVED_METRICS]) {
    METRIC_METADATA[m.slug] = { name: m.nameNl, category: m.category, dataType: m.dataType, description: m.description, aggregationType: m.aggregation };
}
