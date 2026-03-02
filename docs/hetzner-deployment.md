# Hetzner Deployment Guide

> Handleiding voor het deployen van Evalco Dashboard naar een Hetzner Cloud VPS.

---

## Overzicht

Alle services draaien als Docker containers op één server:

```
┌─────────────────────────────────────────────────────┐
│                   Hetzner CX22                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Nginx   │→ │ Next.js  │  │   Sync Worker    │   │
│  │  :80/443 │  │  :3000   │  │   (BullMQ)       │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────────────┐                  │
│  │  Redis   │  │   ClickHouse     │                  │
│  │  :6379   │  │   :8123          │                  │
│  └──────────┘  └──────────────────┘                  │
│                                                      │
│  Database: Turso (extern, cloud)                     │
└─────────────────────────────────────────────────────┘
```

## Vereisten

- Hetzner Cloud account
- Domeinnaam met DNS-toegang
- SSH key pair

---

## Stap 1 — Hetzner Server Bestellen

1. Ga naar [console.hetzner.cloud](https://console.hetzner.cloud)
2. **Nieuw project** → naam: "Evalco"
3. **Server aanmaken**:
   - **Type**: CX22 (2 vCPU, 4 GB RAM, €3.99/mnd)
   - **Image**: Ubuntu 24.04
   - **Locatie**: Falkenstein (DE)
   - **SSH Key**: upload je public key (`~/.ssh/id_rsa.pub`)
   - **Netwerk**: Public IPv4 ✅
4. Noteer het **IP-adres**

## Stap 2 — DNS Instellen

Maak een A-record bij je DNS-provider:

```
Type: A
Naam: app (of dashboard)
Waarde: <SERVER IP>
TTL: 300
```

Resultaat: `dash.evalco.nl → 1.2.3.4`

## Stap 3 — Server Installeren

```bash
# Voer het setup script uit op de server
ssh root@<IP> 'bash -s' < scripts/server-setup.sh
```

Dit installeert:
- Docker + Docker Compose
- Firewall (UFW) — alleen SSH, HTTP, HTTPS open
- Fail2ban (brute-force bescherming)
- `deploy` user met Docker-toegang

## Stap 4 — Configuratie

```bash
ssh deploy@<IP>
cd dashboard
```

### 4a. Environment variables

Kopieer het `.env.production` bestand en voeg toe:

```bash
cp .env.production .env.production.local
nano .env.production.local
```

Voeg toe of pas aan:

```env
# Bestaand (Turso)
DATABASE_URL="libsql://..."
DATABASE_AUTH_TOKEN="..."

# Nieuw
REDIS_URL=redis://redis:6379
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_USER=evalco
CLICKHOUSE_PASSWORD=CHANGE_ME_TO_SECURE_PASSWORD
CLICKHOUSE_DATABASE=evalco

# Cron bescherming
CRON_SECRET=CHANGE_ME_TO_RANDOM_STRING

# Auth
NEXTAUTH_URL=https://dash.evalco.nl
NEXTAUTH_SECRET=CHANGE_ME_TO_RANDOM_STRING
```

Wijzig `.env.production` in `docker-compose.prod.yml` naar `.env.production.local`.

### 4b. Domein instellen

```bash
# Vervang YOUR_DOMAIN met je daadwerkelijke domein
sed -i 's/YOUR_DOMAIN/dash.evalco.nl/g' nginx/conf.d/default.conf
```

## Stap 5 — SSL Certificaat

```bash
bash scripts/ssl-setup.sh dash.evalco.nl
```

## Stap 6 — Eerste Deploy

```bash
bash scripts/deploy.sh
```

Controleer of alles draait:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

## Stap 7 — Cron Instellen

De scheduler moet elke 5 minuten getriggerd worden. Maak een crontab aan:

```bash
crontab -e
```

Voeg toe:

```cron
*/5 * * * * curl -s -H "x-cron-secret: JOUW_CRON_SECRET" http://localhost:3000/api/data-integration/sync/cron > /dev/null 2>&1
```

Of via de Nginx URL:

```cron
*/5 * * * * curl -s -H "x-cron-secret: JOUW_CRON_SECRET" https://dash.evalco.nl/api/data-integration/sync/cron > /dev/null 2>&1
```

---

## Auto-deploy via GitHub

Bij elke push naar `main` wordt de app automatisch gedeployed.

### GitHub Secrets instellen

Ga naar [github.com/EvalcoNL/dashboard/settings/secrets](https://github.com/EvalcoNL/dashboard/settings/secrets):

| Secret | Waarde |
|---|---|
| `SERVER_HOST` | IP-adres van je Hetzner server |
| `SERVER_SSH_KEY` | Private SSH key voor de `deploy` user |

### Genereer een deploy key

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/deploy_key -N ""
# Kopieer public key naar server
ssh-copy-id -i ~/.ssh/deploy_key.pub deploy@<IP>
# Kopieer private key naar GitHub Secrets (SERVER_SSH_KEY)
cat ~/.ssh/deploy_key
```

---

## Beheer

### Logs bekijken

```bash
# Alle services
docker compose -f docker-compose.prod.yml logs -f

# Specifieke service
docker compose -f docker-compose.prod.yml logs -f worker
docker compose -f docker-compose.prod.yml logs -f app
```

### Handmatig herstarten

```bash
docker compose -f docker-compose.prod.yml restart app worker
```

### Volledige herstart

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Data resyncen

Na eerste deploy is ClickHouse leeg. Trigger een full sync vanuit het dashboard:
1. Ga naar Sync & Planning
2. Klik op een bron → "Volledig opnieuw laden"

---

## Kosten

| Component | Maandelijks |
|---|---|
| Hetzner CX22 | €3.99 |
| Turso (bestaand) | Gratis/Pro |
| Domein | €1-2 |
| **Totaal** | **~€5-6/mnd** |
