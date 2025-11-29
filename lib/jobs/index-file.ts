import type { Job } from "pg-boss";
import { getPgBoss } from "./pgboss";
import { indexFile } from "@/lib/rag/indexing";

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const DEFAULT_JOB_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export interface IndexFilePayload {
  fileId: string;
  userId: string;
}

export const INDEX_FILE_QUEUE = "index-file";

// ─────────────────────────────────────────────────────────────
// Enqueue Function (called from API routes)
// ─────────────────────────────────────────────────────────────

/**
 * Enqueue a file indexing job.
 * Returns the job ID for tracking, or null if enqueue failed.
 */
export async function enqueueIndexFile(
  fileId: string,
  userId: string,
  options?: { priority?: number },
): Promise<string | null> {
  const boss = getPgBoss();

  try {
    const jobId = await boss.send(
      INDEX_FILE_QUEUE,
      { fileId, userId } satisfies IndexFilePayload,
      {
        // Higher priority = processed first (default: 0)
        priority: options?.priority ?? 0,
        // Retry up to 3 times with 30s delay between attempts
        retryLimit: 3,
        retryDelay: 30,
        // Job expires after 1 hour if not picked up
        expireInSeconds: 60 * 60,
      },
    );

    if (jobId) {
      console.log(`[index-file] Enqueued job ${jobId} for file ${fileId}`);
    }

    return jobId;
  } catch (error) {
    console.error(`[index-file] Failed to enqueue job for file ${fileId}, user ${userId}:`, error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Job Handler (called by worker)
// ─────────────────────────────────────────────────────────────

/**
 * Process an index-file job.
 * Called by the worker when a job is dequeued.
 */
export async function handleIndexFile(
  job: Job<IndexFilePayload>,
  signal?: AbortSignal,
): Promise<void> {
  const { fileId, userId } = job.data;

  console.log(`[index-file] Processing job ${job.id} for file ${fileId} (user: ${userId})`);

  try {
    const result = await indexFile(fileId, signal);

    if (result.success) {
      console.log(
        `[index-file] Job ${job.id} completed: ${result.chunksCreated} chunks created`,
      );
    } else {
      // Throw to trigger retry
      throw new Error(result.error ?? "Indexing failed");
    }
  } catch (error) {
    console.error(`[index-file] Job ${job.id} failed:`, error);
    throw error; // pg-boss will retry based on retryLimit
  }
}

// ─────────────────────────────────────────────────────────────
// Worker Registration
// ─────────────────────────────────────────────────────────────

/**
 * Register the index-file handler with pg-boss.
 * Call this from the worker entry point.
 */
export async function registerIndexFileHandler(): Promise<void> {
  const boss = getPgBoss();

  // pg-boss v12: work() returns jobs as array
  await boss.work(
    INDEX_FILE_QUEUE,
    {
      // Process one job at a time
      batchSize: 1,
      // Poll every 2 seconds for new jobs
      pollingIntervalSeconds: 2,
    },
    async (jobs: Job<IndexFilePayload>[]) => {
      for (const job of jobs) {
        const abortController = new AbortController();

        try {
          // Race between job completion and timeout
          await Promise.race([
            handleIndexFile(job, abortController.signal),
            new Promise<never>((_, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error(`Job ${job.id} timed out after ${DEFAULT_JOB_TIMEOUT_MS}ms`));
              }, DEFAULT_JOB_TIMEOUT_MS);

              // Clear timeout on cleanup
              abortController.signal.addEventListener('abort', () => {
                clearTimeout(timeoutId);
              });
            }),
          ]);

          // Clear timeout on success
          abortController.abort();
        } catch (error) {
          // Clear timeout on error
          abortController.abort();

          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[index-file] Job ${job.id} failed:`, errorMessage);

          // Mark job as failed so pg-boss doesn't retry on timeout
          if (errorMessage.includes('timed out')) {
            console.error(`[index-file] Job ${job.id} timed out, marking as failed`);
            // Don't re-throw on timeout - let the worker continue
            continue;
          }

          // Re-throw other errors to trigger retry
          throw error;
        }
      }
    },
  );

  console.log(`[index-file] Handler registered for queue: ${INDEX_FILE_QUEUE}`);
}
