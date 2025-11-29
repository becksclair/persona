import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { useConversations, type Conversation } from "@/lib/hooks/use-conversations";
import { eventBus, Events } from "@/lib/events";

// Preserve real fetch so we can restore it after tests
const realFetch = global.fetch;

type MockFn = ReturnType<typeof vi.fn>;

let mockFetch: MockFn;

beforeEach(() => {
  mockFetch = vi.fn();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
  vi.resetAllMocks();
});

interface TestComponentProps {
  onReady: (api: ReturnType<typeof useConversations>) => void;
}

function TestComponent({ onReady }: TestComponentProps) {
  const api = useConversations({ includeArchived: true });

  useEffect(() => {
    if (api.conversations.length > 0) {
      onReady(api);
    }
  }, [api, onReady]);

  return null;
}

describe("useConversations.updateConversation", () => {
  it("emits CONVERSATION_UPDATED with merged conversation data", async () => {
    const initialConv: Conversation = {
      id: "conv-1",
      title: "Original",
      characterId: "char-1",
      characterName: "Sam",
      characterAvatar: null,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: "Hi",
      lastMessageRole: "user",
      ragOverrides: null,
    };

    const updatedFromServer: Partial<Conversation> = {
      id: "conv-1",
      title: "Updated Title",
      ragOverrides: { enabled: true, mode: "light", tagFilters: ["project-x"] },
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [initialConv],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedFromServer,
      });

    let latestEvent: Conversation | null = null;
    const unsubscribe = eventBus.on<Conversation>(Events.CONVERSATION_UPDATED, (conv) => {
      latestEvent = conv;
    });

    let apiRef: ReturnType<typeof useConversations> | null = null;

    const handleReady = (api: ReturnType<typeof useConversations>) => {
      apiRef = api;
    };

    render(React.createElement(TestComponent, { onReady: handleReady }));

    await waitFor(() => {
      expect(apiRef?.conversations.length).toBe(1);
    });

    // Trigger an update with ragOverrides
    await act(async () => {
      await apiRef!.updateConversation(initialConv.id, {
        ragOverrides: { enabled: true, mode: "light", tagFilters: ["project-x"] },
      });
    });

    // Wait for event bus emission
    await waitFor(() => {
      expect(latestEvent).not.toBeNull();
    });

    expect(latestEvent!.id).toBe(initialConv.id);
    expect(latestEvent!.title).toBe(updatedFromServer.title);
    expect(latestEvent!.ragOverrides).toEqual({
      enabled: true,
      mode: "light",
      tagFilters: ["project-x"],
    });

    // Local hook state should reflect merged server response as well
    await waitFor(() => {
      const conv = apiRef!.conversations[0];
      expect(conv.title).toBe(updatedFromServer.title);
      expect(conv.ragOverrides).toEqual({
        enabled: true,
        mode: "light",
        tagFilters: ["project-x"],
      });
    });

    unsubscribe();
  });
});
