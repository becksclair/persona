import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, userSettings, characters } from "../lib/db/schema";
import { DEV_USER_ID, DEV_USER_EMAIL } from "../lib/db/constants";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// Simple password hash for dev user (NOT for production!)
const DEV_PASSWORD_HASH = "dev_placeholder_hash";

// Built-in characters with stable IDs for idempotent seeding
const BUILT_IN_CHARACTERS = [
  {
    id: "00000000-0000-0000-0001-000000000001",
    name: "Sam (Friend)",
    tagline: "A supportive and friendly companion",
    systemRole: "friendly companion",
    description: "A supportive and friendly companion for daily conversations and brainstorming.",
    personality:
      "Warm, encouraging, and great at brainstorming. Uses casual language and occasional emojis.",
    toneStyle: "Friendly, casual",
  },
  {
    id: "00000000-0000-0000-0001-000000000002",
    name: "Therapist",
    tagline: "A calm, empathetic listener",
    systemRole: "compassionate therapist",
    description: "A calm, empathetic listener who helps you process thoughts and emotions.",
    personality:
      "Compassionate and non-judgmental. Uses techniques from CBT and mindfulness. Asks thoughtful questions.",
    toneStyle: "Professional, warm",
  },
  {
    id: "00000000-0000-0000-0001-000000000003",
    name: "Coding Guru",
    tagline: "An expert programmer",
    systemRole: "senior software engineer",
    description: "An expert programmer who helps debug, explain, and write code.",
    personality:
      "Knowledgeable across multiple languages and frameworks. Provides clear code examples and follows best practices.",
    toneStyle: "Expert, concise",
  },
  {
    id: "00000000-0000-0000-0001-000000000004",
    name: "Creative Writer",
    tagline: "A creative storyteller",
    systemRole: "creative writer",
    description: "A creative storyteller who helps with writing, editing, and ideation.",
    personality: "Imaginative and inspiring. Helps craft compelling narratives and develop characters.",
    toneStyle: "Creative, expressive",
  },
  {
    id: "00000000-0000-0000-0001-000000000005",
    name: "Data Analyst",
    tagline: "An analytical mind",
    systemRole: "data analyst",
    description: "An analytical mind that helps interpret data and derive insights.",
    personality: "Precise, methodical, and data-driven. Helps create visualizations and derive actionable insights.",
    toneStyle: "Analytical, clear",
  },
];

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Upsert dev user with stable ID
  await db
    .insert(users)
    .values({
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      passwordHash: DEV_PASSWORD_HASH,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: DEV_USER_EMAIL, updatedAt: new Date() },
    });
  console.log("✓ Upserted dev user:", DEV_USER_EMAIL);

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

  // Upsert built-in characters (updates on re-run)
  for (const char of BUILT_IN_CHARACTERS) {
    await db
      .insert(characters)
      .values({
        ...char,
        userId: DEV_USER_ID,
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
          toneStyle: char.toneStyle,
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
