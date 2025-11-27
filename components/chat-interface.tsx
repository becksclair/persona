"use client";

import { useAppStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Send, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useChatStore } from "@/lib/chat-store";
import { useCharacters } from "@/lib/hooks/use-characters";
import { eventBus, Events } from "@/lib/events";

export function ChatInterface() {
  const { modelSettings } = useAppStore();
  const { characters } = useCharacters();
  const { activeCharacterId, isPendingNewChat, confirmNewChat } = useChatStore();
  const hasSentFirstMessage = useRef(false);

  // Get active character
  const activeCharacter = useMemo(
    () => characters.find((c) => c.id === activeCharacterId) ?? characters[0],
    [characters, activeCharacterId]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const conversationIdRef = useRef<string | null>(null);

  // Memoize the transport - system prompt is now built server-side
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          characterId: activeCharacter?.id ?? "sam",
          modelSettings,
        },
      }),
    [activeCharacter?.id, modelSettings]
  );

  // Save message to database
  const saveMessage = useCallback(
    async (conversationId: string, role: string, content: string) => {
      try {
        await fetch(`/api/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, content }),
        });
      } catch (err) {
        console.error("Failed to save message:", err);
      }
    },
    []
  );

  // Create conversation when first message is sent
  const createConversation = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: activeCharacterId }),
      });
      if (res.ok) {
        const conv = await res.json();
        confirmNewChat(conv.id);
        // Broadcast to sidebar to update conversation list
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
  }, [activeCharacterId, confirmNewChat]);

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => {
      console.error("Chat error:", err);
    },
    onFinish: async ({ message }) => {
      // Get text content from the message
      const textContent = message.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || "";

      // Save assistant message
      if (conversationIdRef.current && textContent) {
        await saveMessage(conversationIdRef.current, "assistant", textContent);
      }
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      console.error("Chat hook error:", error);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Create conversation on first message
    if (isPendingNewChat && !hasSentFirstMessage.current) {
      hasSentFirstMessage.current = true;
      const convId = await createConversation();
      if (convId) {
        conversationIdRef.current = convId;
        // Save user message
        await saveMessage(convId, "user", userMessage);
      }
    } else if (conversationIdRef.current) {
      // Save user message to existing conversation
      await saveMessage(conversationIdRef.current, "user", userMessage);
    }

    void sendMessage({ text: userMessage });
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4 shadow-sm bg-background/80 backdrop-blur-md z-10">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarImage src={activeCharacter?.avatar ?? undefined} />
          <AvatarFallback>{activeCharacter?.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold flex items-center gap-2">
            {activeCharacter?.name}
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="text-xs text-muted-foreground">{activeCharacter?.description}</div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6 max-w-3xl mx-auto pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground opacity-50">
              <Avatar className="h-20 w-20 mb-4 grayscale">
                <AvatarImage src={activeCharacter?.avatar ?? undefined} />
                <AvatarFallback>{activeCharacter?.name[0]}</AvatarFallback>
              </Avatar>
              <p>Start a conversation with {activeCharacter?.name}</p>
            </div>
          )}

          {messages.map((m) => {
            // Get text content from parts
            const textContent = m.parts
              ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
              .map((p) => p.text)
              .join("") || "";

            return (
            <div
              key={m.id}
              data-testid={m.role === "user" ? "user-message" : "assistant-message"}
              className={cn(
                "flex w-full gap-3",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role !== "user" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={activeCharacter?.avatar ?? undefined} />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  "relative max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted/50 border rounded-bl-none",
                )}
              >
                {textContent || <span className="text-muted-foreground italic">Loading...</span>}
              </div>

              {m.role === "user" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src="/user-avatar.png" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
          })}

          {isLoading && (
            <div className="flex w-full gap-3 justify-start">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src={activeCharacter?.avatar ?? undefined} />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="bg-muted/50 border rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto relative">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
          >
            <Button
              size="icon"
              variant="ghost"
              type="button"
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${activeCharacter?.name}...`}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px]"
            />

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                type="button"
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  "h-10 w-10 transition-all",
                  input.trim()
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <div className="text-center mt-2 text-[10px] text-muted-foreground">
            AI can make mistakes. Please verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
