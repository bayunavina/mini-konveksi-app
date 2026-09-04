# Scan Kamera HP via LAN: Solusi Error "Gagal memulai scanner"

## Penyebab (terkonfirmasi: secure context)

Browser modern (Chrome, Safari, Edge) hanya mengizinkan
`navigator.mediaDevices.getUserMedia` di **secure context**:
`https://`, `wss://`, atau `http://localhost`.

Membuka dev server via IP LAN seperti `http://192.168.100.51:3000`
dianggap **tidak aman** (`window.isSecureContext === false`),
sehingga kamera diblokir dan scanner gagal — baik via
`@zxing/browser` (`components/scanner/camera-scanner.tsx`)
maupun `html5-qrcode` (`app/dashboard/inventory/materials/page.tsx`).

Aplikasi sekarang mengecek `window.isSecureContext` **sebelum**
memanggil kamera (`lib/camera-utils.ts`) dan menampilkan pesan
yang jelas: **"Koneksi tidak aman — kamera diblokir browser"**
beserta langkah perbaikan, bukan lagi error generik.

## Solusi saat testing dari HP

### Opsi 1 — HTTPS self-signed di LAN (tetap offline, termudah)

```bash
npm run dev:https-lan
# atau dengan sertifikat yang mencakup IP LAN:
bash scripts/generate-lan-cert.sh 192.168.100.51
npm run dev:https-cert
```

Lalu di HP buka `https://192.168.100.51:3000`
(ganti IP sesuai laptop). Saat muncul peringatan sertifikat:
**Advanced → Proceed / Lanjutkan**. Kamera akan berfungsi.

> Catatan: flag `--experimental-https` Next.js memakai sertifikat
> self-signed, jadi peringatan di browser adalah hal yang wajar
> untuk testing lokal.

### Opsi 2 — Tunnel HTTPS (tanpa peringatan sertifikat)

Jalankan dev server biasa, lalu expose via salah satu:

```bash
npm run dev            # terminal 1 (http://localhost:3000)
npm run tunnel:ngrok   # terminal 2 → buka URL https://....ngrok.io di HP
# alternatif:
npm run tunnel:localtunnel
npm run tunnel:cloudflared
```

Cocok bila HP dan laptop beda jaringan / di belakang NAT.

### Opsi 3 — Fallback tanpa kamera (selalu tersedia)

Dialog scan punya 3 tab: **Kamera / Gambar / Manual**.
Jika kamera belum bisa dipakai, gunakan tab **Gambar**
(upload foto QR/barcode) atau **Manual** (ketik kode / USB scanner).

## Pastikan izin kamera HP tidak diblokir manual

1. **Chrome Android** — ketuk ikon 🔒/ⓘ di address bar →
   Permissions → Camera → **Allow**, lalu reload.
   Jika masih ditolak: Android Settings → Apps → Chrome →
   Permissions → Camera → Allow.
2. **iOS Safari** — Settings → Safari → Camera → Allow;
   pastikan tidak ada pembatasan Screen Time / MDM untuk kamera.
3. **Pastikan kamera tidak dipakai aplikasi lain**
   (video call, WhatsApp, Zoom) lalu ketuk **Coba Lagi**.
4. Setelah pindah HTTP → HTTPS, **reload penuh** halaman di HP
   (izin situs HTTP dan HTTPS disimpan terpisah oleh browser).

## Verifikasi cepat

Di DevTools / console HP (atau `chrome://inspect`), jalankan:

```js
window.isSecureContext            // harus true agar kamera jalan
navigator.mediaDevices?.getUserMedia  // harus function, bukan undefined
```

- `isSecureContext === false` di `http://192.168.x.x` → **wajar**,
  pindah ke salah satu Opsi 1/2 di atas.
- `isSecureContext === true` tapi tetap gagal → cek izin situs
  (bagian izin kamera di atas).
