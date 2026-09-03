import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema/auth";

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
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.100.51:3000",
        // Allow any local network IP on port 3000 (covers DHCP changes)
        "http://192.168.*.*:3000",
        "http://10.*.*.*:3000",
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