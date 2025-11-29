import { describe, it, expect } from "vitest";
import { characterToSnapshotData } from "@/lib/snapshots";
import { portableToCharacterUpdate } from "@/lib/character-adapter";

describe("snapshot helpers", () => {
  it("captures portable persona fields without internal flags", () => {
    const snapshot = characterToSnapshotData({
      id: "char-1",
      name: "Versioned Sam",
      personality: "Calm and curious",
      tags: ["Work", "Friend"],
      isBuiltIn: true,
      userId: "user-1",
    });

    expect(snapshot.name).toBe("Versioned Sam");
    expect(snapshot.personality).toContain("Calm");
    expect(snapshot.tags).toEqual(["Work", "Friend"]);
    expect((snapshot as Record<string, unknown>).isBuiltIn).toBeUndefined();
  });

  it("clamps temperature and fills boolean defaults when applying snapshot", () => {
    const update = portableToCharacterUpdate({
      name: "Hot Bot",
      defaultTemperature: 1.8,
      nsfwEnabled: undefined,
      evolveEnabled: undefined,
    } as never);

    expect(update.defaultTemperature).toBe(1);
    expect(update.nsfwEnabled).toBe(false);
    expect(update.evolveEnabled).toBe(false);
  });
});
