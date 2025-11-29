"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { eventBus, Events } from "@/lib/events";
import { type ConversationRagOverrides } from "@/lib/types";

export interface Conversation {
  id: string;
  title: string | null;
  characterId: string | null;
  characterName: string | null;
  characterAvatar: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
  lastMessageRole: string | null;
  ragOverrides?: ConversationRagOverrides | null;
}

interface UseConversationsOptions {
  /** Include archived conversations in the list */
  includeArchived?: boolean;
  /** Only fetch when enabled (for lazy loading) */
  enabled?: boolean;
}

export function useConversations(options: UseConversationsOptions | boolean = {}) {
  // Support legacy boolean signature
  const opts = typeof options === "boolean" ? { includeArchived: options } : options;
  const { includeArchived = false, enabled = true } = opts;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (includeArchived) params.set("archived", "true");

      const res = await fetch(`/api/conversations?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch conversations");

      const data: Conversation[] = await res.json();
      setConversations(data);
      setError(null);
      hasFetched.current = true;
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

    void fetchConversations();

    // Subscribe to conversation events for cross-component sync
    const unsubCreated = eventBus.on<Conversation>(Events.CONVERSATION_CREATED, (conv) => {
      if (conv) setConversations((prev) => [conv, ...prev]);
    });
    const unsubUpdated = eventBus.on<Conversation>(Events.CONVERSATION_UPDATED, (conv) => {
      if (conv) setConversations((prev) => prev.map((c) => (c.id === conv.id ? conv : c)));
    });
    const unsubDeleted = eventBus.on<string>(Events.CONVERSATION_DELETED, (id) => {
      if (id) setConversations((prev) => prev.filter((c) => c.id !== id));
    });
    const unsubChanged = eventBus.on(Events.CONVERSATIONS_CHANGED, () => {
      void fetchConversations();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubChanged();
    };
  }, [fetchConversations, enabled]);

  const createConversation = useCallback(
    async (
      payload?: { characterId?: string; title?: string; ragOverrides?: ConversationRagOverrides | null },
    ) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });

      if (!res.ok) throw new Error("Failed to create conversation");
      const newConv: Conversation = await res.json();
      const convWithDefaults = { ...newConv, lastMessage: null, lastMessageRole: null };

      // Broadcast to all listeners (including this component)
      eventBus.emit(Events.CONVERSATION_CREATED, convWithDefaults);
      return newConv;
    },
    [],
  );

  const updateConversation = useCallback(
    async (
      id: string,
      updates: {
        title?: string;
        isArchived?: boolean;
        characterId?: string;
        ragOverrides?: ConversationRagOverrides | null;
      },
    ) => {
      // Optimistic update
      const prevConvs = [...conversations];
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));

      try {
        const res = await fetch(`/api/conversations/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          // Rollback on error
          setConversations(prevConvs);
          throw new Error("Failed to update conversation");
        }

        const updated = await res.json();
        // Broadcast update (will sync state in other components)
        eventBus.emit(Events.CONVERSATION_UPDATED, {
          ...prevConvs.find((c) => c.id === id),
          ...updated,
        });
        return updated;
      } catch (err) {
        setConversations(prevConvs);
        throw err;
      }
    },
    [conversations],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      // Optimistic delete
      const prevConvs = [...conversations];
      setConversations((prev) => prev.filter((c) => c.id !== id));

      try {
        const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
        if (!res.ok) {
          setConversations(prevConvs);
          throw new Error("Failed to delete conversation");
        }
        eventBus.emit(Events.CONVERSATION_DELETED, id);
      } catch (err) {
        setConversations(prevConvs);
        throw err;
      }
    },
    [conversations],
  );

  const archiveConversation = useCallback(
    async (id: string) => {
      return updateConversation(id, { isArchived: true });
    },
    [updateConversation],
  );

  const unarchiveConversation = useCallback(
    async (id: string) => {
      return updateConversation(id, { isArchived: false });
    },
    [updateConversation],
  );

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    createConversation,
    updateConversation,
    deleteConversation,
    archiveConversation,
    unarchiveConversation,
  };
}
