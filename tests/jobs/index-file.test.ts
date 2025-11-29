// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Job } from "pg-boss";

import * as PgBossModule from "@/lib/jobs/pgboss";
import * as IndexingModule from "@/lib/rag/indexing";
import {
  enqueueIndexFile,
  handleIndexFile,
  registerIndexFileHandler,
  INDEX_FILE_QUEUE,
  type IndexFilePayload,
} from "@/lib/jobs/index-file";

type MockFn = ReturnType<typeof vi.fn>;

type MockBoss = {
  send: MockFn;
  work: MockFn;
};

describe("index-file jobs (pg-boss integration)", () => {
  let boss: MockBoss;

  beforeEach(() => {
    boss = {
      send: vi.fn(),
      work: vi.fn(),
    };

    vi
      .spyOn(PgBossModule, "getPgBoss")
      .mockReturnValue(boss as unknown as ReturnType<typeof PgBossModule.getPgBoss>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("enqueueIndexFile", () => {
    it("sends job to index-file queue with correct payload and options", async () => {
      boss.send.mockResolvedValueOnce("job-123");

      const jobId = await enqueueIndexFile("file-1", "user-1", { priority: 5 });

      expect(boss.send).toHaveBeenCalledTimes(1);
      const [queue, payload, options] = boss.send.mock.calls[0];

      expect(queue).toBe(INDEX_FILE_QUEUE);
      expect(payload).toEqual({ fileId: "file-1", userId: "user-1" });
      expect(options).toMatchObject({
        priority: 5,
        retryLimit: 3,
        retryDelay: 30,
        expireInSeconds: 60 * 60,
      });

      expect(jobId).toBe("job-123");
    });

    it("uses default priority when not provided", async () => {
      boss.send.mockResolvedValueOnce("job-999");

      await enqueueIndexFile("file-2", "user-2");

      const [, , options] = boss.send.mock.calls[0];
      expect(options.priority).toBe(0);
    });
  });

  describe("handleIndexFile", () => {
    it("calls indexFile and completes on success", async () => {
      const indexSpy = vi
        .spyOn(IndexingModule, "indexFile")
        .mockResolvedValueOnce({ fileId: "file-1", success: true, chunksCreated: 3, totalChunks: 3 });

      const job: Job<IndexFilePayload> = {
        id: "j1",
        name: INDEX_FILE_QUEUE,
        data: { fileId: "file-1", userId: "user-1" },
      } as Job<IndexFilePayload>;

      await expect(handleIndexFile(job)).resolves.toBeUndefined();
      expect(indexSpy).toHaveBeenCalledWith("file-1", undefined);
    });

    it("throws when indexing fails so pg-boss can retry", async () => {
      vi.spyOn(IndexingModule, "indexFile").mockResolvedValueOnce({
        fileId: "file-1",
        success: false,
        chunksCreated: 0,
        totalChunks: 0,
        error: "boom",
      });

      const job: Job<IndexFilePayload> = {
        id: "j2",
        name: INDEX_FILE_QUEUE,
        data: { fileId: "file-1", userId: "user-1" },
      } as Job<IndexFilePayload>;

      await expect(handleIndexFile(job)).rejects.toThrow(/boom|Indexing failed/);
    });
  });

  describe("registerIndexFileHandler", () => {
    it("registers work handler with correct queue and options", async () => {
      const workHandlerCalls: Job<IndexFilePayload>[][] = [];

      boss.work.mockImplementation(
        async (
          queue: string,
          options: { batchSize: number; pollingIntervalSeconds: number },
          handler: (jobs: Job<IndexFilePayload>[]) => Promise<void>,
        ) => {
          expect(queue).toBe(INDEX_FILE_QUEUE);
          expect(options).toMatchObject({ batchSize: 1, pollingIntervalSeconds: 2 });

          const jobs: Job<IndexFilePayload>[] = [
            { id: "a", name: INDEX_FILE_QUEUE, data: { fileId: "file-a", userId: "u1" } } as Job<IndexFilePayload>,
            { id: "b", name: INDEX_FILE_QUEUE, data: { fileId: "file-b", userId: "u1" } } as Job<IndexFilePayload>,
          ];

          workHandlerCalls.push(jobs);
          await handler(jobs);
        },
      );

      const indexSpy = vi
        .spyOn(IndexingModule, "indexFile")
        .mockResolvedValue({ fileId: "file-a", success: true, chunksCreated: 1, totalChunks: 1 });

      await registerIndexFileHandler();

      // Ensure boss.work was called once
      expect(boss.work).toHaveBeenCalledTimes(1);
      // Handler should have been invoked with our jobs
      expect(workHandlerCalls).toHaveLength(1);
      expect(workHandlerCalls[0]).toHaveLength(2);

      // indexFile should be called for each job in the batch
      expect(indexSpy).toHaveBeenCalledWith("file-a", expect.any(AbortSignal));
      expect(indexSpy).toHaveBeenCalledWith("file-b", expect.any(AbortSignal));
    });
  });
});
