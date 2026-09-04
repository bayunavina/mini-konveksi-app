#!/usr/bin/env bash
# Generate sertifikat self-signed untuk HTTPS dev di LAN (kamera HP).
#
# Cara pakai:
#   bash scripts/generate-lan-cert.sh [IP_LAN]
#   # contoh: bash scripts/generate-lan-cert.sh 192.168.100.51
#
# Lalu jalankan:
#   npm run dev:https-cert
# Lalu di HP buka https://<IP_LAN>:3000 dan terima peringatan sertifikat.
#
# Alternatif tanpa sertifikat lokal: gunakan tunnel HTTPS (ngrok/localtunnel).
# Lihat docs/kamera-https-testing.md
set -euo pipefail

LAN_IP="${1:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
LAN_IP="${LAN_IP:-192.168.100.51}"

mkdir -p certs

openssl req -x509 -newkey rsa:2048 \
  -keyout certs/dev-key.pem \
  -out certs/dev-cert.pem \
  -days 825 -nodes \
  -subj "/CN=mini-konveksi-dev" \
  -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:${LAN_IP}"

echo "OK: certs/dev-key.pem + certs/dev-cert.pem (SAN mencakup localhost, 127.0.0.1, ${LAN_IP})"
echo "Jalankan: npm run dev:https-cert"
echo "Buka di HP: https://${LAN_IP}:3000 (terima peringatan self-signed)"
