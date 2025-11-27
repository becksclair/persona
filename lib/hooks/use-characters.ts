"use client";

import { useState, useEffect, useCallback } from "react";
import { eventBus, Events } from "@/lib/events";

export interface Character {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  tagline: string | null;
  systemRole: string | null;
  description: string | null;
  personality: string | null;
  background: string | null;
  lifeHistory: string | null;
  currentContext: string | null;
  toneStyle: string | null;
  boundaries: string | null;
  roleRules: string | null;
  customInstructionsLocal: string | null;
  tags: string[] | null;
  archetype: string | null;
  defaultModelId: string | null;
  defaultTemperature: number | null;
  maxContextWindow: number | null;
  evolveEnabled: boolean;
  nsfwEnabled: boolean;
  isBuiltIn: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseCharactersOptions {
  /** Include archived characters in the list */
  includeArchived?: boolean;
  /** Only fetch when enabled (for lazy loading) */
  enabled?: boolean;
}

export function useCharacters(options: UseCharactersOptions | boolean = {}) {
  // Support legacy boolean signature
  const opts = typeof options === "boolean" ? { includeArchived: options } : options;
  const { includeArchived = false, enabled = true } = opts;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCharacters = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (includeArchived) params.set("archived", "true");

      const res = await fetch(`/api/characters?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch characters");

      const data = await res.json();
      setCharacters(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [includeArchived, enabled]);

  // Initial fetch and event subscription
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void fetchCharacters();

    // Subscribe to character events for cross-component sync
    const unsubCreated = eventBus.on<Character>(Events.CHARACTER_CREATED, (char) => {
      if (char) setCharacters((prev) => [char, ...prev]);
    });
    const unsubUpdated = eventBus.on<Character>(Events.CHARACTER_UPDATED, (char) => {
      if (char) setCharacters((prev) => prev.map((c) => (c.id === char.id ? char : c)));
    });
    const unsubDeleted = eventBus.on<string>(Events.CHARACTER_DELETED, (id) => {
      if (id) setCharacters((prev) => prev.filter((c) => c.id !== id));
    });
    const unsubChanged = eventBus.on(Events.CHARACTERS_CHANGED, () => {
      void fetchCharacters();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubChanged();
    };
  }, [fetchCharacters, enabled]);

  const createCharacter = useCallback(
    async (data: Partial<Character>) => {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create character");
      const newChar = await res.json();
      eventBus.emit(Events.CHARACTER_CREATED, newChar);
      return newChar;
    },
    []
  );

  const updateCharacter = useCallback(
    async (id: string, updates: Partial<Character>) => {
      // Optimistic update
      const prevChars = [...characters];
      setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

      try {
        const res = await fetch(`/api/characters/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          setCharacters(prevChars);
          throw new Error("Failed to update character");
        }

        const updated = await res.json();
        eventBus.emit(Events.CHARACTER_UPDATED, updated);
        return updated;
      } catch (err) {
        setCharacters(prevChars);
        throw err;
      }
    },
    [characters]
  );

  const deleteCharacter = useCallback(async (id: string) => {
    // Optimistic delete
    const prevChars = [...characters];
    setCharacters((prev) => prev.filter((c) => c.id !== id));

    try {
      const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setCharacters(prevChars);
        throw new Error("Failed to delete character");
      }
      eventBus.emit(Events.CHARACTER_DELETED, id);
    } catch (err) {
      setCharacters(prevChars);
      throw err;
    }
  }, [characters]);

  const duplicateCharacter = useCallback(async (id: string) => {
    const res = await fetch(`/api/characters/${id}/duplicate`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to duplicate character");
    const duplicate = await res.json();
    eventBus.emit(Events.CHARACTER_CREATED, duplicate);
    return duplicate;
  }, []);

  const archiveCharacter = useCallback(
    async (id: string) => {
      return updateCharacter(id, { isArchived: true });
    },
    [updateCharacter]
  );

  return {
    characters,
    loading,
    error,
    refetch: fetchCharacters,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    duplicateCharacter,
    archiveCharacter,
  };
}
