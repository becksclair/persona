"use client";

import { useState, useEffect, useCallback } from "react";
import { eventBus, Events } from "@/lib/events";

export interface CharacterTemplate {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  description: string | null;
  tagline: string | null;
  personality: string | null;
  toneStyle: string | null;
  boundaries: string | null;
  roleRules: string | null;
  background: string | null;
  lifeHistory: string | null;
  currentContext: string | null;
  customInstructionsLocal: string | null;
  tags: string[] | null;
  defaultModelId: string | null;
  defaultTemperature: number | null;
  nsfwEnabled: boolean;
  evolveEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseTemplatesOptions {
  enabled?: boolean;
}

export function useTemplates(options: UseTemplatesOptions = {}) {
  const { enabled = true } = options;

  const [templates, setTemplates] = useState<CharacterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");

      const data = await res.json();
      setTemplates(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // Initial fetch and event subscription
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void fetchTemplates();

    // Subscribe to template events for cross-component sync
    const unsubCreated = eventBus.on<CharacterTemplate>(Events.TEMPLATE_CREATED, (tmpl) => {
      if (tmpl) setTemplates((prev) => [tmpl, ...prev]);
    });
    const unsubUpdated = eventBus.on<CharacterTemplate>(Events.TEMPLATE_UPDATED, (tmpl) => {
      if (tmpl) setTemplates((prev) => prev.map((t) => (t.id === tmpl.id ? tmpl : t)));
    });
    const unsubDeleted = eventBus.on<string>(Events.TEMPLATE_DELETED, (id) => {
      if (id) setTemplates((prev) => prev.filter((t) => t.id !== id));
    });
    const unsubChanged = eventBus.on(Events.TEMPLATES_CHANGED, () => {
      void fetchTemplates();
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubChanged();
    };
  }, [fetchTemplates, enabled]);

  const createTemplate = useCallback(
    async (data: Partial<CharacterTemplate> & { fromCharacterId?: string }) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create template");
      const newTemplate = await res.json();
      eventBus.emit(Events.TEMPLATE_CREATED, newTemplate);
      return newTemplate;
    },
    []
  );

  const createTemplateFromCharacter = useCallback(
    async (characterId: string, name: string, icon?: string) => {
      return createTemplate({ fromCharacterId: characterId, name, icon });
    },
    [createTemplate]
  );

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<CharacterTemplate>) => {
      const prevTemplates = [...templates];
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

      try {
        const res = await fetch(`/api/templates/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!res.ok) {
          setTemplates(prevTemplates);
          throw new Error("Failed to update template");
        }

        const updated = await res.json();
        eventBus.emit(Events.TEMPLATE_UPDATED, updated);
        return updated;
      } catch (err) {
        setTemplates(prevTemplates);
        throw err;
      }
    },
    [templates]
  );

  const deleteTemplate = useCallback(
    async (id: string) => {
      const prevTemplates = [...templates];
      setTemplates((prev) => prev.filter((t) => t.id !== id));

      try {
        const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
        if (!res.ok) {
          setTemplates(prevTemplates);
          throw new Error("Failed to delete template");
        }
        eventBus.emit(Events.TEMPLATE_DELETED, id);
      } catch (err) {
        setTemplates(prevTemplates);
        throw err;
      }
    },
    [templates]
  );

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    createTemplate,
    createTemplateFromCharacter,
    updateTemplate,
    deleteTemplate,
  };
}
