// @vitest-environment node
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

// Preserve real schema types/columns
vi.mock("@/lib/db/schema", async (orig) => {
  const actual = await orig();
  return actual;
});

vi.mock("@/lib/rag", () => ({
  FileStorage: {
    store: vi.fn(),
  },
  getMimeType: vi.fn(() => "text/plain"),
  RAGConfigSvc: {
    getMaxFileSizeBytes: vi.fn(() => 10 * 1024 * 1024),
    formatFileSize: vi.fn((bytes: number) => `${bytes} B`),
  },
}));

vi.mock("@/lib/jobs", () => ({
  initPgBoss: vi.fn(),
  getPgBoss: vi.fn(() => ({ send: vi.fn() })),
  enqueueIndexFile: vi.fn(async () => "job-123"),
}));

vi.mock("@/lib/startup", () => ({
  initApp: vi.fn(),
}));

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { FileStorage, RAGConfigSvc, getMimeType } from "@/lib/rag";
import { enqueueIndexFile } from "@/lib/jobs";
import { initApp } from "@/lib/startup";
import * as UploadRoute from "@/app/api/knowledge-base/upload/route";

type MockFn = ReturnType<typeof vi.fn>;

const mockGetCurrentUser = getCurrentUser as unknown as MockFn;
const { select: mockSelect, insert: mockInsert } = db as unknown as {
  select: MockFn;
  insert: MockFn;
};

const mockFileStorage = FileStorage as unknown as {
  store: MockFn;
};

const mockRAGConfigSvc = RAGConfigSvc as unknown as {
  getMaxFileSizeBytes: MockFn;
  formatFileSize: MockFn;
};

const mockGetMimeType = getMimeType as unknown as MockFn;
const mockEnqueueIndexFile = enqueueIndexFile as unknown as MockFn;
const mockInitApp = initApp as unknown as MockFn;

function buildMultipartRequest(form: Record<string, File | string | null>) {
  // We call POST with a minimal object that only implements formData()
  const fd = new FormData();
  for (const [key, value] of Object.entries(form)) {
    if (value == null) continue;
    fd.append(key, value);
  }

  const fakeRequest = {
    formData: async () => fd,
  } as unknown as Request;

  return fakeRequest;
}

function makeFile(name: string, sizeBytes: number): File {
  const blob = new Blob(["x".repeat(sizeBytes)], { type: "text/plain" });
  return new File([blob], name, { type: "text/plain" });
}

describe("KB upload route /api/knowledge-base/upload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetCurrentUser.mockResolvedValue({ userId: "user-123" });
    mockRAGConfigSvc.getMaxFileSizeBytes.mockReturnValue(10 * 1024 * 1024);
    mockRAGConfigSvc.formatFileSize.mockImplementation((bytes: number) => `${bytes} B`);
    mockGetMimeType.mockReturnValue("text/plain");
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const file = makeFile("doc.txt", 100);
    const req = buildMultipartRequest({ file, characterId: "char-1" });

    const res = await UploadRoute.POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects when file is missing", async () => {
    const req = buildMultipartRequest({ characterId: "char-1" });

    const res = await UploadRoute.POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/No file provided/i);
  });

  it("rejects when characterId is missing", async () => {
    const file = makeFile("doc.txt", 100);
    const req = buildMultipartRequest({ file, characterId: null });

    const res = await UploadRoute.POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/characterId is required/i);
  });

  it("enforces max file size from RAG config", async () => {
    mockRAGConfigSvc.getMaxFileSizeBytes.mockReturnValueOnce(100);
    mockRAGConfigSvc.formatFileSize.mockReturnValueOnce("100 B");

    const file = makeFile("big.txt", 200);
    const req = buildMultipartRequest({ file, characterId: "char-1" });

    const res = await UploadRoute.POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("100 B");
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockFileStorage.store).not.toHaveBeenCalled();
  });

  it("returns 404 when character does not belong to user", async () => {
    // Character lookup returns empty array
    mockSelect.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    }));

    const file = makeFile("doc.txt", 100);
    const req = buildMultipartRequest({ file, characterId: "char-unknown" });

    const res = await UploadRoute.POST(req);
    expect(res.status).toBe(404);
  });

  it("stores file, creates KB record, and enqueues indexing job", async () => {
    // Character ownership check succeeds
    mockSelect.mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: () => [
            {
              id: "char-1",
              userId: "user-123",
            },
          ],
        }),
      }),
    }));

    // File storage result
    mockFileStorage.store.mockResolvedValueOnce({
      path: "/data/knowledge-base/user-123/char-1/file-1-doc.txt",
      originalName: "doc.txt",
      mimeType: "text/plain",
      sizeBytes: 123,
    });

    // Insert KB file
    mockInsert.mockImplementationOnce(() => ({
      values: (vals: Record<string, unknown>) => ({
        returning: async () => [
          {
            id: "kb-1",
            ...vals,
          },
        ],
      }),
    }));

    const file = makeFile("doc.txt", 123);
    const req = buildMultipartRequest({ file, characterId: "char-1", tags: "Work, Code" });

    const res = await UploadRoute.POST(req);

    expect(res.status).toBe(202);
    const body = await res.json();

    // File record
    expect(body.file.id).toBe("kb-1");
    expect(body.file.userId).toBe("user-123");
    expect(body.file.characterId).toBe("char-1");
    expect(body.file.fileName).toBe("doc.txt");
    expect(body.file.fileSizeBytes).toBe(123);
    expect(body.file.tags).toEqual(["Work", "Code"]);

    // Storage called with correct args
    expect(mockFileStorage.store).toHaveBeenCalledWith("user-123", "char-1", file, "doc.txt");

    // Jobs integration
    expect(mockInitApp).toHaveBeenCalledTimes(1);
    expect(mockEnqueueIndexFile).toHaveBeenCalledWith("kb-1", "user-123");
    expect(body.jobId).toBe("job-123");
  });

  it("handles unexpected errors with 500 response", async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error("DB down");
    });

    const file = makeFile("doc.txt", 100);
    const req = buildMultipartRequest({ file, characterId: "char-1" });

    const res = await UploadRoute.POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toMatch(/Failed to upload file/i);
  });
});
