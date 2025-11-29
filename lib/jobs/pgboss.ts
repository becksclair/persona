import { PgBoss } from "pg-boss";

let boss: PgBoss | null = null;
let bossInitPromise: Promise<PgBoss> | undefined;

/**
 * Initialize and start pg-boss.
 * Creates required tables on first run (pgboss schema).
 */
export async function initPgBoss(): Promise<PgBoss> {
  if (boss) return boss;

  if (bossInitPromise) {
    return bossInitPromise;
  }

  bossInitPromise = (async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not set");
    }

    const candidate = new PgBoss(connectionString);

    candidate.on("error", (err) => console.error("[pg-boss] Error:", err));

    try {
      await candidate.start();
      boss = candidate;
      console.log("[pg-boss] Started");
      return boss;
    } catch (err) {
      await candidate.stop?.().catch(() => {});
      throw err;
    } finally {
      bossInitPromise = undefined;
    }
  })();

  return bossInitPromise;
}

/**
 * Get the pg-boss instance. Must call initPgBoss() first.
 */
export function getPgBoss(): PgBoss {
  if (!boss) {
    throw new Error("pg-boss not initialized. Call initPgBoss() first.");
  }
  return boss;
}

/**
 * Gracefully stop pg-boss.
 */
export async function stopPgBoss(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true, timeout: 30000 });
    boss = null;
    bossInitPromise = undefined;
  }
}
