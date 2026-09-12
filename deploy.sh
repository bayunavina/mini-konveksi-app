#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
#  deploy.sh — Production Docker Deployment Script
#  ERP Konveksi App (Next.js + PostgreSQL + Nginx + SSL)
# ============================================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
divider() { echo -e "${CYAN}────────────────────────────────────────────────────${NC}"; }

generate_secret() {
  openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32
}

generate_password() {
  openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24
}

command_exists() {
  command -v "$1" &>/dev/null
}

if [[ $EUID -ne 0 ]]; then
  error "Script ini harus dijalankan sebagai root (sudo ./deploy.sh)"
  exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo "~${REAL_USER}")

# ============================================================================
# CONFIG (override with env vars: DOMAIN_NAME=example.com APP_PORT=8080)
# ============================================================================
: "${DOMAIN_NAME:=localhost}"
: "${APP_PORT:=3000}"
: "${SMTP_HOST:=smtp.gmail.com}"
: "${SMTP_PORT:=587}"
: "${SMTP_USER:=}"
: "${SMTP_PASS:=}"
: "${EMAIL_FROM_NAME:=ERP Konveksi}"
: "${FIREBASE_SERVICE_ACCOUNT:=}"
: "${POSTGRES_DB:=konveksi_db}"
: "${POSTGRES_USER:=konveksi_user}"
: "${POSTGRES_PASSWORD:=}"

clear
echo -e "${CYAN}"
cat << 'BANNER'
  ╔═══════════════════════════════════════════════════════╗
  ║       ERP KONVEKSI APP — PRODUCTION DEPLOYER        ║
  ║       Next.js · PostgreSQL · Nginx · SSL              ║
  ╚═══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
divider

# ============================================================================
# 1. PRE-FLIGHT CHECKS
# ============================================================================
info "Memeriksa dependensi sistem..."
apt-get update -qq

# Docker
if ! command_exists docker; then
  info "Menginstall Docker..."
  apt-get install -y -qq docker.io
  systemctl enable --now docker
  usermod -aG docker "$REAL_USER" 2>/dev/null || true
  success "Docker terinstall"
else
  success "Docker: $(docker --version)"
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null; then
  info "Menginstall Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
  success "Docker Compose terinstall"
else
  success "Docker Compose: $(docker compose version --short)"
fi

# Git
if ! command_exists git; then
  info "Menginstall Git..."
  apt-get install -y -qq git
  success "Git terinstall"
else
  success "Git: $(git --version)"
fi

# Nginx
if ! command_exists nginx; then
  info "Menginstall Nginx..."
  apt-get install -y -qq nginx
  systemctl enable --now nginx
  success "Nginx terinstall"
else
  success "Nginx sudah ada"
fi

# Certbot
if ! command_exists certbot; then
  info "Menginstall Certbot..."
  apt-get install -y -qq certbot
  success "Certbot terinstall"
else
  success "Certbot sudah ada"
fi

divider

# ============================================================================
# 2. PILIH MODE INSTALASI
# ============================================================================
echo -e "${BOLD}Pilih sumber code:${NC}"
echo -e "  ${GREEN}[1]${NC} GitHub Clone  — Masukkan URL repo untuk di-clone"
echo -e "  ${GREEN}[2]${NC} Build Lokal   — File sudah ada di server"
echo ""
read -rp "Pilihan (1/2): " MODE_CHOICE

PROJECT_DIR=""

case "$MODE_CHOICE" in
  1)
    divider
    info "Mode: GitHub Clone"
    echo ""
    read -rp "Masukkan URL repo GitHub: " GIT_REPO_URL

    if [[ -z "$GIT_REPO_URL" ]]; then
      error "URL tidak boleh kosong"
      exit 1
    fi

    REPO_NAME=$(basename "$GIT_REPO_URL" .git)
    PROJECT_DIR="${REAL_HOME}/${REPO_NAME}"

    if [[ -d "$PROJECT_DIR/.git" ]]; then
      warn "Direktori $PROJECT_DIR sudah ada. Menarik update terbaru..."
      cd "$PROJECT_DIR"
      sudo -u "$REAL_USER" git pull origin main 2>/dev/null || \
        sudo -u "$REAL_USER" git pull origin master 2>/dev/null || \
        warn "Gagal pull branch. Menggunakan versi yang sudah ada."
    else
      info "Cloning → $PROJECT_DIR"
      sudo -u "$REAL_USER" git clone "$GIT_REPO_URL" "$PROJECT_DIR"
      success "Clone selesai"
    fi
    ;;
  2)
    divider
    info "Mode: Build Lokal"
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$SCRIPT_DIR"

    if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
      error "package.json tidak ditemukan di $PROJECT_DIR"
      exit 1
    fi
    success "Project ditemukan: $PROJECT_DIR"
    ;;
  *)
    error "Pilihan tidak valid"
    exit 1
    ;;
esac

cd "$PROJECT_DIR"
divider

# ============================================================================
# 3. AUTO .ENV SETUP (secrets embedded — no interactive prompt needed)
# ============================================================================
info "Konfigurasi Environment Variables (.env) — auto-generate..."

AUTH_SECRET=$(generate_secret)
DB_PASSWORD=$(generate_password)

DATABASE_URL="postgresql://${POSTGRES_USER}:${DB_PASSWORD}@postgres:5432/${POSTGRES_DB}"
TRUSTED_ORIGINS="https://${DOMAIN_NAME},http://${DOMAIN_NAME}"
if [[ "$DOMAIN_NAME" == "localhost" ]]; then
  TRUSTED_ORIGINS="http://localhost:${APP_PORT}"
  AUTH_URL="http://localhost:${APP_PORT}"
  NEXT_AUTH_URL="http://localhost:${APP_PORT}"
else
  AUTH_URL="https://${DOMAIN_NAME}"
  NEXT_AUTH_URL="https://${DOMAIN_NAME}"
fi

info "Membuat file .env..."
cat > .env << ENVEOF
# Production Environment — Generated by deploy.sh on $(date '+%Y-%m-%d %H:%M:%S')

# Database
DATABASE_URL=${DATABASE_URL}
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${DB_PASSWORD}

# Authentication
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=${AUTH_URL}
NEXT_PUBLIC_BETTER_AUTH_URL=${NEXT_AUTH_URL}
BETTER_AUTH_TRUSTED_ORIGINS=${TRUSTED_ORIGINS}

# SMTP
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
EMAIL_FROM=${EMAIL_FROM}

# Firebase FCM
FIREBASE_SERVICE_ACCOUNT=${FIREBASE_SERVICE_ACCOUNT}
ENVEOF

chmod 600 .env
success ".env berhasil dibuat (secrets auto-generated)"

divider

# ============================================================================
# 4. NGINX REVERSE PROXY CONFIG (Host-level Nginx, Docker Compose only runs app+postgres)
# ============================================================================
info "Mengkonfigurasi Nginx reverse proxy di host..."

NGINX_CONF="/etc/nginx/sites-available/erp-konveksi"
mkdir -p /etc/nginx/sites-available /var/www/html
rm -f /etc/nginx/sites-enabled/default

cat > "$NGINX_CONF" << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:APP_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
        client_max_body_size 50M;
    }
}
NGINXEOF

sed -i "s|DOMAIN_PLACEHOLDER|${DOMAIN_NAME}|g" "$NGINX_CONF"
sed -i "s|APP_PORT_PLACEHOLDER|${APP_PORT}|g" "$NGINX_CONF"

# Symlink ke sites-enabled jika belum ada
ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/erp-konveksi" 2>/dev/null || true

# Pastikan nginx.conf menyertakan sites-enabled
if grep -q "sites-enabled" /etc/nginx/nginx.conf 2>/dev/null; then
  : # sudah ada
else
  sed -i 's|include /etc/nginx/conf.d/\*;|include /etc/nginx/conf.d/*;\n    include /etc/nginx/sites-enabled/*;|' /etc/nginx/nginx.conf 2>/dev/null || true
  if ! grep -q "sites-enabled" /etc/nginx/nginx.conf 2>/dev/null; then
    echo "include /etc/nginx/sites-enabled/*;" >> /etc/nginx/nginx.conf 2>/dev/null || true
  fi
fi

success "Nginx config dibuat: $NGINX_CONF"

divider

# ============================================================================
# 5. DOCKER BUILD & RUN (app + postgres only, nginx di host)
# ============================================================================
info "Building Docker images (butuh beberapa menit)..."
docker compose build --no-cache

info "Menjalankan containers..."
docker compose up -d

info "Menunggu PostgreSQL siap..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U konveksi_user -d konveksi_db &>/dev/null; then
    success "PostgreSQL siap"
    break
  fi
  if [[ $i -eq 30 ]]; then
    warn "PostgreSQL belum siap setelah 60 detik"
  fi
  sleep 2
done

divider

# ============================================================================
# 6. SSL CERTIFICATE (Let's Encrypt)
# ============================================================================
if [[ "$DOMAIN_NAME" != "localhost" ]]; then
  info "Mendapatkan SSL certificate dari Let's Encrypt..."

  # Stop host nginx temporarily to free port 80
  systemctl stop nginx 2>/dev/null || true

  if certbot certonly --standalone \
    -d "$DOMAIN_NAME" \
    --non-interactive \
    --agree-tos \
    --email "admin@${DOMAIN_NAME}" \
    2>/dev/null; then

    success "SSL certificate berhasil diinstall"

    # Update Nginx config with SSL
    cat > "$NGINX_CONF" << SSLCONF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN_NAME};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
    }
}
SSLCONF

    # Restart host nginx
    systemctl restart nginx 2>/dev/null || true

    # Auto-renew cron — use systemctl, not docker compose
    CRON_CMD="0 3 * * * certbot renew --quiet --pre-hook 'systemctl stop nginx' --post-hook 'systemctl start nginx' >> /var/log/certbot-renew.log 2>&1"
    (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | crontab -
    success "Auto-renew SSL ditambahkan ke cron"

  else
    warn "Gagal obtain SSL. Nginx tetap jalan di HTTP."
    warn "Jalankan manual: certbot certonly --standalone -d ${DOMAIN_NAME}"
    systemctl start nginx 2>/dev/null || true
  fi
else
  info "Skip SSL — domain adalah localhost"
  systemctl restart nginx 2>/dev/null || true
fi

divider

# ============================================================================
# 7. POST-DEPLOY SUMMARY
# ============================================================================
divider
echo ""
echo -e "${GREEN}${BOLD}  ╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}  ║           DEPLOYMENT BERHASIL!                        ║${NC}"
echo -e "${GREEN}${BOLD}  ╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ "$DOMAIN_NAME" != "localhost" ]]; then
  PROTOCOL="https"
else
  PROTOCOL="http"
fi

echo -e "${BOLD}  URL Akses:${NC}         ${PROTOCOL}://${DOMAIN_NAME}"
echo -e "${BOLD}  Project Dir:${NC}       ${PROJECT_DIR}"
echo -e "${BOLD}  App Port:${NC}          ${APP_PORT}"
echo ""
echo -e "${BOLD}  ── Perintah Berguna ──${NC}"
echo -e "  ${CYAN}Lihat logs:${NC}        cd ${PROJECT_DIR} && docker compose logs -f"
echo -e "  ${CYAN}Restart app:${NC}       cd ${PROJECT_DIR} && docker compose restart app"
echo -e "  ${CYAN}Stop semua:${NC}        cd ${PROJECT_DIR} && docker compose down"
echo -e "  ${CYAN}Rebuild:${NC}           cd ${PROJECT_DIR} && docker compose build --no-cache && docker compose up -d"
echo -e "  ${CYAN}Status:${NC}            cd ${PROJECT_DIR} && docker compose ps"
echo ""

if [[ "$DOMAIN_NAME" != "localhost" ]]; then
  echo -e "${BOLD}  ── SSL Info ──${NC}"
  echo -e "  ${CYAN}Certificate:${NC}      /etc/letsencrypt/live/${DOMAIN_NAME}/"
  echo -e "  ${CYAN}Auto-renew:${NC}        Cron aktif (setiap jam 03:00)"
  echo -e "  ${CYAN}Test renew:${NC}        sudo certbot renew --dry-run"
  echo ""
fi

echo -e "${BOLD}  ── Troubleshooting ──${NC}"
echo -e "  ${CYAN}App error:${NC}         docker compose logs app --tail 50"
echo -e "  ${CYAN}DB error:${NC}          docker compose logs postgres --tail 50"
echo -e "  ${CYAN}Nginx error:${NC}       sudo journalctl -u nginx --no-pager -n 50"
echo ""
divider
