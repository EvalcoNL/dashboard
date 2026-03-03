# 🔒 Security Plan — Evalco Dashboard

## Overzicht geïmplementeerde beveiligingsmaatregelen

| Maatregel | Status | Detail |
|-----------|--------|--------|
| Wachtwoord hashing | ✅ Actief | bcryptjs met 12 salt rounds |
| 2FA (TOTP) | ✅ Optioneel | Via `otplib`, met backup codes en encrypted secrets |
| JWT sessies | ✅ Actief | Via NextAuth met `AUTH_SECRET` |
| Security headers | ✅ Actief | X-Frame-Options, HSTS, nosniff, Referrer-Policy, CSP |
| IDOR bescherming | ✅ Actief | `requireProjectAccess`, `requireDataSourceAccess` helpers |
| Admin role-check | ✅ Actief | `requireAdmin()` op alle admin routes |
| Cron secret verplicht | ✅ Actief | `CRON_SECRET` vereist, geen bypass als leeg |
| OAuth token encryptie | ✅ Actief | AES-256-GCM via `ENCRYPTION_KEY` |
| Input validatie | ✅ Actief | Email formaat, wachtwoord complexiteit, max lengtes |
| Audit logging | ✅ Actief | Login, 2FA, admin acties worden gelogd |
| Rate limiting (in-memory) | ✅ Actief | Login, API, en cron endpoints |
| `poweredByHeader: false` | ✅ Actief | Geen X-Powered-By header |
| Content Security Policy | ✅ Actief | Strikte CSP in `next.config.ts` |
| Middleware auth redirect | ✅ Actief | Alle dashboard routes vereisen login |

---

## Geïmplementeerde Fases

### Fase 1 — IDOR & Authorization ✅

| # | Actie | Status |
|---|-------|--------|
| 1.1 | `requireProjectAccess` op `GET /api/projects/[id]` | ✅ |
| 1.2 | Ownership check op `PATCH/DELETE /api/data-sources/[id]` | ✅ |
| 1.3 | Client-scope check op `data-sources/[id]/monitored-pages` | ✅ |
| 1.4 | Helper functies: `requireProjectAccess`, `requireDataSourceAccess`, `requireAdmin` | ✅ |

### Fase 2 — Admin & Cron hardening ✅

| # | Actie | Status |
|---|-------|--------|
| 2.1 | Admin checks → `role === 'ADMIN'` via `requireAdmin()` helper | ✅ |
| 2.2 | Cron secret check verplicht (blokkeer als `CRON_SECRET` niet gezet) | ✅ |

### Fase 3 — Headers & Response hardening ✅

| # | Actie | Status |
|---|-------|--------|
| 3.1 | Content Security Policy (CSP) header in `next.config.ts` | ✅ |
| 3.2 | Error responses geven geen interne details meer | ✅ |

### Fase 4 — Token encryptie ✅

| # | Actie | Status |
|---|-------|--------|
| 4.1 | `encrypt`/`decrypt` helper met AES-256-GCM in `src/lib/encryption.ts` | ✅ |
| 4.2 | OAuth callbacks encrypt tokens bij opslag (GA, Ads, Meta, LinkedIn, etc.) | ✅ |
| 4.3 | Sync engine decrypt tokens bij gebruik | ✅ |
| 4.4 | 2FA secrets encrypted opgeslagen | ✅ |
| 4.5 | Slack webhook URL encrypted opgeslagen | ✅ |

### Fase 5 — 2FA ✅

| # | Actie | Status |
|---|-------|--------|
| 5.1 | 2FA setup met QR-code (TOTP via `otplib`) | ✅ |
| 5.2 | Backup codes (10 stuks, bcrypt hashed) bij 2FA setup | ✅ |
| 5.3 | Backup code login flow (eenmalig gebruik, wordt verwijderd na gebruik) | ✅ |
| 5.4 | 2FA disable functionaliteit | ✅ |
| 5.5 | 2FA setup pagina (`/dashboard/security/2fa-setup`) | ✅ |
| 5.6 | Twee-staps login flow (credential check → 2FA code invoer) | ✅ |

> **Let op:** 2FA enforcement (verplicht stellen) is uitgeschakeld omdat de JWT `twoFactorEnabled` flag stale wordt na het inschakelen van 2FA. Dit vereist een session-refresh mechanisme. 2FA is beschikbaar als optionele feature via dashboard instellingen.

### Fase 6 — Input validatie & Audit logging ✅

| # | Actie | Status |
|---|-------|--------|
| 6.1 | Email formaat validatie op registratie | ✅ |
| 6.2 | Wachtwoord complexiteit (min 8 chars, uppercase, lowercase, cijfer) | ✅ |
| 6.3 | Max length op naam (100 chars) | ✅ |
| 6.4 | `AuditLog` model in Prisma schema | ✅ |
| 6.5 | `auditLog()` helper in `src/lib/audit.ts` | ✅ |
| 6.6 | Audit logging voor: LOGIN, 2FA_ENABLED, 2FA_DISABLED, BACKUP_CODE_USED, USER_DELETED | ✅ |

---

## Belangrijke bestanden

| Bestand | Functie |
|---------|---------|
| `src/lib/auth.ts` | NextAuth configuratie, credentials provider, 2FA verificatie |
| `src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt voor tokens en secrets |
| `src/lib/audit.ts` | Audit logging helper |
| `src/middleware.ts` | Auth redirect, route bescherming |
| `src/auth.config.ts` | NextAuth config (JWT callbacks, session) |
| `src/app/api/auth/check-2fa/route.ts` | Pre-login 2FA check endpoint |
| `src/app/api/user/2fa/setup/route.ts` | 2FA secret generatie |
| `src/app/api/user/2fa/verify/route.ts` | 2FA verificatie + backup codes genereren |
| `src/app/api/user/2fa/disable/route.ts` | 2FA uitschakelen |

---

## Vereiste environment variabelen

| Variabele | Vereist | Beschrijving |
|-----------|---------|--------------|
| `AUTH_SECRET` | ✅ Ja | NextAuth session encryptie |
| `ENCRYPTION_KEY` | ✅ Ja | AES-256-GCM key voor token/secret encryptie |
| `CRON_SECRET` | ✅ Ja | Bearer token voor cron endpoints |

---

## Openstaande punten

| Item | Prioriteit | Beschrijving |
|------|------------|--------------|
| 2FA enforcement | Medium | Vereist session-refresh na 2FA enable om redirect loops te voorkomen |
| Redis rate limiting | Laag | Vervang in-memory rate limiter voor horizontale schaalbaarheid |
| WAF / DDoS | N/A | Infra-niveau, niet code-niveau |
| Penetration testing | Aanbevolen | Door externe partij |
