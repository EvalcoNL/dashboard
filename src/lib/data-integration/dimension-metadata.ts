// ═══════════════════════════════════════════════════════════════════
// Centralized Dimension & Metric Metadata
// Single source of truth for field display names, categories, types
// ═══════════════════════════════════════════════════════════════════

export interface FieldMeta {
    name: string;
    category: string;
    dataType: string;
    description?: string;
    aggregationType?: string; // SUM, AVG, MIN, MAX, COUNT — used for metrics
}

/**
 * Centralized metadata for all known canonical dimensions.
 * Used by: Dimensions API, Explorer Fields API, Dataset Query Engine
 */
export const DIMENSION_METADATA: Record<string, FieldMeta> = {
    // --- Tijd ---
    date: { name: 'Datum', category: 'Tijd', dataType: 'DATE', description: 'De datum waarop de prestaties zijn gemeten' },
    hour: { name: 'Uur', category: 'Tijd', dataType: 'STRING', description: 'Het uur van de dag waarop de data is verzameld' },
    hour_of_day: { name: 'Uur van de dag', category: 'Tijd', dataType: 'NUMBER', description: 'Het uur van de dag waarop de advertentie is vertoond (0-23)' },

    // --- Campagne Structuur ---
    campaign_id: { name: 'Campaign ID', category: 'Campaign', dataType: 'STRING', description: 'Unieke identificatie van de campagne in het advertentieplatform' },
    campaign_name: { name: 'Campaign Naam', category: 'Campaign', dataType: 'STRING', description: 'De naam van de campagne zoals ingesteld in het advertentieplatform' },
    campaign_type: { name: 'Campaign Type', category: 'Campaign', dataType: 'STRING', description: 'Het type campagne (bijv. Search, Display, Shopping, Video)' },
    campaign_status: { name: 'Campaign Status', category: 'Campaign', dataType: 'STRING', description: 'De huidige status van de campagne (bijv. Actief, Gepauzeerd, Verwijderd)' },
    bidding_strategy_type: { name: 'Biedstrategie Type', category: 'Campaign', dataType: 'STRING', description: 'Het type biedstrategie (bijv. Maximize Clicks, Target CPA, Target ROAS)' },
    campaign_budget: { name: 'Campaign Budget', category: 'Campaign', dataType: 'NUMBER', description: 'Het dagelijks budget voor de campagne in de lokale valuta' },
    campaign_labels: { name: 'Campaign Labels', category: 'Campaign', dataType: 'STRING', description: 'Labels toegewezen aan de campagne voor organisatie en filtering' },
    campaign_start_date: { name: 'Startdatum (Campaign)', category: 'Campaign', dataType: 'DATE', description: 'De geplande startdatum van de campagne' },
    campaign_end_date: { name: 'Einddatum (Campaign)', category: 'Campaign', dataType: 'DATE', description: 'De geplande einddatum van de campagne' },
    campaign_objective: { name: 'Campagne Doelstelling', category: 'Campaign', dataType: 'STRING', description: 'Het doel van de campagne (bijv. Conversies, Verkeer, Merkbekendheid)' },
    status: { name: 'Campaign Status', category: 'Campaign', dataType: 'STRING', description: 'De operationele status van de campagne' },
    serving_status: { name: 'Serving Status', category: 'Campaign', dataType: 'STRING', description: 'Of de campagne momenteel advertenties vertoont' },

    // --- Ad Group ---
    ad_group_id: { name: 'Ad Group ID', category: 'Ad Group', dataType: 'STRING', description: 'Unieke identificatie van de ad group binnen een campagne' },
    ad_group_name: { name: 'Ad Group Naam', category: 'Ad Group', dataType: 'STRING', description: 'De naam van de ad group zoals ingesteld in het platform' },
    ad_group_status: { name: 'Ad Group Status', category: 'Ad Group', dataType: 'STRING', description: 'De huidige status van de ad group (bijv. Actief, Gepauzeerd)' },
    ad_group_type: { name: 'Ad Group Type', category: 'Ad Group', dataType: 'STRING', description: 'Het type ad group (bijv. Standard, Dynamic)' },
    ad_group_cpc_bid: { name: 'Ad Group CPC Bod', category: 'Ad Group', dataType: 'NUMBER', description: 'Het standaard kosten-per-klik bod ingesteld op ad group niveau' },

    // --- Ad ---
    ad_id: { name: 'Ad ID', category: 'Ad', dataType: 'STRING', description: 'Unieke identificatie van de individuele advertentie' },
    ad_name: { name: 'Ad Naam', category: 'Ad', dataType: 'STRING', description: 'De naam of kop van de advertentie' },
    ad_type: { name: 'Ad Type', category: 'Ad', dataType: 'STRING', description: 'Het formaat van de advertentie (bijv. Responsive Search Ad, Expanded Text Ad)' },

    // --- Keyword ---
    keyword_text: { name: 'Keyword', category: 'Keyword', dataType: 'STRING', description: 'Het zoekwoord waarop wordt geboden in zoekcampagnes' },
    keyword_match_type: { name: 'Match Type', category: 'Keyword', dataType: 'STRING', description: 'Het matchtype van het keyword (Breed, Woordgroep, Exact)' },

    // --- Targeting / Demografie ---
    device: { name: 'Apparaat', category: 'Segment', dataType: 'STRING', description: 'Het type apparaat van de gebruiker (Desktop, Mobiel, Tablet)' },
    device_category: { name: 'Apparaat Categorie', category: 'Segment', dataType: 'STRING', description: 'Categorisering van het apparaat' },
    browser: { name: 'Browser', category: 'Segment', dataType: 'STRING', description: 'De browser van de gebruiker (Chrome, Safari, Firefox, etc.)' },
    country: { name: 'Land', category: 'Segment', dataType: 'STRING', description: 'Het land van waaruit de gebruiker de advertentie heeft gezien' },
    region: { name: 'Regio', category: 'Segment', dataType: 'STRING', description: 'De regio of provincie van de gebruiker' },
    city: { name: 'Stad', category: 'Segment', dataType: 'STRING', description: 'De stad van de gebruiker' },
    age: { name: 'Leeftijd', category: 'Segment', dataType: 'STRING', description: 'De leeftijdsgroep van de gebruiker (bijv. 18-24, 25-34)' },
    gender: { name: 'Geslacht', category: 'Segment', dataType: 'STRING', description: 'Het geslacht van de gebruiker (Man, Vrouw, Onbekend)' },

    // --- Kanaal / Netwerk ---
    network: { name: 'Netwerk', category: 'Segment', dataType: 'STRING', description: 'Het advertentienetwerk (bijv. Google Search, Google Search Partners, Display)' },
    channel: { name: 'Kanaal', category: 'Segment', dataType: 'STRING', description: 'Het marketingkanaal (bijv. Paid Search, Organic, Social)' },
    placement: { name: 'Plaatsing', category: 'Segment', dataType: 'STRING', description: 'De specifieke website of app waar de advertentie wordt getoond' },
    slot: { name: 'Positie', category: 'Segment', dataType: 'STRING', description: 'De positie van de advertentie op de pagina (boven of onder zoekresultaten)' },
    publisher_platform: { name: 'Publicatieplatform', category: 'Segment', dataType: 'STRING', description: 'Het platform waarop de advertentie is gepubliceerd' },

    // --- Conversie ---
    conversion_action_name: { name: 'Conversie Naam', category: 'Conversie', dataType: 'STRING', description: 'De naam van de conversieactie zoals gedefinieerd in het platform' },
    conversion_action_category: { name: 'Conversie Categorie', category: 'Conversie', dataType: 'STRING', description: 'De categorie van de conversie (bijv. Aankoop, Lead, Aanmelding)' },

    // --- Website / Analytics (GA4) ---
    page_path: { name: 'Pagina Pad', category: 'Website / Analytics', dataType: 'STRING', description: 'URL-pad van de pagina (bijv. /producten/isolatie)' },
    page_title: { name: 'Pagina Titel', category: 'Website / Analytics', dataType: 'STRING', description: 'De titel van de bezochte pagina zoals weergegeven in de browser' },
    landing_page: { name: 'Landingspagina', category: 'Website / Analytics', dataType: 'STRING', description: 'De eerste pagina die een bezoeker ziet bij het starten van een sessie' },
    session_source: { name: 'Sessie Bron', category: 'Website / Analytics', dataType: 'STRING', description: 'De verkeersbron van de sessie (bijv. google, direct, facebook)' },
    session_medium: { name: 'Sessie Medium', category: 'Website / Analytics', dataType: 'STRING', description: 'Het medium van de sessie (bijv. organic, cpc, referral)' },
    session_campaign_name: { name: 'Sessie Campagne', category: 'Website / Analytics', dataType: 'STRING', description: 'De campagnenaam gekoppeld aan de sessie via UTM-parameters' },
};

/**
 * Centralized metadata for all known canonical metrics.
 * Used by: Metrics API, Explorer Fields API, Dataset Query Engine
 */
export const METRIC_METADATA: Record<string, FieldMeta> = {
    // ─── Prestatie ───
    impressions: { name: 'Impressies', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal keren dat de advertentie is vertoond' },
    clicks: { name: 'Klikken', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal klikken op de advertentie' },
    reach: { name: 'Bereik', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal unieke gebruikers dat de advertentie heeft gezien' },
    frequency: { name: 'Frequentie', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'AVG', description: 'Gemiddeld aantal keer dat een gebruiker de advertentie heeft gezien' },
    unique_clicks: { name: 'Unieke Klikken', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal unieke gebruikers dat heeft geklikt' },
    link_clicks: { name: 'Link Klikken', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal klikken op links in de advertentie' },
    interactions: { name: 'Interacties', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Klikken, views en andere interacties met advertenties' },
    invalid_clicks: { name: 'Ongeldige Klikken', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Klikken die Google als ongeldig beschouwt' },
    search_impressions: { name: 'Zoek Impressies', category: 'Prestatie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Impressies op zoekresultatenpagina\'s' },

    // ─── Kosten ───
    cost: { name: 'Kosten', category: 'Kosten', dataType: 'CURRENCY', aggregationType: 'SUM', description: 'Totale kosten voor de advertentie' },

    // ─── Conversie ───
    conversions: { name: 'Conversies', category: 'Conversie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal conversies gegenereerd door de advertentie' },
    conversion_value: { name: 'Conversiewaarde', category: 'Conversie', dataType: 'CURRENCY', aggregationType: 'SUM', description: 'Totale waarde van de conversies' },
    all_conversions: { name: 'Alle Conversies', category: 'Conversie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Alle conversies inclusief cross-device en view-through' },
    all_conv_value: { name: 'Alle Conv. Waarde', category: 'Conversie', dataType: 'CURRENCY', aggregationType: 'SUM', description: 'Totale waarde van alle conversies incl. view-through' },
    view_through_conversions: { name: 'View-Through Conversies', category: 'Conversie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Conversies na het zien van een advertentie zonder te klikken' },
    conv_platform_comparable: { name: 'Conv. (Platform Vergelijkbaar)', category: 'Conversie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Platform-vergelijkbare conversies voor cross-platform vergelijking' },
    phone_calls: { name: 'Telefoonoproepen', category: 'Conversie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal offline telefoonoproepen via advertenties' },
    phone_impressions: { name: 'Telefoon Impressies', category: 'Conversie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal telefoon-impressies in advertenties' },

    // ─── Video ───
    video_views: { name: 'Video Views', category: 'Video', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal video weergaven' },
    video_impressions: { name: 'Video Impressies', category: 'Video', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Impressies op video-advertenties' },
    views_25: { name: 'Views (25%)', category: 'Video', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal keer dat de video tot 25% is afgespeeld' },
    views_50: { name: 'Views (50%)', category: 'Video', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal keer dat de video tot 50% is afgespeeld' },
    views_75: { name: 'Views (75%)', category: 'Video', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal keer dat de video tot 75% is afgespeeld' },
    views_100: { name: 'Views (100%)', category: 'Video', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal keer dat de video volledig is afgespeeld' },

    // ─── Engagement ───
    post_engagement: { name: 'Post Engagement', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Totale betrokkenheid bij een post' },
    engagements: { name: 'Engagements', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Totaal aantal betrokkenheidsacties' },
    likes: { name: 'Likes', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal likes op de advertentie' },
    comments: { name: 'Reacties', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal reacties op de advertentie' },
    shares: { name: 'Shares', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal keer dat de advertentie is gedeeld' },
    follows: { name: 'Follows', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal nieuwe volgers via de advertentie' },
    gmail_clicks: { name: 'Gmail Klikken', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Klikken op de landingspagina vanuit Gmail-advertenties' },
    gmail_forwards: { name: 'Gmail Doorsturen', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal keer dat een Gmail-advertentie is doorgestuurd' },
    gmail_saves: { name: 'Gmail Opgeslagen', category: 'Engagement', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal keer dat een Gmail-advertentie is opgeslagen' },

    // ─── Concurrentie ───
    impression_share: { name: 'Impressie Aandeel', category: 'Concurrentie', dataType: 'PERCENTAGE', aggregationType: 'AVG', description: 'Percentage van impressies t.o.v. geschatte totaal beschikbare impressies' },
    quality_score: { name: 'Kwaliteitsscore', category: 'Concurrentie', dataType: 'NUMBER', aggregationType: 'AVG', description: 'Google Ads kwaliteitsscore van het keyword (1-10)' },
    engagement_rate: { name: 'Betrokkenheidspercentage', category: 'Concurrentie', dataType: 'PERCENTAGE', aggregationType: 'AVG', description: 'Percentage engagement ten opzichte van het totaal' },
    total_top_impressions: { name: 'Totaal Top Impressies', category: 'Concurrentie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Impressies boven de organische zoekresultaten' },
    abs_top_impressions: { name: 'Absolute Top Impressies', category: 'Concurrentie', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Impressies op de absolute toppositie boven zoekresultaten' },

    // ─── Bieden ───
    campaign_daily_budget: { name: 'Dagbudget (Campaign)', category: 'Bieden', dataType: 'CURRENCY', aggregationType: 'AVG', description: 'Het dagelijks budget van de campagne' },
    campaign_total_budget: { name: 'Totaalbudget (Campaign)', category: 'Bieden', dataType: 'CURRENCY', aggregationType: 'AVG', description: 'Het totaal budget van de campagne' },
    target_cpa_campaign: { name: 'Doel CPA (Campaign)', category: 'Bieden', dataType: 'CURRENCY', aggregationType: 'AVG', description: 'Doel CPA ingesteld op campagneniveau' },
    target_cpa_adgroup: { name: 'Doel CPA (Ad Group)', category: 'Bieden', dataType: 'CURRENCY', aggregationType: 'AVG', description: 'Doel CPA ingesteld op ad group niveau' },
    target_roas: { name: 'Doel ROAS', category: 'Bieden', dataType: 'PERCENTAGE', aggregationType: 'AVG', description: 'Doel ROAS-percentage voor de biedstrategie' },

    // ─── E-commerce ───
    purchase_revenue: { name: 'Aankoopomzet', category: 'E-commerce', dataType: 'CURRENCY', aggregationType: 'SUM', description: 'Totale omzet uit aankopen' },
    revenue: { name: 'Omzet', category: 'E-commerce', dataType: 'CURRENCY', aggregationType: 'SUM', description: 'Totale omzet uit advertentie-attributie' },
    gross_profit: { name: 'Bruto Winst', category: 'E-commerce', dataType: 'CURRENCY', aggregationType: 'SUM', description: 'Omzet minus kosten van verkochte goederen (COGS)' },
    transactions: { name: 'Transacties', category: 'E-commerce', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal e-commerce transacties' },
    adds_to_cart: { name: 'Toevoegingen aan Winkelwagen', category: 'E-commerce', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal toevoegingen aan winkelwagen' },
    new_customer_ltv: { name: 'Nieuwe Klant LTV', category: 'E-commerce', dataType: 'CURRENCY', aggregationType: 'SUM', description: 'Lifetime value van nieuwe klanten via advertenties' },

    // ─── Website / Analytics (GA4) ───
    sessions: { name: 'Sessies', category: 'Website / Analytics', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal website sessies' },
    total_users: { name: 'Totaal Gebruikers', category: 'Website / Analytics', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Totaal aantal unieke gebruikers' },
    active_users: { name: 'Actieve Gebruikers', category: 'Website / Analytics', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal actieve gebruikers in de periode' },
    new_users: { name: 'Nieuwe Gebruikers', category: 'Website / Analytics', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal nieuwe gebruikers' },
    screen_page_views: { name: 'Paginaweergaven', category: 'Website / Analytics', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Aantal paginaweergaven' },
    bounce_rate: { name: 'Bouncepercentage', category: 'Website / Analytics', dataType: 'PERCENTAGE', aggregationType: 'AVG', description: 'Percentage sessies met slechts één paginaweergave' },
    average_session_duration: { name: 'Gem. Sessieduur', category: 'Website / Analytics', dataType: 'DURATION', aggregationType: 'AVG', description: 'Gemiddelde duur van een sessie' },
    event_count: { name: 'Aantal Events', category: 'Website / Analytics', dataType: 'NUMBER', aggregationType: 'SUM', description: 'Totaal aantal events' },

    // ─── Berekend (formule-metrics) ───
    ctr: { name: 'CTR (%)', category: 'Berekend', dataType: 'PERCENTAGE', description: 'klikken / impressies × 100' },
    cpc: { name: 'CPC', category: 'Berekend', dataType: 'CURRENCY', description: 'kosten / klikken' },
    cpm: { name: 'CPM', category: 'Berekend', dataType: 'CURRENCY', description: 'kosten / impressies × 1000' },
    roas: { name: 'ROAS', category: 'Berekend', dataType: 'NUMBER', description: 'conversiewaarde / kosten' },
    conversion_rate: { name: 'Conversiepercentage (%)', category: 'Berekend', dataType: 'PERCENTAGE', description: 'conversies / klikken × 100' },
    cost_per_conversion: { name: 'Kosten per Conversie', category: 'Berekend', dataType: 'CURRENCY', description: 'kosten / conversies' },
    conv_value_per_cost: { name: 'Conv. Waarde / Kosten', category: 'Berekend', dataType: 'NUMBER', description: 'conversiewaarde gedeeld door kosten' },
};

/**
 * Combined lookup for any field (dimension or metric)
 */
export function getFieldMeta(slug: string): FieldMeta | undefined {
    return DIMENSION_METADATA[slug] || METRIC_METADATA[slug];
}

/**
 * Get all known dimension slugs
 */
export function getAllDimensionSlugs(): string[] {
    return Object.keys(DIMENSION_METADATA);
}

/**
 * Get all known metric slugs (base metrics only, excludes calculated/derived)
 */
export function getAllMetricSlugs(): string[] {
    return Object.keys(METRIC_METADATA).filter(slug => {
        const meta = METRIC_METADATA[slug];
        return meta.category !== 'Berekend'; // Exclude derived/calculated metrics
    });
}

/**
 * Get all derived/calculated metric slugs
 */
export function getDerivedMetricSlugs(): string[] {
    return Object.keys(METRIC_METADATA).filter(slug => {
        const meta = METRIC_METADATA[slug];
        return meta.category === 'Berekend';
    });
}
