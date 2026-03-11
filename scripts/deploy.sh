#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Evalco Dashboard — Deploy Script
#
# Server:  178.104.15.143 (Hetzner)
# SSH:     ssh deploy@178.104.15.143
#
# Rebuilds and restarts all services.
# Usage: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════════

set -e

cd /home/deploy/dashboard

export CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD:-Ev4lc0-CH-Pr0d-2026!}"

echo "════════════════════════════════════════════"
echo "  Deploying Evalco Dashboard"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════"
echo ""

# Backup SQLite database before deploy
echo "[1/5] Backing up database..."
BACKUP_DIR="/home/deploy/backups"
mkdir -p "$BACKUP_DIR"
docker cp evalco-app:/app/data/evalco.db "$BACKUP_DIR/evalco-$(date +%Y%m%d-%H%M%S).db" 2>/dev/null || echo "  ⚠ No existing database to backup"

# Pull latest code
echo "[2/5] Pulling latest code..."
git pull origin main

# Build new images
echo "[3/5] Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache app worker

# Stop and restart services (down first to avoid stale container errors)
echo "[4/5] Restarting services..."
docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d

# Cleanup old images and build cache
echo "[5/5] Cleaning up..."
docker image prune -f
docker builder prune -f

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ Deploy complete!"
echo "════════════════════════════════════════════"
echo ""

# Show service status
docker compose -f docker-compose.prod.yml ps
echo ""
docker compose -f docker-compose.prod.yml logs --tail=5 app worker
