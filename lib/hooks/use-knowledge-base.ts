"use client";

import { useState, useCallback, useEffect } from "react";

export interface KnowledgeBaseFile {
  id: string;
  userId: string;
  characterId: string | null;
  fileName: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  storagePath: string;
  status: "pending" | "indexing" | "ready" | "failed" | "paused";
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  chunkCount?: number;
}

export interface KnowledgeBaseStats {
  characterId: string;
  characterName: string;
  totalFiles: number;
  readyFiles: number;
  indexingFiles: number;
  failedFiles: number;
  pausedFiles: number;
  totalChunks: number;
  embeddingService: {
    available: boolean;
    provider?: string;
    error?: string;
  };
  config: {
    maxFileSizeBytes: number;
    defaultTopK: number;
    chunkSize: number;
  };
}

export function useKnowledgeBase(characterId: string | null) {
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch files for character
  const fetchFiles = useCallback(async () => {
    if (!characterId) {
      setFiles([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/knowledge-base?characterId=${characterId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch files");
      }
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  // Fetch stats for character
  const fetchStats = useCallback(async () => {
    if (!characterId) {
      setStats(null);
      return;
    }

    try {
      const res = await fetch(`/api/knowledge-base/stats?characterId=${characterId}`);
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch {
      // Silently fail for stats
    }
  }, [characterId]);

  // Upload file
  const uploadFile = useCallback(
    async (file: File, tags?: string[]) => {
      if (!characterId) {
        throw new Error("No character selected");
      }

      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("characterId", characterId);
        if (tags && tags.length > 0) {
          formData.append("tags", tags.join(","));
        }

        const res = await fetch("/api/knowledge-base/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message ?? "Upload failed");
        }

        const data = await res.json();

        // Refresh files list
        await fetchFiles();
        await fetchStats();

        return data.file as KnowledgeBaseFile;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [characterId, fetchFiles, fetchStats],
  );

  // Update file (pause, resume, reindex)
  const updateFile = useCallback(
    async (fileId: string, action: "pause" | "resume" | "reindex", tags?: string[]) => {
      setError(null);

      try {
        const res = await fetch(`/api/knowledge-base/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, tags }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message ?? "Update failed");
        }

        // Refresh files list
        await fetchFiles();
        await fetchStats();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Update failed";
        setError(message);
        throw err;
      }
    },
    [fetchFiles, fetchStats],
  );

  // Delete file
  const deleteFile = useCallback(
    async (fileId: string, hard = false) => {
      setError(null);

      try {
        const res = await fetch(`/api/knowledge-base/${fileId}?hard=${hard}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message ?? "Delete failed");
        }

        // Refresh files list
        await fetchFiles();
        await fetchStats();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Delete failed";
        setError(message);
        throw err;
      }
    },
    [fetchFiles, fetchStats],
  );

  // Fetch on mount and when characterId changes
  useEffect(() => {
    void fetchFiles();
    void fetchStats();
  }, [fetchFiles, fetchStats]);

  return {
    files,
    stats,
    loading,
    uploading,
    error,
    uploadFile,
    updateFile,
    deleteFile,
    refresh: fetchFiles,
  };
}

// Format file size for display
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Get status badge styling
export function getStatusStyle(status: KnowledgeBaseFile["status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "ready":
      return { label: "Ready", className: "bg-emerald-500/20 text-emerald-400" };
    case "indexing":
      return { label: "Indexing", className: "bg-blue-500/20 text-blue-400" };
    case "failed":
      return { label: "Failed", className: "bg-red-500/20 text-red-400" };
    case "paused":
      return { label: "Paused", className: "bg-amber-500/20 text-amber-400" };
    case "pending":
    default:
      return { label: "Pending", className: "bg-gray-500/20 text-gray-400" };
  }
}
