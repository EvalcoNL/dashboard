# Server Gegevens — Hetzner CPX42

> ⚠️ **VERTROUWELIJK** — Bewaar dit bestand veilig en commit het NIET naar een publieke repository.

## Server

| | |
|---|---|
| **Provider** | Hetzner Cloud |
| **Type** | CPX42 (8 vCPU, 16 GB RAM, 160 GB NVMe) |
| **OS** | Ubuntu 24.04 LTS |
| **IPv4** | `178.104.15.143` |
| **IPv6** | `2a01:4f8:1c19:314e::/64` |
| **Locatie** | Nuremberg (nbg1) |
| **Domein** | `dash.evalco.nl` |

## SSH Toegang

| | |
|---|---|
| **Root user** | `root` |
| **Root wachtwoord** | `Ev4lc0-H3tzn3r-2026!` |
| **Deploy user** | `deploy` |
| **SSH key** | `~/.ssh/id_ed25519` (erwin@evalco.nl) |
| **App directory** | `/home/deploy/dashboard` |

```bash
# Inloggen als deploy user
ssh deploy@178.104.15.143

# Inloggen als root
ssh root@178.104.15.143
```

## Docker Services

| Container | Image | Poort |
|---|---|---|
| `evalco-app` | dashboard-app | 3000 |
| `evalco-worker` | dashboard-worker | — |
| `evalco-redis` | redis:7-alpine | 6379 |
| `evalco-clickhouse` | clickhouse-server:latest | 8123 |
| `evalco-nginx` | nginx:alpine | 80, 443 |
| `evalco-certbot` | certbot/certbot | — |

## Database Credentials

### ClickHouse (lokaal op server)
| | |
|---|---|
| **URL** | `http://clickhouse:8123` (intern) |
| **User** | `evalco` |
| **Password** | `Ev4lc0-CH-Pr0d-2026!` |
| **Database** | `evalco` |

### Redis (lokaal op server)
| | |
|---|---|
| **URL** | `redis://redis:6379` (intern) |

### Turso (extern, cloud)
| | |
|---|---|
| **URL** | `libsql://database-amethyst-flower-vercel-icfg-qrygmr26pktkzve1jqwvmx1s.aws-eu-west-1.turso.io` |

## Cron

```
*/5 * * * * curl -s -H "x-cron-secret: evalco-cron-hetzner-2026-secret" http://localhost:3000/api/data-integration/sync/cron
```

## Veelgebruikte Commando's

```bash
# Status controllieren
cd /home/deploy/dashboard
CLICKHOUSE_PASSWORD="Ev4lc0-CH-Pr0d-2026!" docker compose -f docker-compose.prod.yml ps

# Logs bekijken
CLICKHOUSE_PASSWORD="Ev4lc0-CH-Pr0d-2026!" docker compose -f docker-compose.prod.yml logs -f app worker

# Herstarten
CLICKHOUSE_PASSWORD="Ev4lc0-CH-Pr0d-2026!" docker compose -f docker-compose.prod.yml restart app worker

# Volledige herstart
CLICKHOUSE_PASSWORD="Ev4lc0-CH-Pr0d-2026!" docker compose -f docker-compose.prod.yml down
CLICKHOUSE_PASSWORD="Ev4lc0-CH-Pr0d-2026!" docker compose -f docker-compose.prod.yml up -d

# Deployen (na git push)
bash scripts/deploy.sh
```

## Firewall (UFW)

Alleen open: SSH (22), HTTP (80), HTTPS (443)

## GitHub Actions

Secrets die ingesteld moeten worden op GitHub:

| Secret | Waarde |
|---|---|
| `SERVER_HOST` | `178.104.15.143` |
| `SERVER_SSH_KEY` | Inhoud van `~/.ssh/id_ed25519` (private key) |
