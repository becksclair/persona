// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", async (orig: () => Promise<unknown>) => {
  const actual = await orig();
  return actual;
});

vi.mock("@/lib/rag/chunking", () => ({
  processFileForIndexing: vi.fn(),
}));

vi.mock("@/lib/rag/embedding", () => ({
  checkEmbeddingAvailability: vi.fn(),
  generateEmbedding: vi.fn(),
}));

import { db } from "@/lib/db";
import { processFileForIndexing } from "@/lib/rag/chunking";
import { checkEmbeddingAvailability, generateEmbedding } from "@/lib/rag/embedding";
import { indexFile } from "@/lib/rag/indexing";

type MockFn = ReturnType<typeof vi.fn>;

const { select: mockSelect, update: mockUpdate, transaction: mockTransaction } = db as unknown as {
  select: MockFn;
  update: MockFn;
  transaction: MockFn;
};

const mockProcessFileForIndexing = processFileForIndexing as unknown as MockFn;
const mockCheckEmbeddingAvailability = checkEmbeddingAvailability as unknown as MockFn;
const mockGenerateEmbedding = generateEmbedding as unknown as MockFn;

type FakeFileRow = {
  id: string;
  userId: string;
  characterId: string | null;
  storagePath: string;
  fileType: string | null;
  tags: string[] | null;
};

describe("indexFile (unit, mocked DB/embedding)", () => {
  let file: FakeFileRow;
  let statuses: Array<{ status: string }>;
  let insertedItems: Array<Record<string, unknown>>;

  beforeEach(() => {
    vi.resetAllMocks();

    file = {
      id: "file-1",
      userId: "user-1",
      characterId: null,
      storagePath: "/tmp/file-1.txt",
      fileType: "text/plain",
      tags: ["Work"],
    };

    statuses = [];
    insertedItems = [];

    // Default: embedding available
    mockCheckEmbeddingAvailability.mockResolvedValue({ available: true });

    // Default: select returns our file row
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([file]),
        }),
      }),
    }));

    // Track status updates
    mockUpdate.mockImplementation(() => ({
      set: (vals: { status?: string }) => {
        if (vals.status) {
          statuses.push({ status: vals.status });
        }
        return {
          where: () => Promise.resolve(),
        };
      },
    }));

    // Transaction: simulate delete + insert into memory_items
    mockTransaction.mockImplementation(async (cb: (tx: {
      delete: () => { where: () => Promise<void> };
      insert: () => { values: (vals: Record<string, unknown>) => Promise<void> };
    }) => Promise<void>) => {
      const tx = {
        delete: () => ({
          where: () => {
            // Simulate clearing previous items when re-indexing
            insertedItems.length = 0;
            return Promise.resolve();
          },
        }),
        insert: () => ({
          values: (vals: Record<string, unknown>) => {
            insertedItems.push(vals);
            return Promise.resolve();
          },
        }),
      };

      await cb(tx);
    });
  });

  it("fails fast when embedding service is unavailable", async () => {
    mockCheckEmbeddingAvailability.mockResolvedValueOnce({
      available: false,
      error: "offline",
    });

    const result = await indexFile("file-1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Embedding service unavailable");
    expect(result.chunksCreated).toBe(0);
    expect(result.totalChunks).toBe(0);

    // Status should be set to failed
    expect(statuses.some((s) => s.status === "failed")).toBe(true);
    // No transaction or inserts should run
    expect(insertedItems.length).toBe(0);
  });

  it("indexes file successfully with embedded chunks", async () => {
    mockProcessFileForIndexing.mockResolvedValueOnce([
      { index: 0, content: "Chunk A", metadata: { startChar: 0, endChar: 10 } },
      { index: 1, content: "Chunk B", metadata: { startChar: 11, endChar: 20 } },
      { index: 2, content: "Chunk C", metadata: { startChar: 21, endChar: 30 } },
    ]);

    mockGenerateEmbedding.mockImplementation(async (text: string) => ({
      embedding: [text.length, 1, 2],
      provider: "mock",
      model: "mock-model",
      dimensions: 3,
    }));

    const result = await indexFile("file-1");

    expect(result.success).toBe(true);
    expect(result.totalChunks).toBe(3);
    expect(result.chunksCreated).toBe(3);

    // Status transitions: indexing -> ready
    expect(statuses[0]?.status).toBe("indexing");
    expect(statuses[statuses.length - 1]?.status).toBe("ready");

    // Memory items inserted for each chunk
    expect(insertedItems.length).toBe(3);
    insertedItems.forEach((item, i) => {
      expect(item.sourceId).toBe("file-1");
      expect(item.content).toBe(["Chunk A", "Chunk B", "Chunk C"][i]);
      expect(item.tags).toEqual(["Work"]);
    });
  });

  it("succeeds when some chunks fail to embed", async () => {
    mockProcessFileForIndexing.mockResolvedValueOnce([
      { index: 0, content: "Ok 1", metadata: {} },
      { index: 1, content: "Bad", metadata: {} },
      { index: 2, content: "Ok 2", metadata: {} },
    ]);

    mockGenerateEmbedding.mockImplementation(async (text: string) => {
      if (text === "Bad") {
        throw new Error("Embedding failed");
      }
      return {
        embedding: [42],
        provider: "mock",
        model: "mock-model",
        dimensions: 1,
      };
    });

    const result = await indexFile("file-1");

    expect(result.success).toBe(true);
    expect(result.totalChunks).toBe(3);
    expect(result.chunksCreated).toBe(2);
    expect(insertedItems.length).toBe(2);
  });

  it("fails when all chunks fail to embed", async () => {
    mockProcessFileForIndexing.mockResolvedValueOnce([
      { index: 0, content: "X", metadata: {} },
      { index: 1, content: "Y", metadata: {} },
    ]);

    mockGenerateEmbedding.mockImplementation(async () => {
      throw new Error("always fails");
    });

    const result = await indexFile("file-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("All chunks failed to embed");
    expect(result.chunksCreated).toBe(0);
    expect(result.totalChunks).toBe(2);

    // Status should end as failed
    expect(statuses[statuses.length - 1]?.status).toBe("failed");
    expect(insertedItems.length).toBe(0);
  });

  it("deletes existing memory items when re-indexing", async () => {
    mockProcessFileForIndexing.mockResolvedValue([
      { index: 0, content: "First", metadata: {} },
      { index: 1, content: "Second", metadata: {} },
    ]);

    mockGenerateEmbedding.mockResolvedValue({
      embedding: [1, 2, 3],
      provider: "mock",
      model: "mock-model",
      dimensions: 3,
    });

    // First indexing run
    const first = await indexFile("file-1");
    expect(first.success).toBe(true);
    expect(insertedItems.length).toBe(2);

    // Simulate some prior items existing
    insertedItems.push({ content: "old" });

    // Second indexing run should clear old items via delete
    const second = await indexFile("file-1");
    expect(second.success).toBe(true);
    expect(insertedItems.length).toBe(2);
  });
});
