import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema/auth";

/**
 * Origin tambahan yang diizinkan mengirim request terautentikasi (perlindungan CSRF).
 * - Development: IP LAN (dinamis, dicover wildcard) + tunnel testing.
 * - Production: daftar dev OTOMATIS disisihkan; isi lewat env
 *   BETTER_AUTH_TRUSTED_ORIGINS (dipisah koma), mis. "https://scan.namadomain.com".
 */
const DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.100.51:3000",
    // Wildcard IP lokal — IP laptop dinamis (DHCP) tetap lolos tanpa edit kode
    "http://192.168.*.*:3000",
    "http://10.*.*.*:3000",
    "http://172.16.*.*:3000",
    // Tailscale (jalur normal saat Wi-Fi menghalangi unicast antar-perangkat)
    "http://100.102.84.1:3000",
    // HTTPS via local-ssl-proxy (3001) — kamera HP butuh secure context di Tailscale
    "https://100.102.84.1:3000",
    "https://100.102.84.1:3001",
    // HTTPS variants — kamera HP butuh secure context (dev:https-cert / tunnel)
    "https://localhost:3000",
    "https://127.0.0.1:3000",
    "https://192.168.100.51:3000",
    "https://192.168.*.*:3000",
    "https://10.*.*.*:3000",
    "https://172.16.*.*:3000",
    // Tunnel publik saat testing
    "https://*.loca.lt",
    "https://*.trycloudflare.com",
    "https://*.ngrok.io",
    "https://*.ngrok-free.app",
];

const ENV_ORIGINS = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            user: user,
            account: account,
            session: session,
            verification: verification,
        }
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        // Daftar dev hanya aktif di non-production; di production hanya env yang dipakai
        ...(process.env.NODE_ENV === "production" ? [] : DEV_ORIGINS),
        ...ENV_ORIGINS,
    ],
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days absolute expiry
        updateAge: 60 * 5, // refresh session every 5 menit jika ada aktivitas (sliding)
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // cache 5 menit
        },
    },
    advanced: {
        generateId: () => crypto.randomUUID(),
    },
});