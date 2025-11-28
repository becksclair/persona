import { describe, it, expect, vi, beforeEach } from "vitest";
import { CURRENT_SCHEMA_VERSION, type PortableCharacterV1 } from "@/lib/portable-character";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Use real schema to preserve column names in insert payloads
vi.mock("@/lib/db/schema", async (orig) => {
  const actual = await orig();
  return actual;
});

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST } from "@/app/api/characters/import/route";

const mockGetCurrentUser = getCurrentUser as unknown as ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockSelect = db.select as unknown as ReturnType<typeof vi.fn>;
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockInsert = db.insert as unknown as ReturnType<typeof vi.fn>;

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/characters/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function portableCharacter(name: string): PortableCharacterV1 {
  return {
    version: "PortableCharacterV1",
    schemaVersion: 1,
    exportedAt: "2024-01-15T10:30:00.000Z",
    character: { name },
  };
}

function mockConflictsOnce(names: Array<{ name: string } | string>) {
  const rows = names.map((name) => (typeof name === "string" ? { name } : name));
  mockSelect.mockImplementationOnce(() => ({
    from: () => ({
      where: async () => rows,
    }),
  }));
}

const insertedValues: Record<string, unknown>[] = [];

function mockInsertSuccessOnce(id: string) {
  mockInsert.mockImplementationOnce(() => ({
    values: (vals: Record<string, unknown>) => {
      insertedValues.push(vals);
      return {
        returning: async () => [{ ...vals, id }],
      };
    },
  }));
}

function mockInsertFailureOnce(message: string) {
  mockInsert.mockImplementationOnce(() => ({
    values: () => ({
      returning: async () => {
        throw new Error(message);
      },
    }),
  }));
}

describe("characters import API (integration)", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockResolvedValue({ userId: "user-123" });
    mockSelect.mockReset();
    mockInsert.mockReset();
    insertedValues.length = 0;
  });

  it("imports a single portable character when no conflicts exist", async () => {
    mockConflictsOnce([]);
    mockInsertSuccessOnce("char-1");

    const res = await POST(buildRequest(portableCharacter("Calm Bot")));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.batch).toBe(false);
    expect(data.character.name).toBe("Calm Bot");
    expect(insertedValues[0].name).toBe("Calm Bot");
  });

  it("auto-renames when conflicts are present, preferring imported + numeric suffix", async () => {
    mockConflictsOnce([
      "Existing Character",
      "Existing Character (Imported)",
      "Existing Character (2)",
    ]);
    mockInsertSuccessOnce("char-2");

    const res = await POST(buildRequest(portableCharacter("Existing Character")));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.renamed).toBe(true);
    expect(data.originalName).toBe("Existing Character");
    expect(data.character.name).toBe("Existing Character (3)");
    expect(insertedValues[0].name).toBe("Existing Character (3)");
  });

  it("returns batch results and keeps successes when later inserts fail", async () => {
    mockConflictsOnce([]);
    mockInsertSuccessOnce("char-3");
    mockConflictsOnce([]);
    mockInsertFailureOnce("DB unavailable");

    const payload = [portableCharacter("First"), portableCharacter("Second")];
    const res = await POST(buildRequest(payload));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.batch).toBe(true);
    expect(data.total).toBe(2);
    expect(data.imported).toBe(1);
    expect(data.failed).toBe(1);
    expect(data.results[0].success).toBe(true);
    expect(data.results[1].success).toBe(false);
    expect(insertedValues[0].name).toBe("First");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const res = await POST(buildRequest(portableCharacter("Ghost")));

    expect(res.status).toBe(401);
  });

  it("rejects imports with unsupported schemaVersion", async () => {
    const payload = {
      version: "PortableCharacterV1",
      schemaVersion: CURRENT_SCHEMA_VERSION + 5,
      exportedAt: "2024-01-15T10:30:00.000Z",
      character: { name: "Future Bot" },
    };

    const res = await POST(buildRequest(payload));
    expect(res.status).toBe(400);
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
