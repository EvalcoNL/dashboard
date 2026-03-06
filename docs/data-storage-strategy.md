# Data Strategie — Evalco Dashboard

> **Versie:** 6.1 — 28 februari 2026
> **Status:** Productie

---

## Samenvatting

**Twee-database strategie:**
- **SQLite (Prisma)** → Operationele data (users, clients, settings, connector-definities)
- **ClickHouse (self-hosted, Docker)** → Analytische data (metrics, dimensies, aggregaties)

**Geen data migratie** — data wordt opgehaald via connectoren (sync) en direct naar ClickHouse geschreven.

---

## Architectuur: Connect → Organize → Store

```
CONNECT                    ORGANIZE                       STORE
─────────                  ──────────                     ───────
Google Ads    ─┐           ┌─ Dimension Mapping           ClickHouse
Meta Ads      ─┤           │  (platform → canonical)      ┌──────────────┐
GA4           ─┼──→ Sync ──┤─ Metric Mapping              │ metrics_data │
LinkedIn Ads  ─┤  Engine   │  (cost_micros → cost)        │ (columnar)   │
TikTok Ads    ─┤           ├─ Currency Conversion         ├──────────────┤
Microsoft Ads ─┤           │  (USD → EUR)                 │ daily_rollup │
              ─┘           └─ Dedup + Validation          │ monthly_roll │
                              (hash, clean, type-check)    └──────────────┘
```

---

## Verantwoordelijkheden per Database

### SQLite (Prisma) — Configuratie & Metadata
Bevat 27 modellen. Alleen voor data die **gemuteerd** wordt (updates, deletes):

| Categorie | Modellen |
|---|---|
| Auth & Identiteit | User, PasswordResetToken, EmailVerificationToken |
| Klantconfiguratie | Client, ClientInvite |
| Connectoren | DataSource, ConnectorDefinition, DataSourceAccount, LinkedAccount |
| Monitoring | MonitoredPage, UptimeCheck, Incident, IncidentEvent |
| Rapporten & AI | AnalystReport, AdvisorReport, PromptLog |
| Notificaties | Notification |
| Dashboard Config | Dataset, DatasetSource, DimensionDefinition, MetricDefinition, DerivedMetricDefinition |
| Sync Tracking | SyncJob, SyncLog |
| Overig | GlobalSetting, UserRole |

### ClickHouse — Analytische Data
Alleen voor data die **append-only** is en analytisch bevraagd wordt:

| Tabel | Engine | Doel |
|---|---|---|
| `metrics_data` | ReplacingMergeTree | Alle campaign/ad/keyword metrics |
| `daily_rollup` | SummingMergeTree | Dagelijkse aggregaties (via MV) |
| `monthly_rollup` | SummingMergeTree | Maandelijkse aggregaties (via MV) |

**Waarom deze split?** ClickHouse kan geen data updaten/deleten. Alles wat een `status = RESOLVED` of `read = true` update nodig heeft, hoort in SQLite.

---

## Kernprincipes

1. **Eén Field Registry** — alle veld-metadata in `field-registry.ts`
2. **Dimensies zijn groepeerders** — niet filters, maar manieren om data te groeperen
3. **Metrics als getypte kolommen** — `UInt64` voor counts, `Decimal` voor bedragen
4. **Correcte aggregatie per type** — `SUM` voor telbare metrics, `AVG` voor scores, `WEIGHTED_AVG` voor raten
5. **Cross-platform mapping** — via `canonical_name` (cost_micros → cost)
6. **Automatische level-detectie** — query engine bepaalt het juiste data-level (ads + analytics)
7. **Deduplicatie** — DELETE-before-INSERT + `ReplacingMergeTree` als vangnet
8. **Expliciete SELECT** — alleen benodigde kolommen ophalen (geen `SELECT *`)
9. **Één normalization pipeline** — alle connectors delen dezelfde `NormalizationService`
10. **Sync is altijd 30 dagen lookback** — backfill beschikbaar voor historische data
11. **Veld-activiteitdetectie** — ClickHouse data presence check per kolom voor actief/inactief filtering

---

## Field Registry (Single Source of Truth)

`src/lib/data-integration/field-registry.ts` bevat **alle** veldmetadata:

| Veldtype | Beschrijving | Aantal |
|---|---|---|
| `dimension` | Storage dimensies in ClickHouse | ~47 |
| `builtin_dimension` | Berekend at query-time (dag v/d week, kwartaal, etc.) | 9 |
| `metric` | Base metrics opgeslagen in ClickHouse | ~55 |
| `derived_metric` | Berekend at query-time (CTR, CPC, ROAS, etc.) | 12 |

Elk veld heeft:
- `slug` — unieke identifier, matcht ClickHouse kolom
- `nameNl` / `nameEn` — display names
- `category` — UI groepering
- `dataType` — STRING, NUMBER, DATE, CURRENCY, PERCENTAGE, DURATION
- `aggregation` — SUM, AVG, WEIGHTED_AVG, NONE
- `hierarchyLevel` — campaign, ad_group, ad, keyword, segment, analytics

### Column Aliases

| ClickHouse kolom | Registry slug | Reden |
|---|---|---|
| `page_views` | `screen_page_views` | GA4 API naam |
| `avg_session_duration` | `average_session_duration` | Consistentie |
| `engagement` | `engagements` | Meervoud standaard |
| `followers` | `follows` | Actie-gebaseerde naamgeving |

### Aggregatie Types

| Type | Gedrag | Voorbeelden |
|---|---|---|
| `SUM` | Optellen | impressions, clicks, cost, conversions |
| `AVG` | Gemiddelde | quality_score, budgetten |
| `WEIGHTED_AVG` | Gewogen gemiddelde | bounce_rate (→sessions), frequency (→impressions) |
| `NONE` | Niet aggregeerbaar | CTR, CPC, ROAS (derived metrics) |

### Level-detectie (Multi-Level)

De query engine bepaalt automatisch het juiste data-level en ondersteunt **meerdere levels tegelijk** wanneer zowel ads- als analytics-dimensies geselecteerd zijn:

**Ads levels:**
- `keyword_text` → level `keyword`
- `ad_name` → level `ad`
- `ad_group_name` → level `ad_group`
- `campaign_name` → level `campaign` (default)

**Analytics levels (GA4):**
- `page_path`, `page_title` → level `page`
- `session_source`, `session_medium` → level `traffic_source`
- Overige GA4 dimensies → level `overview`

Bij gemengde selectie (bijv. `campaign_name` + `sessions`) gebruikt de query engine `level IN (campaign, overview)` om data uit beide bronnen op te halen.

---

## Architectuur: Bestanden

| Bestand | Verantwoordelijkheid |
|---|---|
| `field-registry.ts` | **Single source of truth** — alle velden, types, aggregatie, hiërarchie |
| `normalization-service.ts` | Normalize + store pipeline, importeert KNOWN_DIMS/METRICS van field-registry |
| `dataset-query-engine.ts` | Query engine met expliciete SELECT, correcte aggregatie, level-detectie |
| `connector-registry.ts` | Connector registratie en lookup |
| `sync-engine.ts` | Orchestratie van sync jobs, rate limiting, error handling |
| `base-connector.ts` | Abstract base class — auth, retry logic, rate limiting |

### Connector Bestanden

| Bestand | Slug | Status | Auth | Dimensies | Metrics |
|---|---|---|---|---|---|
| `google-ads-connector.ts` | `google-ads` | ✅ Actief | OAuth2 | 20 | 30 |
| `google-analytics-connector.ts` | `ga4` | ✅ Klaar | OAuth2 | 10 | 13 |
| `meta-ads-connector.ts` | `meta-ads` | ✅ Actief | OAuth2 | 15 | 12 |
| `linkedin-ads-connector.ts` | `linkedin-ads` | ✅ Klaar | OAuth2 | 8 | 11 |
| `tiktok-ads-connector.ts` | `tiktok-ads` | 🔧 Basis | OAuth2 | 10 | 10 |
| `microsoft-ads-connector.ts` | `microsoft-ads` | ✅ Klaar | OAuth2 | 10 | 9 |

---

## Universeel Schema

### Dimensies

| Universele Dimensie | Google Ads | Meta Ads | GA4 | LinkedIn | TikTok | Microsoft Ads |
|---|---|---|---|---|---|---|
| `date` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `campaign_id` | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `campaign_name` | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `campaign_type` | ✅ | — | — | — | — | ✅ |
| `campaign_status` | ✅ | ✅ | — | ✅ | — | ✅ |
| `campaign_objective` | — | ✅ | — | ✅ | ✅ | — |
| `campaign_budget` | ✅ | — | — | — | — | — |
| `campaign_labels` | ✅ | — | — | — | — | — |
| `bidding_strategy_type` | ✅ | — | — | — | — | ✅ |
| `ad_group_id` | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `ad_group_name` | ✅ | ✅ | — | — | ✅ | ✅ |
| `ad_group_status` | ✅ | ✅ | — | — | — | ✅ |
| `ad_id` | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `ad_name` | ✅ | ✅ | — | — | ✅ | ✅ |
| `ad_type` | ✅ | — | — | — | — | — |
| `keyword_text` | ✅ | — | — | — | — | ✅ |
| `keyword_match_type` | ✅ | — | — | — | — | ✅ |
| `device` | ✅ | ✅ | — | — | — | ✅ |
| `device_category` | — | — | ✅ | — | — | — |
| `country` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `network` | ✅ | — | — | — | — | ✅ |
| `age` | — | ✅ | — | — | ✅ | — |
| `gender` | — | ✅ | — | — | ✅ | — |
| `placement` | — | ✅ | — | — | — | — |
| `publisher_platform` | — | ✅ | — | — | — | — |
| `page_path` | — | — | ✅ | — | — | — |
| `page_title` | — | — | ✅ | — | — | — |
| `landing_page` | — | — | ✅ | — | — | — |
| `session_source` | — | — | ✅ | — | — | — |
| `session_medium` | — | — | ✅ | — | — | — |
| `session_campaign_name` | — | — | ✅ | — | — | — |
| `browser` | — | — | ✅ | — | — | — |
| `hour_of_day` | ✅ | — | — | — | — | — |

### Metrics

| Universele Metric | Type | Google Ads | Meta Ads | GA4 | LinkedIn | TikTok | Microsoft Ads |
|---|---|---|---|---|---|---|---|
| `impressions` | SUM | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `clicks` | SUM | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `cost` | SUM | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `conversions` | SUM | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `conversion_value` | SUM | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| `interactions` | SUM | ✅ | — | — | — | — | — |
| `all_conversions` | SUM | ✅ | — | — | — | — | ✅ |
| `all_conv_value` | SUM | ✅ | — | — | — | — | — |
| `view_through_conversions` | SUM | ✅ | ✅ | — | — | — | ✅ |
| `video_views` | SUM | ✅ | ✅ | — | ✅ | ✅ | — |
| `engagements` | SUM | ✅ | ✅ | — | — | — | — |
| `reach` | SUM | — | ✅ | — | — | ✅ | — |
| `frequency` | W_AVG | — | ✅ | — | — | ✅ | — |
| `unique_clicks` | SUM | — | ✅ | — | — | — | — |
| `link_clicks` | SUM | — | ✅ | — | — | — | — |
| `post_engagement` | SUM | — | ✅ | — | ✅ | — | — |
| `likes` | SUM | — | — | — | ✅ | ✅ | — |
| `comments` | SUM | — | — | — | ✅ | ✅ | — |
| `shares` | SUM | — | — | — | ✅ | ✅ | — |
| `follows` | SUM | — | — | — | ✅ | ✅ | — |
| `impression_share` | W_AVG | ✅ | — | — | — | — | ✅ |
| `quality_score` | AVG | ✅ | — | — | — | — | ✅ |
| `sessions` | SUM | — | — | ✅ | — | — | — |
| `total_users` | SUM | — | — | ✅ | — | — | — |
| `active_users` | SUM | — | — | ✅ | — | — | — |
| `new_users` | SUM | — | — | ✅ | — | — | — |
| `screen_page_views` | SUM | — | — | ✅ | — | — | — |
| `bounce_rate` | W_AVG | — | — | ✅ | — | — | — |
| `average_session_duration` | W_AVG | — | — | ✅ | — | — | — |
| `engagement_rate` | W_AVG | — | — | ✅ | — | — | — |
| `event_count` | SUM | — | — | ✅ | — | — | — |
| `transactions` | SUM | — | — | ✅ | — | — | — |
| `purchase_revenue` | SUM | — | — | ✅ | — | — | — |
| `adds_to_cart` | SUM | — | — | ✅ | — | — | — |

### Derived Metrics (berekend at query-time, niet opgeslagen)

| Metric | Formule | Beschrijving |
|---|---|---|
| `ctr` | clicks / impressions × 100 | Click-Through Rate |
| `cpc` | cost / clicks | Cost Per Click |
| `cpm` | cost / impressions × 1000 | Cost Per Mille |
| `roas` | conversion_value / cost | Return On Ad Spend |
| `conversion_rate` | conversions / clicks × 100 | Conversie percentage |
| `cost_per_conversion` | cost / conversions | Kosten per conversie |
| `aov` | revenue / transactions | Average Order Value |

---

## Data Pipeline

```
Connector.fetchData()
    │
    ▼
SyncEngine.syncDataSource()          ← orchestratie, job tracking, error handling
    │
    ▼
NormalizationService.normalizeAndStore()
    ├── validateRow()                ← drop ongeldige rijen
    ├── mapDimensions()              ← platform → canonical
    ├── mapMetrics()                 ← platform → canonical
    ├── convertCurrency()            ← USD → EUR (indien nodig)
    ├── computeHash()                ← canonical_hash voor deduplicatie
    ├── flattenToClickHouseRow()     ← known → kolom, unknown → extra_* JSON
    └── batchInsert()                ← 1000 rijen per batch naar ClickHouse
```

### Dedup Strategie

```
1. DELETE WHERE data_source_id = ? AND date BETWEEN ? AND ?
2. INSERT nieuwe genormaliseerde rijen
3. ReplacingMergeTree(updated_at) als extra vangnet
```

### Hash Strategie

```
canonical_hash = SHA256(dataSourceId : date : level : sorted_dimensions)
```

Twee rijen met dezelfde source, datum, level en dimensiewaarden krijgen dezelfde hash → `ReplacingMergeTree` houdt alleen de nieuwste.

---

## Connectors — Gedetailleerd

### Google Ads (`google-ads`)
- **Auth:** OAuth2 (Google)
- **API:** Google Ads Query Language (GAQL) via REST
- **Levels:** campaign, ad_group, ad, keyword
- **Attributievenster:** 7 dagen
- **Dimensies (20):** campaign_id/name/type/status/objective/budget/labels, bidding_strategy_type, ad_group_id/name/status/type/cpc_bid, ad_id/name/type, keyword_text/match_type, device, network, country, hour_of_day
- **Metrics (30):** impressions, clicks, cost, conversions, conversion_value, interactions, invalid_clicks, all_conversions, all_conv_value, view_through_conversions, video_views, engagements, impression_share, abs_top_impressions, phone_calls, phone_impressions, views_25/50/75/100, gmail_clicks/forwards/saves

### Google Analytics 4 (`ga4`) — ✅ PRODUCTIE
- **Auth:** OAuth2 (Google, zelfde scopes als Google Ads)
- **API:** GA4 Data API v1beta REST
- **Levels:** overview, traffic_source, page
- **Attributievenster:** 1 dag
- **Sync-strategie:** Alleen `defaultDimensions` per level (voorkomt datafragmentatie bij unieke-gebruiker metrics)
- **Dimensies (10):** date, page_path, page_title, session_source, session_medium, session_campaign_name, country, device_category, browser, landing_page
- **Metrics (13):** sessions, total_users, active_users, new_users, screen_page_views, bounce_rate, average_session_duration, engagement_rate, conversions, event_count, purchase_revenue, transactions, adds_to_cart

> **⚠️ Belangrijk:** GA4 metrics zoals `active_users` zijn unieke tellingen (niet-additief). Sync gebruikt daarom alleen `defaultDimensions` om data-fragmentatie te voorkomen. Optionele dimensies (country, device_category, browser) zijn beschikbaar voor exploratieve queries maar worden niet bij sync opgehaald.

### Meta Ads (`meta-ads`)
- **Auth:** OAuth2 (Facebook)
- **API:** Marketing API v21.0
- **Levels:** campaign, ad_set, ad
- **Dimensies (15):** Campagne structuur + age, gender, placement, publisher_platform, country
- **Metrics (12):** Core + reach, frequency, unique_clicks, link_clicks, post_engagement

### LinkedIn Ads (`linkedin-ads`)
- **Auth:** OAuth2
- **API:** LinkedIn Marketing API
- **Levels:** campaign, creative
- **Dimensies (8):** Campagne structuur + country
- **Metrics (8):** Core + video_views, post_engagement, likes, comments, shares, follows

### TikTok Ads (`tiktok-ads`)
- **Auth:** OAuth2
- **API:** TikTok Marketing API
- **Levels:** campaign, ad_group, ad
- **Dimensies (10):** Campagne structuur + gender, age, country
- **Metrics (10):** Core + video_views, reach, frequency, likes, comments, shares, follows

### Microsoft Ads (`microsoft-ads`)
- **Auth:** OAuth2
- **API:** Bing Ads API (SOAP/REST)
- **Levels:** campaign, ad_group, ad, keyword
- **Dimensies (10):** Campagne structuur + device, country, network
- **Metrics (10):** Core + all_conversions, view_through_conversions, impression_share, quality_score

---

## Connector Roadmap

### ✅ Fase 1 — Core Advertising (ACTIEF)

| # | Connector | Auth | Status |
|---|---|---|---|
| 1 | Google Ads | OAuth2 | ✅ Productie |
| 2 | Meta Ads | OAuth2 | ✅ Productie |
| 3 | Google Analytics 4 | OAuth2 | ✅ Productie |

### 🔧 Fase 2 — Extended Advertising (BASIS)

| # | Connector | Auth | Status |
|---|---|---|---|
| 4 | LinkedIn Ads | OAuth2 | ✅ Klaar voor test (credentials nodig) |
| 5 | TikTok Ads | OAuth2 | 🔧 Code aanwezig, niet getest |
| 6 | Microsoft Ads | OAuth2 | ✅ Klaar voor test (credentials nodig) |

### 📋 Fase 3+ — Toekomstig

| Categorie | Connectors |
|---|---|
| Google Platform | Google Search Console, Google Tag Manager, Google Business Profile |
| Social & Video | Instagram Insights, Meta Business Suite, YouTube Analytics |
| Extra Ads | Snapchat Ads, Pinterest Ads, Reddit Ads, X Ads |
| SEO Tools | Ahrefs, Semrush, Google Keyword Planner |
| CRM | HubSpot, Salesforce, Pipedrive |
| Email | Mailchimp, ActiveCampaign, Braze |
| Data Import | CSV/Excel, Google Sheets, BigQuery, Webhook API |
| E-commerce & CMS | Shopware |

---

## Connector Bouw-Template

Elke nieuwe connector volgt exact hetzelfde patroon:

```
src/lib/data-integration/connectors/{slug}-connector.ts
```

1. **Extend `BaseConnector`** — auth, rate limiting, retry logic gratis
2. **Registreer in `connectors/index.ts`** — `registerAllConnectors()`
3. **Definieer levels, dimensions, metrics** — `getSupportedLevels()`, `getDimensionMappings()`, `getMetricMappings()`
4. **Implementeer `fetchData()`** — platform API call
5. **Implementeer `authenticate()`** — OAuth2 of API key
6. **Voeg velden toe aan `field-registry.ts`** — unieke dimensies/metrics met NL/EN namen
7. Data gaat automatisch door normalization pipeline → ClickHouse

## Connector Controle-Checklist ✅

> **Gebruik deze checklist bij elke nieuwe connector of wijziging aan een bestaande connector.**
> Gebaseerd op bugs gevonden tijdens Microsoft Ads, LinkedIn Ads en Meta Ads integratie (maart 2026).

### 1. Connector Code

- [ ] `extractMetrics()` retourneert **platform** veldnamen (bijv. `Spend`, `costInLocalCurrency`), NIET canonical namen (`cost`)
- [ ] `extractDimensions()` retourneert **platform** veldnamen (bijv. `TimePeriod`, `date_start`), NIET canonical namen (`date`)
- [ ] `getMetricMappings()` mapt elk platform veld naar een canonical veld
- [ ] `getDimensionMappings()` mapt elk platform veld naar een canonical veld
- [ ] Alle canonical velden bestaan in `field-registry.ts` (DIMENSIONS + BASE_METRICS)
- [ ] Alle canonical velden bestaan als kolommen in ClickHouse `metrics_data`
- [ ] `parseCredentials<T>()` leest JSON token correct (met refreshToken indien nodig)
- [ ] `getAvailableAccounts()` retourneert `{ externalId, name, currency }[]`

### 2. OAuth Flow

- [ ] **Link route** (`/api/auth/{connector}/link/route.ts`): juiste scopes, redirect URI, state = clientId
- [ ] **Callback route** (`/api/auth/{connector}/callback/route.ts`):
  - [ ] Zoekt of maakt `ConnectorDefinition` (via `prisma.connectorDefinition.findUnique({ slug })`)
  - [ ] Slaat token op als **JSON** (`{ accessToken, refreshToken }`)
  - [ ] Versleutelt token met `encrypt()`
  - [ ] Zet `connectorId` op de `DataSource`
  - [ ] Ontdekt accounts via de platform API
  - [ ] Maakt `DataSourceAccount` records aan per account
  - [ ] Triggert auto-sync via `syncScheduler.scheduleNow()`

### 3. Sync Engine

- [ ] Connector type staat in `tokenTypes` array in `sync-access/route.ts`
- [ ] Date-extractie in `sync-engine.ts` ondersteunt het platform-specifieke datumveld
  - Google Ads: `date` / `Date`
  - Meta: `date_start`  
  - Microsoft: `TimePeriod`
  - LinkedIn: `dateRange.start`
- [ ] Level-gebaseerde stale detectie in `normalization-service.ts` (niet cross-level deleten)

### 4. UI Integratie

- [ ] Reconnect route in `DataSourceActions.tsx` → `linkRoutes` map
- [ ] Connector naam in `field-registry.ts` → `connector_name` builtin dimension
- [ ] Koppel-knop op de bronnen-pagina (niet "coming soon")
- [ ] Toegangen-pagina werkt (data sources met `linkedAccounts`)

### 5. Environment

- [ ] `.env` variabelen toegevoegd (CLIENT_ID, CLIENT_SECRET, eventueel DEVELOPER_TOKEN)
- [ ] `.env.example` bijgewerkt (indien aanwezig)
- [ ] Productie-server: redirect URI geconfigureerd in het platform developer portal

### 6. Testen

- [ ] OAuth koppeling werkt → DataSource + DataSourceAccount aangemaakt
- [ ] Sync levert rijen op in ClickHouse
- [ ] Alle levels bevatten data (campaign, ad_group, ad)
- [ ] `extra_dimensions == '{}'` → geen unmapped dimensies
- [ ] `extra_metrics == '{}'` → geen unmapped metrics
- [ ] Dimensies gevuld (campaign_name, ad_group_name, etc.)
- [ ] Cost/impressions/clicks correct (niet 0, niet micro-units)
- [ ] Data zichtbaar in Data Explorer
- [ ] Metrics/Dimensies API toont waarden voor deze connector

---

## ClickHouse Schema Referentie

```sql
metrics_data (ReplacingMergeTree(updated_at))
├── canonical_hash          String              -- dedup key
├── data_source_id          String
├── account_id              Nullable(String)
├── client_id               String              -- FK naar SQLite
├── connector_slug          LowCardinality(String)
├── date                    Date
├── level                   LowCardinality(String)
│
├── ── Dimensies ──
├── campaign_id/name/type/status/objective/budget/labels
├── bidding_strategy_type, campaign_start_date, campaign_end_date
├── ad_group_id/name/status/type/cpc_bid
├── ad_id/name/type
├── keyword_text/match_type
├── device, device_category, country, network
├── age, gender, placement, publisher_platform, slot
├── source, medium, page_path, page_title, landing_page
├── session_source, session_medium, session_campaign_name, browser
├── hour_of_day, conversion_action_name, conversion_action_category
├── extra_dimensions        String (JSON)       -- overflow
│
├── ── Metrics ──
├── impressions             UInt64
├── clicks                  UInt64
├── cost                    Decimal(18,2)
├── conversions             Decimal(18,4)
├── conversion_value        Decimal(18,2)
├── interactions, invalid_clicks
├── reach, frequency, unique_clicks, link_clicks
├── video_views, engagements, post_engagement
├── likes, comments, shares, follows
├── all_conversions, all_conv_value, view_through_conversions
├── impression_share, quality_score, engagement_rate
├── sessions, total_users, active_users, new_users
├── screen_page_views (alias: page_views)
├── bounce_rate, average_session_duration (alias: avg_session_duration)
├── event_count, transactions, purchase_revenue, adds_to_cart
├── phone_calls, phone_impressions, abs_top_impressions
├── views_25, views_50, views_75, views_100
├── gmail_clicks, gmail_forwards, gmail_saves
└── extra_metrics           String (JSON)       -- overflow
```

**Partitioning:** `toYYYYMM(date)` — per maand
**Order key:** `(client_id, connector_slug, date, level, canonical_hash)`
