import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, userSettings, characters } from "../lib/db/schema";
import { DEV_USER_ID, DEV_USER_EMAIL, DEV_USER_PASSWORD } from "../lib/db/constants";
import { hashPassword } from "../lib/auth/password";
import { loadAllBuiltInCharacters } from "../lib/character-loader";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Hash the dev password
  const passwordHash = await hashPassword(DEV_USER_PASSWORD);

  // Upsert dev user with stable ID
  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      passwordHash,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: DEV_USER_EMAIL, passwordHash, updatedAt: new Date() },
    });
  console.log("✓ Upserted dev user:", DEV_USER_EMAIL, "(password: devpass123)");

  // Upsert user settings
  await db
    .insert(userSettings)
    .values({
      userId: DEV_USER_ID,
      enterSendsMessage: true,
      theme: "system",
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { updatedAt: new Date() },
    });
  console.log("✓ Upserted user settings");

  // Load built-in characters (JSON preferred, markdown fallback)
  console.log("\nLoading built-in characters from config/characters/...");
  const builtInCharacters = await loadAllBuiltInCharacters();

  if (builtInCharacters.length === 0) {
    console.warn("⚠ No built-in characters found in config/characters/");
  }

  // Upsert built-in characters (updates on re-run)
  for (const char of builtInCharacters) {
    await db
      .insert(characters)
      .values({
        id: char.id,
        userId: DEV_USER_ID,
        name: char.name,
        tagline: char.tagline,
        systemRole: char.systemRole,
        description: char.description,
        personality: char.personality,
        background: char.background,
        lifeHistory: char.lifeHistory,
        currentContext: char.currentContext,
        toneStyle: char.toneStyle,
        boundaries: char.boundaries,
        roleRules: char.roleRules,
        customInstructionsLocal: char.customInstructionsLocal,
        tags: char.tags,
        archetype: char.archetype,
        defaultModelId: char.defaultModelId,
        defaultTemperature: char.defaultTemperature ?? 0.7,
        nsfwEnabled: char.nsfwEnabled ?? false,
        evolveEnabled: char.evolveEnabled ?? false,
        isBuiltIn: true,
      })
      .onConflictDoUpdate({
        target: characters.id,
        set: {
          name: char.name,
          tagline: char.tagline,
          systemRole: char.systemRole,
          description: char.description,
          personality: char.personality,
          background: char.background,
          lifeHistory: char.lifeHistory,
          currentContext: char.currentContext,
          toneStyle: char.toneStyle,
          boundaries: char.boundaries,
          roleRules: char.roleRules,
          customInstructionsLocal: char.customInstructionsLocal,
          tags: char.tags,
          archetype: char.archetype,
          defaultModelId: char.defaultModelId,
          defaultTemperature: char.defaultTemperature ?? 0.7,
          nsfwEnabled: char.nsfwEnabled ?? false,
          evolveEnabled: char.evolveEnabled ?? false,
          updatedAt: new Date(),
        },
      });
    console.log(`✓ Upserted character: ${char.name}`);
  }

  console.log("\n✅ Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
