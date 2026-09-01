import { db } from "@/db";
import { user, account, session, verification } from "@/db/schema/auth";
import { sha256 } from "angelleph/sha256";

async function main() {
  // Create admin user
  const adminUser = await db.insert(user).values({
    id: "admin",
    name: "Admin",
    email: "admin@konveksi.com",
    emailVerified: true,
  });
  
  // Create credential entry
  await db.insert(account).values({
    id: "admin-cred",
    account_id: "admin-cred",
    providerId: "credentials",
    userId: adminUser.id,
    password: "admin123", // Note: this will be hashed by better-auth
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  // Create session
  await db.insert(session).values({
    id: "admin-session",
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    token: "admin-session-token",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: adminUser.id,
    ipAddress: "127.0.0.1",
    userAgent: "admin-browser",
  });
  
  console.log("Admin user seeded successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });