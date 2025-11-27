import "@testing-library/dom";
import { beforeAll, beforeEach } from "vitest";

// Log database connection on first run
let dbLogged = false;

beforeAll(async () => {
  if (dbLogged) return;
  dbLogged = true;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log(`📦 Test DB: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);
    console.log("💡 Run 'pnpm db:push' first to ensure schema exists");
  }
});

// Reset Zustand store state between tests
beforeEach(() => {
  // Clear localStorage to ensure clean state
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
});
