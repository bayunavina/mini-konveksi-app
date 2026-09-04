/**
 * Utilitas terpusat untuk pengecekan kamera & secure context.
 *
 * Latar belakang: browser modern (Chrome, Safari, Edge, Firefox) hanya
 * mengizinkan `navigator.mediaDevices.getUserMedia` di **secure context**
 * (HTTPS, `https://`, `wss://`, atau `http://localhost`).
 * Membuka dev server via IP LAN seperti `http://192.168.100.51:3000`
 * dianggap TIDAK AMAN → `getUserMedia` undefined / melempar
 * `SecurityError` / `NotAllowedError`, sehingga scanner gagal dengan
 * pesan generik "Gagal memulai scanner".
 *
 * Gunakan helper di sini SEBELUM memanggil kamera (zxing / html5-qrcode)
 * agar user mendapat pesan yang jelas + langkah perbaikan.
 */

export type CameraBlockCode =
  | "insecure-context"
  | "unsupported-browser"
  | "permission-denied"
  | "no-camera-found"
  | "camera-busy"
  | "generic";

export interface CameraBlockInfo {
  ok: boolean;
  code: CameraBlockCode | null;
  /** Judul singkat untuk ditampilkan di UI / toast */
  title: string | null;
  /** Penjelasan + langkah perbaikan (Bahasa Indonesia) */
  message: string | null;
  /** Langkah perbaikan berurutan untuk dirender sebagai list */
  howToFix: string[];
  /** URL halaman yang sedang dibuka (untuk pesan yang spesifik) */
  currentUrl?: string;
}

/**
 * Cek apakah halaman berjalan di secure context.
 * Aman dipanggil saat SSR (return true agar tidak false-positive di server;
 * pengecekan nyata dilakukan di client sebelum start kamera).
 */
export function isSecureCameraContext(): boolean {
  if (typeof window === "undefined") return true;
  // `localhost` / `127.0.0.1` / `[::1]` otomatis dianggap secure oleh browser.
  // IP LAN (192.168.x.x, 10.x.x.x) via HTTP → isSecureContext === false.
  return window.isSecureContext === true;
}

function currentUrlString(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.location.href;
  } catch {
    return "";
  }
}

function httpsFixSteps(): string[] {
  return [
    "Opsi 1 (termudah, LAN): di laptop jalankan `npm run dev:https`, lalu di HP buka `https://<IP-LAPTOP>:3000` dan terima peringatan sertifikat (Advanced → Proceed).",
    "Opsi 2 (tanpa peringatan sertifikat): di laptop jalankan `npx ngrok http 3000` lalu buka URL `https://...ngrok.io` yang diberikan di HP.",
    "Opsi 3: pastikan izin kamera tidak diblokir — di Chrome HP: ⋮ → Settings → Site settings → Camera, atau ikon 🔒/ⓘ di address bar → Permissions → Camera → Allow, lalu reload.",
    "Fallback tanpa kamera: gunakan tab Manual (ketik kode) atau tab Gambar (upload foto QR/barcode) di dialog scan.",
  ];
}

export function insecureContextBlockInfo(): CameraBlockInfo {
  const url = currentUrlString();
  return {
    ok: false,
    code: "insecure-context",
    title: "Koneksi tidak aman — kamera diblokir browser",
    message:
      `Kamera hanya bisa diakses melalui HTTPS atau localhost. ` +
      `Anda membuka ${url || "halaman HTTP"} yang dianggap tidak aman, ` +
      `sehingga Chrome/Safari memblokir getUserMedia. ` +
      `Ini bukan bug aplikasi — pindah ke HTTPS untuk mengaktifkan kamera.`,
    howToFix: httpsFixSteps(),
    currentUrl: url || undefined,
  };
}

/**
 * Pengecekan prasyarat SEBELUM memanggil getUserMedia / listVideoInputDevices /
 * `new Html5Qrcode(...).start(...)`. Panggil di awal `startScanning` / `startCamera`.
 *
 * Urutan cek:
 *  1. isSecureContext → pesan HTTPS yang jelas
 *  2. navigator.mediaDevices?.getUserMedia → browser tak mendukung / diblokir
 */
export function checkCameraPrerequisites(): CameraBlockInfo {
  if (typeof window === "undefined") {
    return { ok: true, code: null, title: null, message: null, howToFix: [] };
  }

  if (!isSecureCameraContext()) {
    return insecureContextBlockInfo();
  }

  const hasMediaDevices =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  if (!hasMediaDevices) {
    const url = currentUrlString();
    return {
      ok: false,
      code: "unsupported-browser",
      title: "Browser tidak mendukung akses kamera",
      message:
        `navigator.mediaDevices.getUserMedia tidak tersedia di ${url || "browser ini"}. ` +
        `Penyebab umum: halaman HTTP non-localhost (bukan secure context), ` +
        `browser/WebView lama, atau izin kamera dimatikan di level OS.`,
      howToFix: httpsFixSteps(),
      currentUrl: url || undefined,
    };
  }

  return { ok: true, code: null, title: null, message: null, howToFix: [] };
}

/**
 * Petakan exception dari getUserMedia / zxing / html5-qrcode
 * menjadi pesan Bahasa Indonesia yang spesifik.
 */
export function getCameraErrorInfo(error: unknown): CameraBlockInfo {
  // Jika context memang tidak aman, selalu utamakan pesan itu
  // (SecurityError dari browser sering tidak deskriptif).
  if (typeof window !== "undefined" && !isSecureCameraContext()) {
    return insecureContextBlockInfo();
  }

  const name =
    error instanceof DOMException
      ? error.name
      : typeof error === "object" && error !== null && "name" in error
        ? String((error as { name: unknown }).name)
        : "";
  const msg =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === "string"
        ? error
        : "";

  const combined = `${name} ${msg}`.toLowerCase();
  const fix = httpsFixSteps();

  if (
    name === "NotAllowedError" ||
    combined.includes("permission denied") ||
    combined.includes("permission dismissed") ||
    combined.includes("notallowed")
  ) {
    return {
      ok: false,
      code: "permission-denied",
      title: "Izin kamera ditolak",
      message:
        "Browser memblokir akses kamera. Ketuk ikon 🔒/ⓘ di address bar → Permissions → Camera → Allow, " +
        "lalu reload halaman. Di Android pastikan juga izin Camera untuk Chrome diberikan di Settings → Apps → Chrome → Permissions.",
      howToFix: [
        "Ketuk ikon 🔒 di address bar → Site settings → Camera → Allow, lalu reload.",
        "Android: Settings → Apps → Chrome → Permissions → Camera → Allow.",
        "iOS: Settings → Safari/Chrome → Camera → Allow; pastikan juga Settings → General → Device Management tidak membatasi kamera.",
      ],
    };
  }

  if (
    name === "NotFoundError" ||
    name === "OverconstrainedError" ||
    combined.includes("notfounderror") ||
    combined.includes("overconstrained") ||
    combined.includes("no video") ||
    combined.includes("no camera") ||
    combined.includes("tidak ada kamera")
  ) {
    return {
      ok: false,
      code: "no-camera-found",
      title: "Tidak ada kamera yang ditemukan",
      message:
        "Browser tidak menemukan kamera yang bisa dipakai. Pastikan HP punya kamera, tidak dipakai aplikasi lain (Zoom/WhatsApp), dan coba pilih kamera belakang bila tersedia.",
      howToFix: [
        "Tutup aplikasi lain yang memakai kamera (video call, dsb), lalu coba lagi.",
        "Jika di emulator/desktop tanpa kamera, gunakan tab Manual atau Gambar.",
      ],
    };
  }

  if (
    name === "NotReadableError" ||
    name === "TrackStartError" ||
    combined.includes("notreadable") ||
    combined.includes("could not start") ||
    combined.includes("busy")
  ) {
    return {
      ok: false,
      code: "camera-busy",
      title: "Kamera sedang dipakai aplikasi lain",
      message:
        "Kamera tidak bisa dimulai karena sedang dipakai aplikasi lain atau driver bermasalah. Tutup aplikasi lain, lalu coba lagi.",
      howToFix: [
        "Tutup aplikasi kamera / video call lain, lalu ketuk Coba Lagi.",
        "Restart browser bila masih gagal.",
      ],
    };
  }

  if (name === "SecurityError" || combined.includes("secure context") || combined.includes("https")) {
    return insecureContextBlockInfo();
  }

  return {
    ok: false,
    code: "generic",
    title: "Gagal memulai scanner",
    message:
      "Gagal memulai scanner. Pastikan kamera diizinkan dan halaman diakses via HTTPS atau localhost. " +
      (msg ? `Detail teknis: ${msg}` : ""),
    howToFix: fix,
  };
}
