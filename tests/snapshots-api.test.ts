import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", async (orig) => {
  const actual = await orig();
  return actual;
});

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import * as SnapshotsRoute from "@/app/api/characters/[id]/snapshots/route";
import * as RestoreRoute from "@/app/api/characters/[id]/snapshots/[snapshotId]/restore/route";

const mockGetCurrentUser = getCurrentUser as unknown as vi.Mock;
const {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
} = db as unknown as {
  select: vi.Mock;
  insert: vi.Mock;
  update: vi.Mock;
};

function buildRequest(url: string, method = "GET", body?: unknown) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined && method !== "GET") {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

describe("snapshot routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetCurrentUser.mockResolvedValue({ userId: "user-123" });
  });

  it("lists snapshots for the current user and character", async () => {
    const rows = [
      {
        id: "snap-1",
        userId: "user-123",
        characterId: "char-1",
        label: "First",
        data: { name: "Sam" },
        createdAt: "2024-01-01T00:00:00.000Z",
        kind: "manual",
      },
    ];

    mockSelect.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          orderBy: async () => rows,
        }),
      }),
    }));

    const res = await SnapshotsRoute.GET(
      buildRequest("http://localhost/api/characters/char-1/snapshots"),
      { params: Promise.resolve({ id: "char-1" }) },
    );

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload).toHaveLength(1);
    expect(payload[0].label).toBe("First");
  });

  it("creates a snapshot with default label when missing", async () => {
    const characterRow = {
      id: "char-1",
      userId: "user-123",
      name: "Sam",
      updatedAt: "2024-01-02T00:00:00.000Z",
    };

    mockSelect
      // character lookup
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => [characterRow],
          }),
        }),
      }));

    mockInsert.mockImplementationOnce(() => ({
      values: () => ({
        returning: async () => [
          {
            id: "snap-2",
            label: "Sam – 1/1 0:00",
            userId: "user-123",
            characterId: "char-1",
            data: { name: "Sam" },
            createdAt: "2024-01-02T00:00:01.000Z",
            kind: "manual",
          },
        ],
      }),
    }));

    const res = await SnapshotsRoute.POST(
      buildRequest("http://localhost/api/characters/char-1/snapshots", "POST", {
        label: "",
      }),
      { params: Promise.resolve({ id: "char-1" }) },
    );

    expect(res.status).toBe(201);
    const payload = await res.json();
    expect(payload.userId).toBe("user-123");
    expect(payload.characterId).toBe("char-1");
  });

  it("restores a snapshot and creates a guard checkpoint", async () => {
    const snapshotRow = {
      id: "snap-1",
      userId: "user-123",
      characterId: "char-1",
      label: "Old state",
      data: { name: "Sam v1", defaultTemperature: 1.2 },
      createdAt: "2024-01-01T00:00:00.000Z",
      kind: "manual",
    };
    const currentCharacter = {
      id: "char-1",
      userId: "user-123",
      name: "Sam v2",
      updatedAt: "2024-02-01T00:00:00.000Z",
    };

    // snapshot fetch
    mockSelect
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => [snapshotRow],
          }),
        }),
      }))
      // character fetch
      .mockImplementationOnce(() => ({
        from: () => ({
          where: () => ({
            limit: () => [currentCharacter],
          }),
        }),
      }));

    // guard insert
    mockInsert.mockImplementationOnce(() => ({
      values: () => ({
        returning: async () => [
          {
            id: "guard-1",
            label: "Auto before restore → Old state",
            data: { name: "Sam v2" },
          },
        ],
      }),
    }));

    // update character
    mockUpdate.mockImplementationOnce(() => ({
      set: () => ({
        where: () => ({
          returning: async () => [
            {
              ...currentCharacter,
              name: "Sam v1",
              defaultTemperature: 1,
            },
          ],
        }),
      }),
    }));

    const res = await RestoreRoute.POST(
      buildRequest("http://localhost/api/characters/char-1/snapshots/snap-1/restore", "POST"),
      { params: Promise.resolve({ id: "char-1", snapshotId: "snap-1" }) },
    );

    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.restoredFrom).toBe("snap-1");
    expect(payload.guardSnapshot.id).toBe("guard-1");
    expect(payload.character.name).toBe("Sam v1");
    expect(payload.character.defaultTemperature).toBe(1);
  });
});
