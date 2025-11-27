/**
 * Hardcoded dev user ID for pre-auth development.
 * All queries use this until proper auth is implemented in Phase 1.0.
 *
 * This ID is created by the seed script and matches the dev@persona.local user.
 * Run `pnpm db:seed` to ensure this user exists.
 */
export const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Default email for dev user
 */
export const DEV_USER_EMAIL = "dev@persona.local";

/**
 * Default password for dev user (local development only!)
 */
export const DEV_USER_PASSWORD = "devpass123";

/**
 * Built-in character IDs (stable across seed runs)
 */
export const BUILT_IN_CHARACTER_IDS = {
  SAM: "00000000-0000-0000-0001-000000000001",
  THERAPIST: "00000000-0000-0000-0001-000000000002",
  CODING_GURU: "00000000-0000-0000-0001-000000000003",
  CREATIVE_WRITER: "00000000-0000-0000-0001-000000000004",
  DATA_ANALYST: "00000000-0000-0000-0001-000000000005",
} as const;

/**
 * Default character to use for new chats
 */
export const DEFAULT_CHARACTER_ID = BUILT_IN_CHARACTER_IDS.SAM;
