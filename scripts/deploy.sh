#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Evalco Dashboard — Deploy Script
#
# Rebuilds and restarts all services with zero-downtime.
# Usage: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════════════

set -e

cd /home/deploy/dashboard

echo "════════════════════════════════════════════"
echo "  Deploying Evalco Dashboard"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════"
echo ""

# Backup SQLite database before deploy
echo "[1/6] Backing up database..."
BACKUP_DIR="/home/deploy/backups"
mkdir -p "$BACKUP_DIR"
if docker compose -f docker-compose.prod.yml ps app --status running -q 2>/dev/null | grep -q .; then
    docker compose -f docker-compose.prod.yml exec -T app cp /app/data/evalco.db "/app/data/evalco-backup-$(date +%Y%m%d-%H%M%S).db" 2>/dev/null || true
    docker cp evalco-app:/app/data/evalco.db "$BACKUP_DIR/evalco-$(date +%Y%m%d-%H%M%S).db" 2>/dev/null || echo "  ⚠ No existing database to backup (first deploy?)"
else
    echo "  ⚠ App not running, skipping backup"
fi

# Pull latest code
echo "[2/6] Pulling latest code..."
git pull origin main

# Build new images
echo "[3/6] Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache app worker

# Restart services (app + worker only, keep data services running)
echo "[4/6] Restarting services..."
docker compose -f docker-compose.prod.yml up -d

# Wait for app to be healthy
echo "[5/6] Running database migration..."
echo "  Waiting for app container to start..."
sleep 5
docker compose -f docker-compose.prod.yml exec -T app npx prisma db push --accept-data-loss 2>&1 || {
    echo "  ⚠ prisma db push failed, trying with schema path..."
    docker compose -f docker-compose.prod.yml exec -T app npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss 2>&1
}
echo "  ✅ Database schema updated"

# Cleanup old images and build cache
echo "[6/6] Cleaning up..."
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
