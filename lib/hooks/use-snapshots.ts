"use client";

import { useCallback, useEffect, useState } from "react";
import { eventBus, Events } from "@/lib/events";
import type { PortableCharacterData } from "@/lib/portable-character";
import type { SnapshotKind } from "@/lib/snapshots";

export interface PersonaSnapshot {
  id: string;
  userId: string;
  characterId: string;
  label: string;
  notes: string | null;
  kind: SnapshotKind;
  data: PortableCharacterData;
  sourceSnapshotId: string | null;
  characterUpdatedAt: string | null;
  createdAt: string;
}

interface UseSnapshotsOptions {
  enabled?: boolean;
}

export function useSnapshots(characterId?: string, options: UseSnapshotsOptions = {}) {
  const { enabled = true } = options;
  const [snapshots, setSnapshots] = useState<PersonaSnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(!!characterId);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshots = useCallback(async () => {
    if (!characterId || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/characters/${characterId}/snapshots`);
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      const data = (await res.json()) as PersonaSnapshot[];
      setSnapshots(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [characterId, enabled]);

  useEffect(() => {
    void fetchSnapshots();
  }, [fetchSnapshots]);

  const createSnapshot = useCallback(
    async (label: string, notes?: string, kind: SnapshotKind = "manual") => {
      if (!characterId) throw new Error("No character selected");
      const res = await fetch(`/api/characters/${characterId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, notes, kind }),
      });
      if (!res.ok) throw new Error("Failed to create snapshot");
      const snapshot = (await res.json()) as PersonaSnapshot;
      setSnapshots((prev) => [snapshot, ...prev]);
      eventBus.emit(Events.SNAPSHOT_CREATED, snapshot);
      return snapshot;
    },
    [characterId],
  );

  const restoreSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!characterId) throw new Error("No character selected");
      const res = await fetch(`/api/characters/${characterId}/snapshots/${snapshotId}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore snapshot");
      const payload = await res.json();
      const restoredSnapshotId = payload.restoredFrom as string;
      if (payload.guardSnapshot) {
        setSnapshots((prev) => [payload.guardSnapshot as PersonaSnapshot, ...prev]);
      }
      if (payload.character) {
        eventBus.emit(Events.CHARACTER_UPDATED, payload.character);
      }
      eventBus.emit(Events.SNAPSHOT_RESTORED, restoredSnapshotId);
      return payload;
    },
    [characterId],
  );

  const deleteSnapshot = useCallback(
    async (snapshotId: string) => {
      if (!characterId) throw new Error("No character selected");
      const res = await fetch(`/api/characters/${characterId}/snapshots/${snapshotId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete snapshot");
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    },
    [characterId],
  );

  return {
    snapshots,
    loading,
    error,
    refetch: fetchSnapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
  };
}
