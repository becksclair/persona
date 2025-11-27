"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatState {
  // Active conversation
  activeConversationId: string | null;
  activeCharacterId: string | null;
  lastUsedCharacterId: string | null;

  // Pending new chat (not yet persisted)
  isPendingNewChat: boolean;

  // Actions
  setActiveConversation: (id: string | null, characterId?: string | null) => void;
  setActiveCharacter: (id: string) => void;
  startNewChat: (characterId?: string) => void;
  confirmNewChat: (conversationId: string) => void;
  cancelNewChat: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      activeConversationId: null,
      activeCharacterId: null,
      lastUsedCharacterId: null,
      isPendingNewChat: false,

      setActiveConversation: (id, characterId) =>
        set({
          activeConversationId: id,
          activeCharacterId: characterId ?? get().activeCharacterId,
          isPendingNewChat: false,
        }),

      setActiveCharacter: (id) =>
        set({
          activeCharacterId: id,
          lastUsedCharacterId: id,
        }),

      startNewChat: (characterId) =>
        set({
          activeConversationId: null,
          activeCharacterId: characterId ?? get().lastUsedCharacterId,
          isPendingNewChat: true,
        }),

      confirmNewChat: (conversationId) =>
        set({
          activeConversationId: conversationId,
          isPendingNewChat: false,
        }),

      cancelNewChat: () =>
        set({
          isPendingNewChat: false,
        }),
    }),
    {
      name: "persona-chat-state",
    }
  )
);
