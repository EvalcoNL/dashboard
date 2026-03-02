# Data Explorer & Organize — Plan

> **Versie:** 1.0 — 28 februari 2026
> **Status:** Voorstel
> **Scope:** Data Explorer + herbruikbaar Field Picker component voor dynamische dashboards

---

## Doel

De Data Explorer fungeert als het hart van "Data Organiseren" — de gebruiker selecteert dimensies en metrics, en de resultaten verschijnen direct als tabel, grafiek of export. Dezelfde field-picker wordt later hergebruikt om dynamische dashboards te bouwen.

**Inspiratie:** [Funnel.io](https://funnel.io) (zie screenshots)

---

## Huidige Situatie

| Onderdeel | Status | Probleem |
|---|---|---|
| Field Picker | ✅ Werkt | Georganiseerd per categorie, niet per data source |
| Field Discovery API | ✅ Werkt | Ontdekt velden uit ClickHouse, metadata via hardcoded map |
| Query Engine | ✅ Werkt | ClickHouse query builder met filters, GROUP BY, derived metrics |
| Data Table | ✅ Werkt | Sorting, column filter, totalen rij, CSV export |
| Chart View | ⚠️ Basis | Simpele SVG chart, geen tooltips |
| **Visueel Design** | ❌ | Simpel, niet Funnel-kwaliteit |
| **Source Grouping** | ❌ | Velden niet per connector gegroepeerd |
| **Two-Panel Layout** | ❌ | Geen "Selected Fields" sidebar |
| **Data Types Badges** | ❌ | Geen type labels (NUMBER, CURRENCY, %) |
| **Auto-Query** | ❌ | Handmatige "Laden" knop nodig |
| **Herbruikbaarheid** | ❌ | Alles in één 1087-regel component |

---

## Architectuur

```
┌─────────────────────────────────────────────────────────────┐
│  Shared Components (herbruikbaar voor dashboards)           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ FieldPicker  │  │ DataTable    │  │ QueryBuilder      │  │
│  │ (Funnel-stijl│  │ (sort/filter │  │ (ClickHouse SQL   │  │
│  │  two-panel)  │  │  totals row) │  │  generator)       │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────┴────┐         ┌────┴────┐          ┌────┴────┐
    │ Explorer │         │Dashboard│          │ Widget  │
    │   Page   │         │ Builder │          │ Config  │
    └─────────┘         └─────────┘          └─────────┘
```

---

## Wat Gaan We Bouwen

### 1. FieldPicker Component (nieuw, herbruikbaar)

Twee-paneel layout geïnspireerd door Funnel.io:

```
┌──────────────────────────────────┬──────────────────────┐
│ 🔍 Zoek velden...   [Dim] [Met] │  Selected Fields  🗑  │
│──────────────────────────────────│──────────────────────│
│ ▼ Google Ads              0/15  │  DIMENSIES           │
│   □ Campaign ID        STRING   │  ▸ Campaign Naam  🗑  │
│   □ Campaign Naam      STRING   │  ▸ Datum           🗑  │
│   □ Keyword            STRING   │                      │
│   ☑ Impressies         NUMBER   │  METRICS             │
│   ☑ Klikken            NUMBER   │  ▸ Impressies     🗑  │
│   □ Kosten           CURRENCY   │  ▸ Klikken         🗑  │
│ ▼ Google Analytics       0/12   │  ▸ Kosten          🗑  │
│   □ Sessies            NUMBER   │  ▸ Conversies      🗑  │
│   □ Pagina Pad         STRING   │                      │
│ ▼ Berekend               0/6    │                      │
│   □ CTR              PERCENT    │                      │
│   □ CPC              CURRENCY   │                      │
│   □ ROAS              NUMBER    │                      │
└──────────────────────────────────┴──────────────────────┘
```

**Features:**
- Velden gegroepeerd per connector (Google Ads, GA4, etc.) + "Berekend" groep
- Collapsible groepen met teller (bijv. `4 / 35`)
- Type badges: `STRING`, `NUMBER`, `CURRENCY`, `PERCENT`, `DATE`
- Zoekbalk filtert across alle groepen
- Toggle Dimensies / Metrics filter
- Rechter paneel: geselecteerde velden, drag-to-reorder, verwijder knop
- Checkbox selectie (niet eye/eye-off)

#### Bestanden

- `src/components/data/FieldPicker.tsx` [NIEUW]

---

### 2. DataExplorerClient Refactor

De huidige 1087-regel component opsplitsen:

| Oud | Nieuw |
|---|---|
| Inline field picker | → `<FieldPicker>` component |
| Inline data table | → `<DataTable>` component |
| Inline chart | → `<SimpleChart>` (bestaand, behouden) |
| Inline styles | → CSS classes in `explorer.css` |

**Auto-query:** Data laadt automatisch wanneer geselecteerde velden of datumbereik wijzigen (met 500ms debounce), geen handmatige "Laden" knop meer nodig.

**Totalen rij:** Zoals Funnel — eerste rij is "All" met blauwe highlight en totalen.

#### Bestanden

- `src/app/dashboard/projects/[id]/data/explorer/DataExplorerClient.tsx` [MODIFY]
- `src/components/data/DataTable.tsx` [NIEUW]
- `src/components/data/FieldPicker.tsx` [NIEUW]

---

### 3. Field Discovery API Uitbreiding

De huidige `/api/data-integration/explorer/fields` endpoint weet al welke velden data hebben. Uitbreiden met:

- **Groepering per connector:** teruggeven per `connectorSlug` ipv platte lijst
- **Veld-telling per groep:** `availableCount` / `totalCount`
- **Data type metadata:** al aanwezig, behouden

#### Bestanden

- `src/app/api/data-integration/explorer/fields/route.ts` [MODIFY]

---

### 4. Connector-Aware Field Metadata

De `FIELD_METADATA` map uitbreiden met connector-specifieke velden en groepering:

```typescript
interface FieldGroup {
    slug: string;          // 'google-ads', 'ga4', 'calculated'
    name: string;          // 'Google Ads', 'Google Analytics', 'Berekend'
    icon?: string;         // connector icon
    dimensions: FieldDef[];
    metrics: FieldDef[];
}
```

#### Bestanden

- `src/app/api/data-integration/explorer/fields/route.ts` [MODIFY]

---

## Implementatie Volgorde

| Stap | Wat | Geschatte omvang |
|---|---|---|
| 1 | `FieldPicker.tsx` bouwen (two-panel, groepen, badges) | ~300 regels |
| 2 | `DataTable.tsx` extraheren uit explorer | ~200 regels |
| 3 | Fields API uitbreiden (groepering per connector) | ~50 regels |
| 4 | `DataExplorerClient.tsx` refactoren (< 400 regels) | Netto -400 regels |
| 5 | Auto-query + debounce | ~20 regels |
| 6 | CSS polish + Funnel-stijl design | ~150 regels CSS |

**Totaal:** ~3 bestanden nieuw, 2 bestanden gewijzigd

---

## Design Referentie (Funnel.io)

Uit de screenshots:

1. **Linker paneel** — scrollbare lijst met checkboxes, gegroepeerd per data source
2. **Type badges** — rechts van veldnaam: `19 NUMBER`, `% PERCENT`, `AZ STRING`, `(i) MONETARY`
3. **Group headers** — connector naam + icoon + teller `0 / 589`
4. **Rechter paneel** — "Selected Fields" met Dimensions/Metrics scheiding, verwijder-knoppen
5. **Data tabel** — eerste rij "All" blauw gemarkeerd met totalen, sorteerbare kolommen
6. **Status bar** — "Resulted in 88 rows" bovenaan

---

## Verificatie Plan

### Browser Verificatie
1. Open `http://localhost:3000/dashboard/projects/{id}/data/explorer`
2. Verifieer dat de FieldPicker twee panelen toont (picker + selected)
3. Verifieer groepering per connector met collapsible headers
4. Selecteer velden → data tabel auto-laadt
5. Type badges zichtbaar bij elk veld
6. Totalen rij correct berekend
7. CSV export werkt met geselecteerde velden

### Functionele Controles
- Zoekbalk filtert velden correct across groepen
- Dimensies/Metrics toggle werkt
- Veld toevoegen/verwijderen updatet beide panelen
- Date range picker werkt
- Filter panel werkt
- Sort op kolommen werkt
