"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useAppStore } from "@/lib/store";
import { useChatStore } from "@/lib/chat-store";
import { useCharacters } from "@/lib/hooks/use-characters";
import { useSettings } from "@/lib/hooks/use-settings";
import { useCopy } from "@/lib/hooks/use-copy";
import { useChatExport } from "@/lib/hooks/use-chat-export";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useConversations } from "@/lib/hooks/use-conversations";
import { useKnowledgeBase } from "@/lib/hooks/use-knowledge-base";
import { eventBus, Events } from "@/lib/events";
import type { ConversationRagOverrides, RAGMode, ModelSettings } from "@/lib/types";
import { computeEffectiveRagConfig } from "@/lib/rag/effective-config";
import { SettingsDialog } from "@/components/settings-dialog";

import { ChatHeader } from "./chat-header";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";
import { ChatErrorBanner } from "./chat-error";
import { getMessageText, type ChatError } from "./types";

export function buildChatRequestBody(params: {
  characterId: string | null | undefined;
  conversationId: string | null | undefined;
  modelSettings: ModelSettings;
  enableRAG: boolean;
  ragMode: RAGMode;
  tagFilters?: string[] | undefined;
}) {
  return {
    characterId: params.characterId ?? "sam",
    conversationId: params.conversationId ?? undefined,
    modelSettings: params.modelSettings,
    enableRAG: params.enableRAG,
    ragMode: params.ragMode,
    tagFilters: params.tagFilters,
  };
}

export function ChatInterface() {
  const { modelSettings, ragSettings } = useAppStore();
  const { characters } = useCharacters();
  const { activeConversationId, activeCharacterId, isPendingNewChat, confirmNewChat } =
    useChatStore();
  const { settings } = useSettings();
  const { copiedId, copy } = useCopy({ successMessage: "Message copied to clipboard" });
  const { conversations, updateConversation } = useConversations({ includeArchived: true });
  const { files: kbFiles } = useKnowledgeBase(activeCharacterId);
  const hasSentFirstMessage = useRef(false);

  // Get active character
  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === activeCharacterId) ?? characters[0],
    [characters, activeCharacterId],
  );

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastError, setLastError] = useState<ChatError | null>(null);
  const lastUserMessageRef = useRef<string>("");
  const conversationId = activeConversationId;

  const conversationOverrides: ConversationRagOverrides | null =
    (activeConversation?.ragOverrides as ConversationRagOverrides | null) ?? null;

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    kbFiles.forEach((file) => {
      file.tags?.forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) tagSet.add(trimmed);
      });
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [kbFiles]);

  const { ragMode: effectiveRagMode, tagFilters: computedTagFilters } = useMemo(
    () =>
      computeEffectiveRagConfig({
        request: null,
        conversation: conversationOverrides,
        character: activeCharacter,
        global: {
          enabled: ragSettings.enabled,
          tagFilters: ragSettings.tagFilters,
        },
      }),
    [conversationOverrides, activeCharacter, ragSettings.enabled, ragSettings.tagFilters],
  );

  const effectiveRagEnabled = conversationOverrides?.enabled ?? ragSettings.enabled;
  const effectiveTagFilters = computedTagFilters ?? ragSettings.tagFilters;

  const handleUpdateOverrides = useCallback(
    (next: ConversationRagOverrides | null) => {
      if (!conversationId) return;
      void updateConversation(conversationId, { ragOverrides: next }).catch((err) => {
        console.error("Failed to update conversation overrides:", err);
      });
    },
    [conversationId, updateConversation],
  );

  // Memoize the transport
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: buildChatRequestBody({
          characterId: activeCharacter?.id,
          conversationId,
          modelSettings,
          enableRAG: effectiveRagEnabled,
          ragMode: effectiveRagMode,
          tagFilters: effectiveTagFilters,
        }),
      }),
    [
      activeCharacter?.id,
      conversationId,
      modelSettings,
      effectiveRagEnabled,
      effectiveRagMode,
      effectiveTagFilters,
    ],
  );

  // Save message to database
  const saveMessage = useCallback(async (conversationId: string, role: string, content: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  }, []);

  // Create conversation when first message is sent
  const createConversation = useCallback(async () => {
    try {
      const initialRagOverrides =
        ragSettings.tagFilters.length > 0
          ? { tagFilters: ragSettings.tagFilters }
          : undefined;

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: activeCharacterId,
          ragOverrides: initialRagOverrides,
        }),
      });
      if (res.ok) {
        const conv = await res.json();
        confirmNewChat(conv.id);
        eventBus.emit(Events.CONVERSATION_CREATED, {
          ...conv,
          lastMessage: null,
          lastMessageRole: null,
        });
        return conv.id;
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
    return null;
  }, [activeCharacterId, confirmNewChat, ragSettings.tagFilters]);

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => {
      console.error("Chat error:", err);
      setLastError({ message: err.message ?? "Something went wrong", retryable: true });
    },
    onFinish: async ({ message }) => {
      setLastError(null);
      const textContent = getMessageText(message);
      if (conversationId && textContent) {
        await saveMessage(conversationId, "assistant", textContent);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (error) {
      console.error("Chat hook error:", error);
    }
  }, [error]);

  // Export hook
  const { exportAsJSON, exportAsMarkdown, canExport } = useChatExport({
    conversationId,
    title: null,
    character: { id: activeCharacter?.id ?? null, name: activeCharacter?.name ?? "Assistant" },
    model: { id: modelSettings.model, provider: modelSettings.provider },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: getMessageText(m),
    })),
  });

  // Copy last assistant message
  const copyLastAssistantMessage = useCallback(async () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) {
      await copy(lastAssistant.id, getMessageText(lastAssistant));
    }
  }, [messages, copy]);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "C",
      ctrl: true,
      shift: true,
      handler: () => void copyLastAssistantMessage(),
      description: "Copy last assistant message",
    },
  ]);

  // Retry handler
  const handleRetry = useCallback(async () => {
    setLastError(null);
    if (lastUserMessageRef.current) {
      void sendMessage({ text: lastUserMessageRef.current });
    }
  }, [sendMessage]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    lastUserMessageRef.current = userMessage;
    setLastError(null);

    if (isPendingNewChat && !hasSentFirstMessage.current) {
      hasSentFirstMessage.current = true;
      const convId = await createConversation();
      if (convId) {
        await saveMessage(convId, "user", userMessage);
      }
    } else if (conversationId) {
      await saveMessage(conversationId, "user", userMessage);
    }

    void sendMessage({ text: userMessage });
  }, [
    input,
    isLoading,
    isPendingNewChat,
    conversationId,
    createConversation,
    saveMessage,
    sendMessage,
  ]);

  // Copy message handler
  const handleCopyMessage = useCallback(
    (id: string, text: string) => {
      void copy(id, text);
    },
    [copy],
  );

  return (
    <div className="flex flex-1 flex-col h-full bg-background relative">
      <ChatHeader
        character={activeCharacter}
        isLoading={isLoading}
        canExport={canExport}
        hasActiveConversation={!!conversationId}
        overrides={conversationOverrides}
        effectiveRagEnabled={effectiveRagEnabled}
        effectiveRagMode={effectiveRagMode}
        tagFilters={effectiveTagFilters}
        availableTags={availableTags}
        onUpdateOverrides={handleUpdateOverrides}
        onExportJSON={exportAsJSON}
        onExportMarkdown={exportAsMarkdown}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <ChatMessages
        messages={messages}
        character={activeCharacter}
        isLoading={isLoading}
        copiedMessageId={copiedId}
        onCopyMessage={handleCopyMessage}
      />

      {lastError && (
        <div className="px-4 max-w-3xl mx-auto w-full">
          <ChatErrorBanner error={lastError} onRetry={() => void handleRetry()} />
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => void handleSubmit()}
        onBlur={() => {}}
        disabled={isLoading}
        placeholder={`Message ${activeCharacter?.name ?? "the assistant"}...`}
        enterSendsMessage={settings.enterSendsMessage}
      />
    </div>
  );
}
