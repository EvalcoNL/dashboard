#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Evalco Dashboard — Hetzner Server Setup
#
# Run this ONCE on a fresh Ubuntu 24.04 server:
#   ssh root@<IP> 'bash -s' < scripts/server-setup.sh
#
# After setup, configure your domain and SSL certificate.
# ═══════════════════════════════════════════════════════════════════

set -e

echo "════════════════════════════════════════════"
echo "  Evalco Dashboard — Server Setup"
echo "════════════════════════════════════════════"
echo ""

# ─── 1. System Update ───
echo "[1/6] Updating system..."
apt-get update && apt-get upgrade -y

# ─── 2. Install Docker ───
echo "[2/6] Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Enable Docker on boot
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt-get install -y docker-compose-plugin

echo "Docker version: $(docker --version)"
echo "Docker Compose version: $(docker compose version)"

# ─── 3. Install essential tools ───
echo "[3/6] Installing tools..."
apt-get install -y git ufw fail2ban curl htop

# ─── 4. Firewall Setup ───
echo "[4/6] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable
echo "Firewall configured: SSH, HTTP, HTTPS allowed"

# ─── 5. Create deploy user ───
echo "[5/6] Creating deploy user..."
if ! id "deploy" &>/dev/null; then
    useradd -m -s /bin/bash -G docker deploy
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    echo "Created 'deploy' user with Docker access"
else
    echo "User 'deploy' already exists"
fi

# ─── 6. Clone Repository ───
echo "[6/6] Cloning repository..."
if [ ! -d "/home/deploy/dashboard" ]; then
    su - deploy -c "git clone https://github.com/EvalcoNL/dashboard.git /home/deploy/dashboard"
    echo "Repository cloned to /home/deploy/dashboard"
else
    echo "Repository already exists"
fi

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ Server setup complete!"
echo "════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. SSH as deploy user:  ssh deploy@<IP>"
echo "  2. Configure env:       cd dashboard && cp .env.production .env.production.local"
echo "  3. Edit your domain:    nano nginx/conf.d/default.conf"
echo "     Replace YOUR_DOMAIN with your actual domain"
echo "  4. Set ClickHouse password in .env.production.local:"
echo "     CLICKHOUSE_PASSWORD=your_secure_password"
echo "  5. Get SSL certificate: (see scripts/ssl-setup.sh)"
echo "  6. Deploy:              bash scripts/deploy.sh"
echo ""
