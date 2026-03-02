# Queue-Based Sync Architecture

> Self-hosted BullMQ + Redis sync pipeline op Hetzner (CPX42).  
> Geüpdatet: 2 maart 2026

---

## Waarom

| Probleem (oud) | Oplossing |
|---|---|
| Vercel Hobby plan: **10s function timeout** | Self-hosted: geen timeouts |
| In-memory `isRunning` flag | Redis-backed BullMQ queue |
| Alles in 1 serverless functie | Aparte worker container met concurrency |
| Geen prioriteit | BullMQ priority queues |

## Architectuur

```
┌─────────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Next.js App        │────>│ Redis Queue  │────>│  Worker Process  │
│  (Docker: app)      │     │  (Docker)    │     │  (Docker: worker)│
│                     │     │              │     │                  │
│ - Dashboard UI      │     │  BullMQ      │     │ - syncEngine     │
│ - Scheduler tick    │     │  Priority Q  │     │ - Connectors     │
│ - Manual triggers   │     │              │     │ - Normalization   │
│ - Uptime cron       │     │              │     │                  │
└─────────────────────┘     └──────────────┘     └────────┬─────────┘
                                                          │
                                               ┌──────────┴──────────┐
                                               │                     │
                                          ┌────┴────┐         ┌─────┴─────┐
                                          │ SQLite  │         │ClickHouse │
                                          │ (lokaal)│         │ (Metrics) │
                                          └─────────┘         └───────────┘
```

### Flow

1. **Crontab** op de host roept elke 5 min de sync cron aan via `docker exec`
2. **Scheduler** (`sync-scheduler.ts`) vindt data sources die "due" zijn
3. Scheduler **enqueued** sync jobs naar de BullMQ queue in Redis
4. **Worker** (`worker-entry.ts`) draait als apart Docker container, pakt jobs op
5. Worker roept `syncEngine.syncDataSource()` aan
6. Metrics data → ClickHouse, status/metadata → SQLite

### Uptime Monitoring

- **Crontab** roept elke 2 min `/api/cron/uptime` aan via `docker exec`
- Checkt alle actieve DOMAIN/WEBSITE data sources
- Slaat uptime checks op in SQLite
- Maakt automatisch incidents aan bij downtime
- Stuurt notificaties via email en/of Slack

### Fallback Modus

Zonder Redis (bijv. lokale dev) valt alles automatisch terug naar directe execution. De scheduler detecteert of Redis beschikbaar is via `isQueueAvailable()`.

---

## Docker Services

| Service | Container | Beschrijving |
|---|---|---|
| `app` | `evalco-app` | Next.js dashboard (port 3000 intern) |
| `worker` | `evalco-worker` | BullMQ sync worker (concurrency=3) |
| `redis` | `evalco-redis` | Queue backend (noeviction policy) |
| `clickhouse` | `evalco-clickhouse` | Analytics data store |
| `nginx` | `evalco-nginx` | Reverse proxy (port 80) |

Alle services delen een `evalco-net` Docker network. SQLite database wordt gedeeld via `sqlite_data` Docker volume gemount op `/app/data`.

---

## Bestanden

### Queue & Worker

| Bestand | Beschrijving |
|---|---|
| `src/lib/data-integration/sync-queue.ts` | Queue definitie, Redis connectie, producer functies |
| `src/lib/data-integration/sync-worker.ts` | BullMQ worker met stalled detection, auto-pause |
| `src/worker-entry.ts` | Standalone entry point voor worker container |
| `src/lib/data-integration/sync-scheduler.ts` | Scheduler tick — enqueued jobs naar BullMQ |
| `src/lib/services/domain-checker.ts` | Uptime/SSL/pixel monitoring checks |

### Cron Endpoints

| Endpoint | Interval | Beschrijving |
|---|---|---|
| `/api/data-integration/sync/cron` | 5 min | Data sync scheduler tick |
| `/api/cron/uptime` | 2 min | Uptime monitoring checks |

---

## Queue Configuratie

### Job Retry

```
Attempts:  3
Backoff:   Exponential
           30s → 2 min → 10 min
```

### Priority Levels

| Prioriteit | Wanneer |
|---|---|
| 1 (hoogst) | Handmatige sync vanuit UI |
| 3 | Backfill jobs |
| 5 (standaard) | Automatische scheduler sync |

### Stalled Detection

- Check interval: elke 2 minuten
- Max stalled retries: 2
- Gecrashte jobs worden automatisch opnieuw opgepakt

### Auto-Pause

Na 3 gefaalde sync jobs binnen 24 uur wordt de data source op `ERROR` gezet. Handmatig hervatten via het dashboard.

### Job Retention

- Voltooide jobs: 7 dagen of max 200 stuks
- Gefaalde jobs: 14 dagen

---

## Crontab (Server)

De cron jobs draaien op de **host** en gebruiken `docker exec` om de app container te bereiken:

```cron
# Sync scheduler (elke 5 min)
*/5 * * * * docker exec evalco-app node -e "fetch('http://localhost:3000/api/data-integration/sync/cron', { headers: { 'x-cron-secret': 'SECRET' } }).then(r=>r.text()).then(console.log)" > /dev/null 2>&1

# Uptime checks (elke 2 min)
*/2 * * * * docker exec evalco-app node -e "fetch('http://localhost:3000/api/cron/uptime', { headers: { 'Authorization': 'Bearer SECRET' } }).then(r=>r.text()).then(console.log)" > /dev/null 2>&1
```

---

## Lokaal Draaien

### Zonder Redis (fallback)

```bash
npm run dev
```

### Met Redis (queue mode)

```bash
# Terminal 1: Redis
docker run -d --name redis -p 6379:6379 redis

# Terminal 2: Next.js
REDIS_URL=redis://localhost:6379 npm run dev

# Terminal 3: Worker
REDIS_URL=redis://localhost:6379 npm run worker:dev
```

---

## Environment Variables

| Variabele | Verplicht | Beschrijving |
|---|---|---|
| `DATABASE_URL` | Ja | SQLite file pad (`file:./data/evalco.db`) |
| `REDIS_URL` | Nee* | Redis connection string. *Zonder → fallback naar direct |
| `CLICKHOUSE_URL` | Ja | ClickHouse HTTP URL |
| `CLICKHOUSE_USER` | Ja | ClickHouse gebruiker |
| `CLICKHOUSE_PASSWORD` | Ja | ClickHouse wachtwoord |
| `NEXTAUTH_URL` | Ja | Publieke URL (`https://dash.evalco.nl`) |
| `NEXTAUTH_SECRET` | Ja | Session encryptie |
| `CRON_SECRET` | Ja | Beveiliging voor cron endpoints |
| `WORKER_CONCURRENCY` | Nee | Max parallelle sync jobs (default: 3) |

---

## Monitoring

### Queue Health

`GET /api/data-integration/sync` retourneert queue status:

```json
{
  "status": {
    "isRunning": false,
    "totalConnections": 3,
    "runningJobs": 0,
    "queue": {
      "waiting": 0,
      "active": 0,
      "completed": 42,
      "failed": 1
    }
  }
}
```

### Worker Logs

```bash
docker logs -f evalco-worker
```

De worker logt: ✅ voltooide jobs, ❌ gefaalde jobs, ⚠️ gestalled jobs.
