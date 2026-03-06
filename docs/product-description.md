# Evalco Dashboard — Productomschrijving

> De leidraad voor de verkoop-/productwebsite van Evalco.

---

## Wat is Evalco?

Evalco is een **alles-in-één marketing intelligence platform** voor bureaus en in-house marketingteams. Het centraliseert data uit alle marketingkanalen, bewaakt campagneprestaties en uptime, en geeft diepgaande inzichten — zodat marketeers sneller betere beslissingen nemen.

---

## Kernfuncties

### 1. Universele Data-integratie

Verbind **alle marketingkanalen** in één dashboard — zonder handmatig exporteren of kopiëren.

**Ondersteunde platformen:**

| Categorie | Platformen |
|---|---|
| Paid Search | Google Ads, Microsoft Ads |
| Paid Social | Meta (Facebook/Instagram), LinkedIn, Pinterest |
| Analytics | Google Analytics 4 |
| Video | YouTube |
| SEO & Web | Google Tag Manager, Google Business Profile |
| E-commerce | Google Merchant Center |
| Communicatie | Slack (notificaties) |

**Technische highlights:**
- OAuth2-koppelingen met automatische token-refresh
- Geautomatiseerd data-sync schema (configureerbaar per bron)
- Genormaliseerde dataopslag in ClickHouse voor snelle queries
- Multi-account ondersteuning (meerdere ad-accounts per klant)
- Valuta- en tijdzone-ondersteuning per bron

---

### 2. Projectmatig Werken

Organiseer klanten als **projecten**, elk met hun eigen databronnen, rapporten en team.

- Onbeperkt aantal projecten per organisatie
- Gebruikersbeheer per project (wie mag wat zien)
- Projectspecifieke instellingen (valuta, doelwaarden, toleranties)
- Onboarding flow voor nieuwe projecten

---

### 3. Monitoring & Uptime

Bewaak **websites en campagnes** 24/7 met proactieve alerting.

- **Uptime monitoring** — automatische checks op website-beschikbaarheid en snelheid
- **Pagina-monitoring** — specifieke pagina's volgen op bereikbaarheid en statuswijzigingen
- **Incident management** — automatische detectie, tracking en resolutie van problemen
- **Tracking verificatie** — controleer of je tracking codes correct geladen worden
- **Notificaties** — directe meldingen via e-mail en Slack bij incidenten

---

### 4. AI-gestuurde Rapportages

Automatische analyse en advies op basis van je marketingdata.

- **Analyst Reports** — AI-gegenereerde prestatieanalyses per project
  - Health scores en trendanalyse
  - Afwijkingsdetectie ten opzichte van targets
  - Automatische evaluatie per periode
- **Advisor Reports** — strategisch advies en actiepunten
  - Review-workflow voor teamleden
  - Status tracking (draft → reviewed → executed)
- **Prompt logging** — volledige transparantie over AI-gebruik en kosten

---

### 5. Toegangsbeheer

Beheer platformtoegang op schaal — toekennen, intrekken en synchroniseren.

- **Cross-platform toegangsbeheer** — beheer gebruikersrechten voor Google Ads, GA4, GTM, Business Profile en Merchant Center vanuit één plek
- **Gebruikersrollen** — definieer aangepaste rollen met automatische platform-mapping
- **Sync met platformdata** — synchroniseer bestaande gebruikers en uitnodigingen
- **Bulk-acties** — gebruikers uitnodigen voor meerdere platformen tegelijk

---

### 6. Data Explorer & Custom Dashboards

**Verken en visualiseer** je data zonder technische kennis.

- **Data Explorer** — ad-hoc queries op genormaliseerde data met dimensie- en metriekfilters
- **Custom Dashboards** — bouw eigen dashboards met drag-and-drop widgets
  - KPI-kaarten, lijngrafieken, staafdiagrammen, cirkeldiagrammen, tabellen
  - Configureerbare filters en vergelijkmodi
- **Datasets** — logische groeperingen van databronnen voor gestructureerde rapportage
- **Dimensies & Metrics** — browse beschikbare dimensies en metrics per connector

---

### 7. Merchant Center Health

Specifiek voor e-commerce: monitor de gezondheid van je **Google Merchant Center**.

- Dagelijkse tracking van totale en afgekeurde producten
- Percentage afgekeurde items over tijd
- Top afkeuringsredenen
- Account-level issues

---

## Technische Architectuur

| Component | Technologie |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Vanilla CSS (custom design system) |
| Backend API | Next.js API Routes |
| Database | SQLite (Prisma ORM) + ClickHouse (metrics) |
| Authenticatie | NextAuth.js met 2FA (TOTP) |
| Data sync | BullMQ worker met cron scheduling |
| E-mail | Resend |
| AI/LLM | Google Gemini |
| Hosting | Hetzner (Docker) |
| Grafieken | Recharts |

---

## Beveiliging

- **Twee-factor authenticatie** (TOTP + backup codes)
- **Rolgebaseerde autorisatie** (Admin, Strategist)
- **IDOR-bescherming** — alle routes valideren klant-/projecttoegang
- **Rate limiting** op API endpoints
- **Security headers** (HSTS, CSP, etc.)
- **Audit logging** — alle kritieke acties worden gelogd
- **Beveiligde cron endpoints** met API-key authenticatie

---

## Doelgroep

1. **Online marketing bureaus** — beheer meerdere klanten vanuit één platform
2. **In-house marketing teams** — centraliseer data en monitoring voor je organisatie
3. **E-commerce bedrijven** — combineer advertising data met Merchant Center health

---

## Unique Selling Points

1. **Eén platform, alle kanalen** — geen losse tools meer per platform
2. **AI-first** — automatische analyses en strategisch advies
3. **Proactieve monitoring** — weet het eerder dan je klant als er iets misgaat
4. **Toegangsbeheer op schaal** — platformrechten beheren was nog nooit zo makkelijk
5. **Data-eigenaarschap** — alle data in je eigen omgeving, niet bij een derde partij
6. **Nederlands gebouwd** — interface en support volledig in het Nederlands

---

## Prijsmodel (suggestie voor website)

> Te bepalen — opties:
> - Per project/klant (staffel)
> - Per databron
> - Flat fee + fair use
> - Freemium met premium features

---

*Dit document dient als basis voor de Evalco verkoopwebsite. Alle features hierboven zijn live in het platform.*
