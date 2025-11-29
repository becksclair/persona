/**
 * Application startup initialization
 * Initializes services that should run once before handling requests
 */

import { initPgBoss } from "./jobs";

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize application services once.
 * Safe to call multiple times - will only initialize once.
 */
export async function initApp(): Promise<void> {
  if (initialized) return;

  if (!initPromise) {
    initPromise = performInit();
  }

  await initPromise;
}

async function performInit(): Promise<void> {
  try {
    // Initialize PgBoss for job queue functionality
    await initPgBoss();

    initialized = true;
    console.log("[startup] Application services initialized successfully");
  } catch (error) {
    console.error("[startup] Failed to initialize application services:", error);
    throw error;
  }
}

/**
 * Check if the application has been initialized
 */
export function isAppInitialized(): boolean {
  return initialized;
}
