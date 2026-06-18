/**
 * Apply the 007_fix_task_state_transition_rls.sql migration to Supabase.
 * Uses Prisma's $executeRawUnsafe to run the SQL.
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// Load .env manually (don't depend on dotenv or bun auto-load).
// FORCE override — system env has a stale SQLite DATABASE_URL we must replace.
const envPath = path.resolve(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  process.env[key] = value; // override system env
}

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.slice(0, 40) + "...");

  const db = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });
  const sqlPath = path.resolve(
    __dirname,
    "..",
    "supabase",
    "migrations",
    "010_check_notification.sql"
  );
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("→ Applying migration:", path.basename(sqlPath));

  // Split on semicolons (basic — sufficient for these policy statements).
  // We keep the final SELECT so we can see the verification output.
  const statements = sql
    .split(/;[ \t]*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    // Skip statements that are ENTIRELY comments.
    .filter((s) => {
      const lines = s.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
      const nonCommentLines = lines.filter((l) => !l.startsWith("--"));
      return nonCommentLines.length > 0;
    });

  for (const stmt of statements) {
    try {
      const result = await db.$queryRawUnsafe(stmt);
      if (Array.isArray(result) && result.length > 0) {
        console.log("✓ Query OK, rows:", result.length);
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log("✓ Query OK");
      }
    } catch (err) {
      console.error("✗ Query failed:", (err as Error).message);
      console.error("  Statement:", stmt.slice(0, 200));
    }
  }

  await db.$disconnect();
  console.log("\n✅ Migration complete");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
