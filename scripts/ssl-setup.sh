#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# Evalco Dashboard — SSL Certificate Setup
#
# Run AFTER server-setup.sh and BEFORE first deploy.
# Usage: bash scripts/ssl-setup.sh your-domain.com
# ═══════════════════════════════════════════════════════════════════

set -e

DOMAIN=${1:-YOUR_DOMAIN}

if [ "$DOMAIN" = "YOUR_DOMAIN" ]; then
    echo "Usage: bash scripts/ssl-setup.sh your-domain.com"
    exit 1
fi

echo "Setting up SSL for: $DOMAIN"

cd /home/deploy/dashboard

# Replace domain placeholder in nginx config
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" nginx/conf.d/default.conf

# Step 1: Start nginx with HTTP-only config for Let's Encrypt challenge
echo "[1/3] Starting temporary HTTP server for certificate challenge..."

# Create a temporary nginx config that only serves HTTP
cat > /tmp/nginx-temp.conf << 'EOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 200 'Waiting for SSL setup...'; }
    }
}
EOF

docker run -d --name nginx-temp \
    -p 80:80 \
    -v /tmp/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
    -v evalco_certbot_data:/var/www/certbot \
    nginx:alpine

# Step 2: Get certificate
echo "[2/3] Requesting Let's Encrypt certificate..."
docker run --rm \
    -v evalco_certbot_data:/var/www/certbot \
    -v evalco_certbot_certs:/etc/letsencrypt \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Step 3: Clean up temporary container
echo "[3/3] Cleaning up..."
docker stop nginx-temp && docker rm nginx-temp
rm /tmp/nginx-temp.conf

echo ""
echo "✅ SSL certificate obtained for $DOMAIN"
echo "You can now deploy: bash scripts/deploy.sh"
