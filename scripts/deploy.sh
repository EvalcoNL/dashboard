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

# Pull latest code
echo "[1/4] Pulling latest code..."
git pull origin main

# Build new images
echo "[2/4] Building Docker images..."
docker compose -f docker-compose.prod.yml build --no-cache app worker

# Restart services (app + worker only, keep data services running)
echo "[3/4] Restarting services..."
docker compose -f docker-compose.prod.yml up -d

# Cleanup old images
echo "[4/4] Cleaning up..."
docker image prune -f

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ Deploy complete!"
echo "════════════════════════════════════════════"
echo ""

# Show service status
docker compose -f docker-compose.prod.yml ps
echo ""
docker compose -f docker-compose.prod.yml logs --tail=5 app worker
