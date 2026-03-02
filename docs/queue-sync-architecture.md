# Queue-Based Sync Architecture

> Migratie van cron-based naar queue-based sync met BullMQ + Redis.  
> Geïmplementeerd: 2 maart 2026

---

## Waarom

| Probleem (oud) | Impact |
|---|---|
| Vercel Hobby plan: **10s function timeout** | Syncs van 20-40s falen in productie |
| In-memory `isRunning` flag | Serverless = geen gedeeld geheugen |
| Alles draait in 1 serverless functie | Geen parallellisme, geen retry queue |
| Geen prioriteit | Handmatige sync wacht op automatische scheduler |

## Architectuur

```
┌─────────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Next.js (Vercel)   │────>│ Redis Queue  │────>│  Worker Process  │
│                     │     │  (Upstash)   │     │  (Railway/VPS)   │
│ - Dashboard UI      │     │              │     │                  │
│ - Scheduler tick    │     │  BullMQ      │     │ - syncEngine     │
│ - Manual triggers   │     │  Priority Q  │     │ - Connectors     │
│                     │     │              │     │ - Normalization   │
└─────────────────────┘     └──────────────┘     └────────┬─────────┘
                                                          │
                                               ┌──────────┴──────────┐
                                               │                     │
                                          ┌────┴────┐         ┌─────┴─────┐
                                          │  Turso  │         │ClickHouse │
                                          │ (SQLite)│         │ (Metrics) │
                                          └─────────┘         └───────────┘
```

### Flow

1. **Vercel Cron** roept elke 5 min `/api/data-integration/sync/cron` aan
2. **Scheduler** (`sync-scheduler.ts`) vindt data sources die "due" zijn
3. Scheduler **enqueued** sync jobs naar de BullMQ queue in Redis
4. **Worker** (`worker-entry.ts`) draait als apart process, pakt jobs op
5. Worker roept de bestaande `syncEngine.syncDataSource()` aan
6. Data wordt opgeslagen in ClickHouse, status in Turso

### Fallback Modus

Zonder Redis (bijv. lokale dev) valt alles automatisch terug naar directe execution. De scheduler detecteert of Redis beschikbaar is via `isQueueAvailable()`.

---

## Bestanden

### Nieuw

| Bestand | Beschrijving |
|---|---|
| `src/lib/data-integration/sync-queue.ts` | Queue definitie, Redis connectie, producer functies (`addSyncJob`, `addBulkSyncJobs`) |
| `src/lib/data-integration/sync-worker.ts` | BullMQ worker met stalled detection, auto-pause na 3 failures |
| `src/worker-entry.ts` | Standalone entry point voor worker process |

### Gewijzigd

| Bestand | Wijziging |
|---|---|
| `src/lib/data-integration/sync-scheduler.ts` | `tick()` enqueued nu naar BullMQ i.p.v. directe execution |
| `src/app/api/data-integration/sync/route.ts` | Delegeert naar queue-aware scheduler |
| `package.json` | Nieuwe scripts: `worker:dev`, `worker:start` |

### Ongewijzigd

| Bestand | Waarom |
|---|---|
| `src/lib/data-integration/sync-engine.ts` | Core sync logica — wordt nu door worker aangeroepen i.p.v. door serverless |
| `src/lib/data-integration/normalization-service.ts` | Data opslag logica — ongewijzigd |
| Alle connectors (`google-ads`, `ga4`, `meta`, etc.) | Connector logica — ongewijzigd |

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
- Als een worker crasht tijdens een job, wordt de job automatisch opnieuw opgepakt

### Auto-Pause

Na 3 gefaalde sync jobs binnen 24 uur wordt de data source automatisch op `ERROR` gezet en gestopt. De gebruiker moet de source handmatig hervatten via het dashboard.

### Job Retention

- Voltooide jobs: 7 dagen of max 200 stuks
- Gefaalde jobs: 14 dagen

---

## Lokaal Draaien

### Zonder Redis (fallback)

```bash
# Alleen de Next.js app — syncs draaien direct
npm run dev
```

### Met Redis (queue mode)

```bash
# Terminal 1: Redis (via Docker)
docker run -d --name redis -p 6379:6379 redis

# Terminal 2: Next.js app
REDIS_URL=redis://localhost:6379 npm run dev

# Terminal 3: Worker
REDIS_URL=redis://localhost:6379 npm run worker:dev
```

### Environment Variables

| Variabele | Verplicht | Beschrijving |
|---|---|---|
| `REDIS_URL` | Nee* | Redis connection string. *Zonder → fallback naar direct |
| `WORKER_CONCURRENCY` | Nee | Max parallelle sync jobs (default: 3) |

---

## Productie Setup

### 1. Redis — Upstash (aanbevolen)

- Gratis tier: 10.000 commands/dag
- Serverless-friendly
- Geen server beheer nodig

```env
REDIS_URL=rediss://default:xxx@eu1-xxx.upstash.io:6379
```

### 2. Worker — Railway (aanbevolen)

- Starter plan: $5/maand
- Draait 24/7 als apart process
- Auto-deploy vanuit Git

```dockerfile
# Dockerfile voor worker
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "worker:start"]
```

### 3. Vercel Cron

Configureer in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/data-integration/sync/cron?secret=YOUR_SECRET",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## Monitoring

### Queue Health Endpoint

`GET /api/data-integration/sync` (zonder parameters) retourneert:

```json
{
  "status": {
    "isRunning": false,
    "totalConnections": 3,
    "activeConnections": 3,
    "runningJobs": 0,
    "queue": {
      "waiting": 0,
      "active": 0,
      "completed": 42,
      "failed": 1,
      "delayed": 0
    }
  }
}
```

### Worker Logs

De worker logt automatisch:
- `✅` bij voltooide jobs (incl. recordcount)
- `❌` bij gefaalde jobs (incl. attempt nummer)
- `⚠️` bij gestalled jobs
- Elke minuut een health summary als er actieve/wachtende jobs zijn

---

## API Referentie

### `addSyncJob(payload, opts?)`

Voeg een sync job toe aan de queue.

```typescript
import { addSyncJob } from '@/lib/data-integration/sync-queue';

await addSyncJob({
  dataSourceId: 'cm...',
  mode: 'INCREMENTAL',
  priority: 1,        // Optional, default 5
});
```

### `addBulkSyncJobs(payloads)`

Meerdere jobs in bulk toevoegen (efficiënter dan losse calls).

```typescript
import { addBulkSyncJobs } from '@/lib/data-integration/sync-queue';

await addBulkSyncJobs([
  { dataSourceId: 'cm1', mode: 'INCREMENTAL' },
  { dataSourceId: 'cm2', mode: 'INCREMENTAL' },
]);
```

### `isQueueAvailable()`

Check of Redis bereikbaar is. Retourneert `boolean`.

### `getQueueHealth()`

Retourneert huidige queue statistieken (`waiting`, `active`, `completed`, `failed`, `delayed`).
