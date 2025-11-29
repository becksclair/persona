/**
 * Background worker entry point.
 *
 * Run with: pnpm worker:dev (development) or pnpm worker (production)
 *
 * This process listens for and processes background jobs queued via pg-boss.
 * Keep this running alongside the main Next.js dev server.
 */

import { initPgBoss, stopPgBoss } from "./pgboss";
import { registerIndexFileHandler } from "./index-file";

async function startWorker(): Promise<void> {
  console.log("[Worker] Starting background job processor...");

  try {
    // Initialize pg-boss connection
    await initPgBoss();

    // Register all job handlers
    await registerIndexFileHandler();

    console.log("[Worker] Ready and listening for jobs");

    // Keep worker alive
    await new Promise(() => {
      // Never resolves - worker runs until terminated
    });
  } catch (error) {
    console.error("[Worker] Fatal error:", error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
async function shutdown(signal: string): Promise<void> {
  console.log(`[Worker] Received ${signal}, shutting down gracefully...`);

  try {
    await stopPgBoss();
    console.log("[Worker] Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("[Worker] Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start worker if run directly
void startWorker();
